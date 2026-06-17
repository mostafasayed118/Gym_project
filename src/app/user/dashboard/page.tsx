import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserDashboardClient } from "@/components/user/user-dashboard-client";

export default async function UserDashboardPage() {
  const session = await auth();

  if (!session.userId) {
    redirect("/sign-in");
  }

  return <UserDashboardClient />;
}
