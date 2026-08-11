import { requireAuth } from "@/lib/auth-server";
import { MessagesPageClient } from "@/components/messaging/messages-page-client";

export default async function UserMessagesPage() {
  await requireAuth();

  return <MessagesPageClient />;
}
