import { requireAuth } from "@/lib/auth-server";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export default async function DashboardPage() {
  await auth.protect();
  await requireAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <SignOutButton>
            <button className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Welcome to your dashboard</h2>
        </div>

        <nav className="flex gap-4">
          <Link
            href="/coach/dashboard"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            Coach Panel
          </Link>
          <Link
            href="/user/dashboard"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            My Workouts
          </Link>
        </nav>
      </main>
    </div>
  );
}
