import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MessagesPageClient } from "@/components/messaging/messages-page-client";

export default async function UserMessagesPage() {
  const session = await auth();

  if (!session.userId) {
    redirect("/sign-in");
  }

  return <MessagesPageClient />;
}
