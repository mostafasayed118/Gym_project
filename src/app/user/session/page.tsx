import { requireAuth } from "@/lib/auth-server";
import { SessionTracker } from "@/components/user/session/session-tracker";

export default async function NewSessionPage() {
  await requireAuth();

  return <SessionTracker sessionId={null} />;
}
