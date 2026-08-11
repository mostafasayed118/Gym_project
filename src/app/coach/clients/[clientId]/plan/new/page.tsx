import { requireRole } from "@/lib/auth-server";
import { PlanBuilderForm } from "@/features/plan-builder/plan-builder-form";

interface PageProps {
  params: Promise<{ clientId: string }>;
}

export default async function NewClientPlanPage({ params }: PageProps) {
  await requireRole(["coach", "admin"]);
  const { clientId } = await params;

  return <PlanBuilderForm preselectedClientId={clientId} />;
}
