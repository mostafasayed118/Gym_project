import { requireCoachAccess } from "@/lib/auth-server";
import { auth } from "@clerk/nextjs/server";
import { AssignClientForm } from "./client-form";

export default async function NewClientPage() {
  await auth.protect();
  await requireCoachAccess();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <AssignClientForm />
    </div>
  );
}
