import { requireCoachAccess } from "@/lib/auth-server";
import { auth } from "@clerk/nextjs/server";
import { CoachDashboardClient } from "./client";

export default async function CoachDashboardPage() {
  await auth.protect();
  await requireCoachAccess();
  return <CoachDashboardClient />;
}
