import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
const convex = new ConvexHttpClient(convexUrl);

export async function POST(request: NextRequest) {
  try {
    // Verify the caller is authenticated
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get the user's Convex ID from their Clerk ID
    const convexUser = await convex.query(api.auth.getUserByClerkId, {
      clerkId: session.userId,
    });

    if (!convexUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as {
      endpoint?: string;
      p256dh?: string;
      auth?: string;
    };
    const { endpoint, p256dh, auth: pushAuth } = body;

    if (!endpoint || !p256dh || !pushAuth) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Use the authenticated user's Convex ID, not a client-provided one
    await convex.mutation(api.push.saveSubscription, {
      userId: convexUser._id,
      endpoint,
      p256dh,
      auth: pushAuth,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
