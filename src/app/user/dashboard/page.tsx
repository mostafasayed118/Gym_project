import { requireAuth } from "@/lib/auth-server";
import { auth } from "@clerk/nextjs/server";
import { UserDashboardClient } from "@/components/user/user-dashboard-client";

export default async function UserDashboardPage() {
  await auth.protect();
  await requireAuth();

  return <UserDashboardClient />;
}
