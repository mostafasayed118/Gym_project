import { requireCoachAccess } from "@/lib/auth-server";
import { ClientProgressView } from "./client-progress-view";

interface PageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientProgressPage({ params }: PageProps) {
  await requireCoachAccess();
  const { clientId } = await params;

  return <ClientProgressView clientId={clientId as never} />;
}
