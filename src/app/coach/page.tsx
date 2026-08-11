import { requireCoachAccess } from "@/lib/auth-server";
import { auth } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";

export default async function CoachPage() {
  await auth.protect();
  const { role } = await requireCoachAccess();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Coach Panel</h1>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm capitalize">{role}</span>
          <SignOutButton>
            <button className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Coach Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Manage your clients, create plans, and track progress.
          </p>
        </div>
      </main>
    </div>
  );
}
