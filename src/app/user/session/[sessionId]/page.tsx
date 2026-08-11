import { requireAuth } from "@/lib/auth-server";
import { SessionTracker } from "@/components/user/session/session-tracker";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  await requireAuth();

  const { sessionId } = await params;

  return <SessionTracker sessionId={sessionId as never} />;
}
