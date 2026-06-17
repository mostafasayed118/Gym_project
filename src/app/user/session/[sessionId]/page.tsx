import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SessionTracker } from "@/components/user/session/session-tracker";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const session = await auth();

  if (!session.userId) {
    redirect("/sign-in");
  }

  const { sessionId } = await params;

  return <SessionTracker sessionId={sessionId as never} />;
}
