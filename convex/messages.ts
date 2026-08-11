import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireIdentity } from "./auth";
import { checkMutationRateLimit } from "./rateLimit";

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Strip control characters and bidi-override codepoints from user-supplied
 * text. Prevents URL-spoofing via right-to-left override (U+202E) and
 * zero-width characters. (Closes BUG-033.)
 */
function sanitizeMessageBody(body: string): string {
  // Removed ranges: C0 control (except \t\n\r), DEL, U+200B-200F, U+202A-202E
  // (bidi overrides), U+2066-2069 (bidi isolates), U+FEFF (BOM).
  let out = "";
  for (let i = 0; i < body.length; i++) {
    const c = body.charCodeAt(i);
    if (
      c <= 0x08 ||
      c === 0x0b ||
      c === 0x0c ||
      (c >= 0x0e && c <= 0x1f) ||
      c === 0x7f ||
      (c >= 0x200b && c <= 0x200f) ||
      (c >= 0x202a && c <= 0x202e) ||
      (c >= 0x2066 && c <= 0x2069) ||
      c === 0xfeff
    ) {
      continue;
    }
    out += body[i];
  }
  return out;
}


/**
 * Produce a canonical participant pair so `findOrCreateConversation` can
 * dedupe across orderings. (Closes BUG-016.)
 */
function canonicalParticipants(
  a: Id<"users">,
  b: Id<"users">,
): [Id<"users">, Id<"users">] {
  return a < b ? [a, b] : [b, a];
}

// ─── Queries ────────────────────────────────────────────────────────

/** Get all conversations for the authenticated user. */
export const getConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);

    // Identity binding — accept the arg for back-compat but enforce match.
    // (Closes BUG-010.)
    if (caller._id !== args.userId && caller.role !== "admin") {
      throw new Error("Forbidden: cannot read another user's conversations");
    }

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_lastMessageAt", (q) => q.gt("lastMessageAt", 0))
      .order("desc")
      .collect();

    const userConversations = conversations.filter((c) =>
      c.participantIds.includes(args.userId),
    );

    const participantIds = new Set<string>();
    for (const conv of userConversations) {
      for (const id of conv.participantIds) {
        if (id !== args.userId) {
          participantIds.add(id);
        }
      }
    }

    const participantArray = Array.from(participantIds);
    const participants = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      participantArray.map((id) => ctx.db.get(id as any)),
    );
    const participantMap = new Map(
      participantArray.map((id, i) => [id, participants[i]]),
    );

    const conversationIds = userConversations.map((c) => c._id);
    const allMessages = await Promise.all(
      conversationIds.map((convId) =>
        ctx.db
          .query("messages")
          .withIndex("by_conversationId", (q) => q.eq("conversationId", convId))
          .collect(),
      ),
    );

    const unreadCountMap = new Map<string, number>();
    conversationIds.forEach((convId, i) => {
      const convMessages = allMessages[i];
      if (!convMessages) return;
      const unreadCount = convMessages.filter(
        (m) => m.senderId !== args.userId && !m.readBy.includes(args.userId),
      ).length;
      unreadCountMap.set(convId, unreadCount);
    });

    const enriched = userConversations.map((conv) => {
      const otherParticipantId = conv.participantIds.find((id) => id !== args.userId);
      const participantData = otherParticipantId
        ? participantMap.get(otherParticipantId) ?? null
        : null;

      return {
        _id: conv._id,
        participant: participantData as { name: string; avatarUrl?: string } | null,
        lastMessageAt: conv.lastMessageAt,
        lastMessageBody: conv.lastMessageBody ?? null,
        lastMessageSenderId: conv.lastMessageSenderId ?? null,
        unreadCount: unreadCountMap.get(conv._id) ?? 0,
      };
    });

    enriched.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    return enriched;
  },
});

/** Get messages for a conversation — only if the caller is a participant. */
export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);

    // Identity binding — closes BUG-009. The `userId` arg must match the
    // authenticated caller (admin bypass for support tooling).
    if (caller._id !== args.userId && caller.role !== "admin") {
      throw new Error("Forbidden: cannot read another user's messages");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.participantIds.includes(caller._id)) {
      throw new Error("Forbidden: not a conversation participant");
    }

    const limit = args.limit ?? 50;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(limit);

    const senderIds = new Set(messages.map((m) => m.senderId));
    const senderArray = Array.from(senderIds);

    const senders = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      senderArray.map((id) => ctx.db.get(id as any)),
    );
    const senderMap = new Map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      senderArray.map((id, i) => [id, senders[i] as any]),
    );

    const enriched = messages.map((msg) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sender = senderMap.get(msg.senderId) as any;
      return {
        ...msg,
        senderName: sender?.name ?? "Unknown",
        senderAvatarUrl: sender?.avatarUrl ?? null,
        isOwn: msg.senderId === args.userId,
        readByCount: msg.readBy.length,
      };
    });

    return enriched.reverse();
  },
});

