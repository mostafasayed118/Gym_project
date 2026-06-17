import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PlanBuilderForm } from "@/features/plan-builder/plan-builder-form";

export default async function NewPlanPage() {
  const session = await auth();

  if (!session.userId) {
    redirect("/sign-in");
  }

  const role = (session.sessionClaims?.metadata as Record<string, unknown> | undefined)
    ?.role as string | undefined;

  if (role !== "coach" && role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <PlanBuilderForm />
    </div>
  );
}
