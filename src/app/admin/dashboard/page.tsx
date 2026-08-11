"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Users,
  Dumbbell,
  Search,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MissionControl } from "@/components/admin/mission-control";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mission Control</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time platform observability and management
        </p>
      </div>

      <MissionControl />
      <UserManagementTable />
    </div>
  );
}

// --- User Management Table ---

function UserManagementTable() {
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const users = useQuery(api.auth.listAllUsers, {
    role: roleFilter || undefined,
    search: search || undefined,
  });

  const updateRole = useMutation(api.auth.updateRole);

  const handleRoleChange = async (clerkId: string, newRole: string) => {
    try {
      await updateRole({
        clerkId,
        role: newRole as "admin" | "coach" | "user",
      });
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  return (
    <Card className="bg-[#0c0f04]/50 backdrop-blur-2xl border border-[#444933]/10 rounded-xl">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
            User Management
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#c4c9ac]" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-48 pl-9 text-sm bg-[#1e2113] border-[#444933]/20"
              />
            </div>

            {/* Role filter */}
            <div className="flex gap-1">
              {["", "admin", "coach", "user"].map((role) => (
                <Button
                  key={role}
                  variant={roleFilter === role ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setRoleFilter(role)}
                  className={cn(
                    "h-8 text-xs",
                    roleFilter === role && "bg-[#333627] text-[#e2e4cf]",
                  )}
                >
                  {role || "All"}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!users ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border border-[rgba(68,73,51,0.1)] p-3">
                <Skeleton className="size-9 rounded-full bg-[#282b1d]" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded bg-[#282b1d]" />
                  <Skeleton className="h-3 w-48 rounded bg-[#1e2113]" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full bg-[#282b1d]" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[rgba(68,73,51,0.1)] hover:bg-transparent">
                  <TableHead className="font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
                    User
                  </TableHead>
                  <TableHead className="font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
                    Role
                  </TableHead>
                  <TableHead className="text-right font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
                    Sessions
                  </TableHead>
                  <TableHead className="text-right font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
                    Plans
                  </TableHead>
                  <TableHead className="text-right font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
                    Joined
                  </TableHead>
                  <TableHead className="text-right font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user._id}
                    className="border-[rgba(68,73,51,0.1)] transition-colors hover:bg-[#1e2113]/20"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#333627]">
                          {user.role === "admin" ? (
                            <ShieldCheck className="size-4 text-[#ffb300]" />
                          ) : user.role === "coach" ? (
                            <Dumbbell className="size-4 text-[#abd600]" />
                          ) : (
                            <Users className="size-4 text-[#c4c9ac]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#e2e4cf]">
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-[#c4c9ac]">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border px-2 py-0.5 text-xs font-medium",
                          user.role === "admin"
                            ? "border-[#ffb300]/30 bg-[#ffb300]/10 text-[#ffb300]"
                            : user.role === "coach"
                              ? "border-[#abd600]/20 bg-[#c3f400]/10 text-[#abd600]"
                              : "border-[#444933]/30 bg-[#333627]/20 text-[#c4c9ac]",
                        )}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      <span className="text-sm font-metric-lg text-[#e2e4cf]">
                        {user.completedSessions}/{user.totalSessions}
                      </span>
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      <span className="text-sm font-metric-lg text-[#e2e4cf]">
                        {user.activePlans}/{user.totalPlans}
                      </span>
                    </TableCell>

                    <TableCell className="text-right text-xs text-[#c4c9ac]">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {user.role !== "admin" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              handleRoleChange(user.clerkId, "admin")
                            }
                            aria-label="Promote to admin"
                            className="text-[#c4c9ac] hover:text-[#ffb300]"
                          >
                            <ShieldCheck className="size-3.5" />
                          </Button>
                        )}
                        {user.role !== "coach" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              handleRoleChange(user.clerkId, "coach")
                            }
                            aria-label="Promote to coach"
                            className="text-[#c4c9ac] hover:text-[#abd600]"
                          >
                            <Dumbbell className="size-3.5" />
                          </Button>
                        )}
                        {user.role !== "user" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              handleRoleChange(user.clerkId, "user")
                            }
                            aria-label="Revoke to user"
                            className="text-[#c4c9ac] hover:text-[#ff6b6b]"
                          >
                            <ShieldOff className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
