import { requireCoachAccess } from "@/lib/auth-server";
import { PlanBuilderForm } from "@/features/plan-builder/plan-builder-form";

export default async function NewPlanPage() {
  await requireCoachAccess();

  return <PlanBuilderForm />;
}