/** Get typing indicators for a conversation. */
export const getTypingIndicators = query({
  args: {
    conversationId: v.id("conversations"),
    currentUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);

    if (caller._id !== args.currentUserId && caller.role !== "admin") {
      throw new Error("Forbidden: cannot read another user's typing state");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];
    if (!conversation.participantIds.includes(caller._id)) {
      throw new Error("Forbidden: not a conversation participant");
    }

    const now = Date.now();
    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const activeIndicators = indicators.filter(
      (i) => i.userId !== args.currentUserId && i.expiresAt > now,
    );

    const typingUserIds = activeIndicators.map((i) => i.userId);
    const typingUsers = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typingUserIds.map((id) => ctx.db.get(id as any)),
    );

    return activeIndicators.map((indicator, i) => ({
      userId: indicator.userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: (typingUsers[i] as any)?.name ?? "Someone",
    }));
  },
});

// ─── Mutations ──────────────────────────────────────────────────────

/**
 * Find or create a conversation between two users.
 *
 * Closes BUG-016: participantIds are canonicalised (sorted) before lookup
 * and insert, so concurrent calls with reversed order will both hit the
 * same row.
 */
export const findOrCreateConversation = mutation({
  args: {
    userId1: v.id("users"),
    userId2: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);

    // Caller must be one of the participants.
    if (caller._id !== args.userId1 && caller._id !== args.userId2 && caller.role !== "admin") {
      throw new Error("Forbidden: cannot create a conversation you are not part of");
    }

    if (args.userId1 === args.userId2) {
      throw new Error("Cannot create a conversation with yourself");
    }

    const [a, b] = canonicalParticipants(args.userId1, args.userId2);

    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_participant", (q) => q.eq("participantIds", [a, b]))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("conversations", {
      participantIds: [a, b],
      lastMessageAt: Date.now(),
    });
  },
});

/** Send a message. */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);

    // Identity binding — closes BUG-004 (forgery) and BUG-011 (rate-limit
    // bypass via spoofed senderId). Caller must equal supplied senderId.
    if (caller._id !== args.senderId) {
      throw new Error("Forbidden: cannot send messages as another user");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.participantIds.includes(caller._id)) {
      throw new Error("Forbidden: not a conversation participant");
    }

    // Rate limit is now keyed by the authenticated caller — cannot be drained
    // by an attacker spoofing the victim's userId.
    await checkMutationRateLimit(ctx, "messages:send", caller._id);

    const sanitized = sanitizeMessageBody(args.body).trim();

    if (sanitized.length === 0) throw new Error("Message body cannot be empty");
    if (sanitized.length > 2000) {
      throw new Error("Message body too long (max 2000 characters)");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: caller._id,
      body: sanitized,
      readBy: [caller._id],
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
      lastMessageBody: sanitized,
      lastMessageSenderId: caller._id,
    });

    return messageId;
  },
});

/** Mark messages as read. */
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);

    if (caller._id !== args.userId) {
      throw new Error("Forbidden: cannot mark messages read on another user's behalf");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.participantIds.includes(caller._id)) {
      throw new Error("Forbidden: not a conversation participant");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const unread = messages.filter(
      (m) => m.senderId !== caller._id && !m.readBy.includes(caller._id),
    );

    await Promise.all(
      unread.map((msg) =>
        ctx.db.patch(msg._id, {
          readBy: [...msg.readBy, caller._id],
        }),
      ),
    );

    return unread.length;
  },
});

/** Set typing indicator. */
export const setTypingIndicator = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await requireIdentity(ctx);

    if (caller._id !== args.userId) {
      throw new Error("Forbidden: cannot set typing state on another user's behalf");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.participantIds.includes(caller._id)) {
      throw new Error("Forbidden: not a conversation participant");
    }

    const now = Date.now();
    const expiresAt = now + 3000;

    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", caller._id),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { expiresAt });
    } else {
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId: caller._id,
        expiresAt,
      });
    }
  },
});
