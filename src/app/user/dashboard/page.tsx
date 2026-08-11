import { requireAuth } from "@/lib/auth-server";
import { UserDashboardClient } from "@/components/user/user-dashboard-client";

export default async function UserDashboardPage() {
  await requireAuth();

  return <UserDashboardClient />;
}
