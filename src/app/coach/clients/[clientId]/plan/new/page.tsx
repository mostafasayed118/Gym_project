import { requireCoachAccess } from "@/lib/auth-server";
import { auth } from "@clerk/nextjs/server";
import { PlanBuilderForm } from "@/features/plan-builder/plan-builder-form";

interface PageProps {
  params: Promise<{ clientId: string }>;
}

export default async function NewClientPlanPage({ params }: PageProps) {
  await auth.protect();
  await requireCoachAccess();
  const { clientId } = await params;

  return <PlanBuilderForm preselectedClientId={clientId} />;
}
