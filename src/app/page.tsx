import { SignIn, SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">GymPro</h1>
        <p className="text-muted-foreground max-w-md text-lg">
          Professional gym management for coaches and clients. Track workouts, plans, and progress in
          real-time.
        </p>
      </div>

      {session.userId ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-sm">You are signed in.</p>
          <div className="flex gap-4">
            <a
              href="/dashboard"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              Dashboard
            </a>
            <SignOutButton>
              <button className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-4 py-2 text-sm font-medium transition-colors">
                Sign Out
              </button>
            </SignOutButton>
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          <SignIn />
          <SignUp />
        </div>
      )}
    </main>
  );
}
