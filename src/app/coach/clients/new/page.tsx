import { requireRole } from "@/lib/auth-server";
import { AssignClientForm } from "./client-form";

export default async function NewClientPage() {
  await requireRole(["coach", "admin"]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <AssignClientForm />
    </div>
  );
}
