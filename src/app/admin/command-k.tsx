"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Users,
  FileText,
  Calendar,
  ArrowRight,
  Settings,
  BarChart3,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

export function CommandK() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const results = useQuery(
    api.auth.searchAll,
    search.length >= 2 ? { query: search } : "skip",
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (type: string, id: string) => {
      setOpen(false);
      setSearch("");
      // Closes BUG-025: previously routed to /admin/users/[id], /admin/plans/[id],
      // /admin/sessions/[id] — none of those routes exist. Route to the closest
      // existing pages with a `focus` query param so the destination can scroll/
      // highlight the target row once those affordances are added.
      switch (type) {
        case "user":
          router.push(`/admin/users?focus=${encodeURIComponent(id)}`);
          break;
        case "plan":
        case "session":
          router.push(`/admin/dashboard?focus=${encodeURIComponent(id)}&kind=${type}`);
          break;
        case "nav-admin":
        case "nav-users":
          router.push("/admin/users");
          break;
        case "nav-coaches":
          router.push("/admin/dashboard");
          break;
        case "nav-settings":
          // /admin/settings does not exist yet — keep the user on the dashboard.
          router.push("/admin/dashboard");
          break;
      }
    },
    [router],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search users, plans, sessions..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {search.length < 2
            ? "Type to search across the platform..."
            : "No results found."}
        </CommandEmpty>

        {/* Quick actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => handleSelect("nav-admin", "")}
          >
            <BarChart3 className="size-4 text-muted-foreground" />
            <span>Admin Dashboard</span>
            <ArrowRight className="ml-auto size-3 text-muted-foreground" />
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect("nav-users", "")}
          >
            <Users className="size-4 text-muted-foreground" />
            <span>Manage Users</span>
            <ArrowRight className="ml-auto size-3 text-muted-foreground" />
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect("nav-settings", "")}
          >
            <Settings className="size-4 text-muted-foreground" />
            <span>System Settings</span>
            <ArrowRight className="ml-auto size-3 text-muted-foreground" />
          </CommandItem>
        </CommandGroup>

        {search.length >= 2 && results && (
          <>
            <CommandSeparator />

            {/* Users */}
            {results.users.length > 0 && (
              <CommandGroup heading="Users">
                {results.users.map((user) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => handleSelect("user", user.clerkId)}
                  >
                    <Users className="size-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{user.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.subtitle}
                      </span>
                    </div>
                    <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      {user.role}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Plans */}
            {results.plans.length > 0 && (
              <CommandGroup heading="Plans">
                {results.plans.map((plan) => (
                  <CommandItem
                    key={plan.id}
                    onSelect={() => handleSelect("plan", plan.id)}
                  >
                    <FileText className="size-4 text-muted-foreground" />
                    <span>{plan.title}</span>
                    <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      {plan.subtitle}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Sessions */}
            {results.sessions.length > 0 && (
              <CommandGroup heading="Sessions">
                {results.sessions.map((session) => (
                  <CommandItem
                    key={session.id}
                    onSelect={() => handleSelect("session", session.id)}
                  >
                    <Calendar className="size-4 text-muted-foreground" />
                    <span>{session.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {session.subtitle}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
