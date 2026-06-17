import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export default async function DashboardPage() {
  const session = await auth();

  if (!session.userId) {
    redirect("/sign-in");
  }

  const role = (session.sessionClaims?.metadata as Record<string, unknown> | undefined)
    ?.role as string | undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm capitalize">{role ?? "user"}</span>
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
          <p className="text-muted-foreground mt-2">
            You are signed in as <span className="font-medium capitalize">{role ?? "user"}</span>.
          </p>
        </div>

        <nav className="flex gap-4">
          {role === "coach" || role === "admin" ? (
            <Link
              href="/coach"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              Coach Panel
            </Link>
          ) : null}
          <Link
            href="/"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            Home
          </Link>
        </nav>
      </main>
    </div>
  );
}
