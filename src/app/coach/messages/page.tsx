import { requireRole } from "@/lib/auth-server";
import { MessagesPageClient } from "@/components/messaging/messages-page-client";

export default async function CoachMessagesPage() {
  await requireRole(["coach", "admin"]);
  return <MessagesPageClient />;
}
