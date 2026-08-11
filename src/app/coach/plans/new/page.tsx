import { requireCoachAccess } from "@/lib/auth-server";
import { auth } from "@clerk/nextjs/server";
import { PlanBuilderForm } from "@/features/plan-builder/plan-builder-form";

export default async function NewPlanPage() {
  await auth.protect();
  await requireCoachAccess();

  return <PlanBuilderForm />;
}
