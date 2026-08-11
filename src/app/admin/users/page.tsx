import { UsersDataTable } from "@/components/admin/users/users-data-table";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
  title: "Users Directory — GymPro Admin",
  description: "Manage users, roles, and coach assignments.",
};

export default async function AdminUsersPage() {
  await auth.protect();
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users Directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage users, roles, status, and coach assignments.
        </p>
      </div>

      <UsersDataTable />
    </div>
  );
}
