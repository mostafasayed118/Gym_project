import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SessionTracker } from "@/components/user/session/session-tracker";

export default async function NewSessionPage() {
  const session = await auth();

  if (!session.userId) {
    redirect("/sign-in");
  }

  return <SessionTracker sessionId={null} />;
}
