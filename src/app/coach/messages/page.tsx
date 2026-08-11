import { requireCoachAccess } from "@/lib/auth-server";
import { auth } from "@clerk/nextjs/server";
import { MessagesPageClient } from "@/components/messaging/messages-page-client";

export default async function CoachMessagesPage() {
  await auth.protect();
  await requireCoachAccess();
  return <MessagesPageClient />;
}
