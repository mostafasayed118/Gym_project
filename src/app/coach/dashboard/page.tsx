import { requireCoachAccess } from "@/lib/auth-server";
import { CoachDashboardClient } from "./client";

export default async function CoachDashboardPage() {
  await requireCoachAccess();
  return <CoachDashboardClient />;
}
