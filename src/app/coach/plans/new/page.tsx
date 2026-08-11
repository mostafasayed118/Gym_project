import { requireRole } from "@/lib/auth-server";
import { PlanBuilderForm } from "@/features/plan-builder/plan-builder-form";

export default async function NewPlanPage() {
  await requireRole(["coach", "admin"]);

  return <PlanBuilderForm />;
}
