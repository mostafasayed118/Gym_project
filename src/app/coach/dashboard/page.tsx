import { requireRole } from "@/lib/auth-server";
import { CoachDashboardClient } from "./client";

export default async function CoachDashboardPage() {
  await requireRole(["coach", "admin"]);
  return <CoachDashboardClient />;
}
