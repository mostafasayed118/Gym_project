import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CoachDashboardClient } from "./client";

export default async function CoachDashboardPage() {
  const session = await auth();

  if (!session.userId) {
    redirect("/sign-in");
  }

  const role = (session.sessionClaims?.metadata as Record<string, unknown> | undefined)
    ?.role as string | undefined;

  if (role !== "coach" && role !== "admin") {
    redirect("/unauthorized");
  }

  return <CoachDashboardClient />;
}
