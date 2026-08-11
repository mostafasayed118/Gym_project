import { requireAuth } from "@/lib/auth-server";
import { auth } from "@clerk/nextjs/server";
import { SessionTracker } from "@/components/user/session/session-tracker";

export default async function NewSessionPage() {
  await auth.protect();
  await requireAuth();

  return <SessionTracker sessionId={null} />;
}
