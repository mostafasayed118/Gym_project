import { requireAuth } from "@/lib/auth-server";
import { auth } from "@clerk/nextjs/server";
import { MessagesPageClient } from "@/components/messaging/messages-page-client";

export default async function UserMessagesPage() {
  await auth.protect();
  await requireAuth();

  return <MessagesPageClient />;
}
