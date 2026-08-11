"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import {
  X,
  ShieldCheck,
  Dumbbell,
  Users,
  Flame,
  Target,
  CalendarCheck,
  Loader2,
  UserMinus,
  UserCheck,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { RoleChangeDialog } from "./role-change-dialog";
import { SuspendUserDialog } from "./suspend-user-dialog";
import { ReinstateUserDialog } from "./reinstate-user-dialog";

// ─── Types ──────────────────────────────────────────────────────────

export interface UserManagementData {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  coachId: string | null;
  coachName: string | null;
  createdAt: number;
  updatedAt: number;
  totalSessions: number;
  completedSessions: number;
  totalPlans: number;
  activePlans: number;
}

interface UserManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserManagementData;
  onUserUpdated?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "border-[#ffb300]/30 bg-[#ffb300]/10 text-[#ffb300]",
  coach: "border-[#abd600]/20 bg-[#c3f400]/10 text-[#abd600]",
  user: "border-[#444933]/30 bg-[#333627]/20 text-[#c4c9ac]",
};

// ─── Component ──────────────────────────────────────────────────────

export function UserManagementSheet({
  open,
  onOpenChange,
  user,
  onUserUpdated,
}: UserManagementSheetProps) {
  // Local state for role (for optimistic UI)
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [selectedCoachId, setSelectedCoachId] = useState<string>(
    user.coachId ?? "none"
  );
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
  const [assigningCoach, setAssigningCoach] = useState(false);

  // Fetch coaches list
  const coaches = useQuery(api.auth.listAllUsers, { role: "coach" });

  // Fetch user stats (streak)
  const userStats = useQuery(api.gamification.getUserStats, {
    userId: user._id as never,
  });

  // Coach assignment mutation
  const assignCoach = useMutation(api.users.assignCoachToUser);

  // Sync local state when the `user` prop changes — adjusted during render
  // (React's "storing information from previous renders" pattern) instead of in
  // an effect, which react-hooks/set-state-in-effect flags.
  const [prevUserKey, setPrevUserKey] = useState<{
    role: string;
    coachId: string | null;
  }>({ role: user.role, coachId: user.coachId });

  if (
    prevUserKey.role !== user.role ||
    prevUserKey.coachId !== user.coachId
  ) {
    setPrevUserKey({ role: user.role, coachId: user.coachId });
    setSelectedRole(user.role);
    setSelectedCoachId(user.coachId ?? "none");
  }

  // ─── Coach Assignment ───────────────────────────────────────────
  const handleCoachAssign = async () => {
    if (selectedCoachId === user.coachId) return;

    setAssigningCoach(true);
    try {
      if (selectedCoachId === "none") {
        // TODO: Need an unassignCoach mutation
        toast.info("Coach unassignment coming soon");
        setSelectedCoachId(user.coachId ?? "none");
      } else {
        await assignCoach({
          targetUserId: user._id as never,
          coachId: selectedCoachId as never,
        });
        toast.success("Coach assigned", {
          description: `${user.name} is now assigned to a coach.`,
        });
        onUserUpdated?.();
      }
    } catch (error) {
      toast.error("Failed to assign coach", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
      // Revert
      setSelectedCoachId(user.coachId ?? "none");
    } finally {
      setAssigningCoach(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} side="right">
        <SheetContent
          side="right"
          className="w-full max-w-md border-l border-[#444933]/80 bg-[#1e2113] p-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#444933]/20 px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar size="default">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback>
                  {user.role === "admin" ? (
                    <ShieldCheck className="size-4 text-[#ffb300]" />
                  ) : user.role === "coach" ? (
                    <Dumbbell className="size-4 text-[#abd600]" />
                  ) : (
                    <Users className="size-4 text-[#c4c9ac]" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-[#e2e4cf]">
                  {user.name}
                </h2>
                <p className="truncate text-xs text-[#c4c9ac]">{user.email}</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "ml-2 shrink-0 border px-2 py-0.5 text-xs font-medium capitalize",
                  ROLE_BADGE_STYLES[user.role] ?? ROLE_BADGE_STYLES.user
                )}
              >
                {user.role}
              </Badge>
            </div>
            <SheetClose className="rounded-lg p-1.5 text-[#c4c9ac] hover:bg-[#333627]/50 hover:text-[#e2e4cf]">
              <X className="size-4" />
            </SheetClose>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* ─── Stats Section ─────────────────────────────────── */}
            <SectionHeader>Overview</SectionHeader>
            <div className="mb-6 grid grid-cols-3 gap-3">
              <StatCard
                icon={<CalendarCheck className="size-4 text-[#abd600]" />}
                label="Sessions"
                value={user.totalSessions.toString()}
                subtitle={`${user.completedSessions} completed`}
                loading={!userStats}
              />
              <StatCard
                icon={<Target className="size-4 text-[#00dce5]" />}
                label="Active Plans"
                value={user.activePlans.toString()}
                subtitle={`${user.totalPlans} total`}
                loading={!userStats}
              />
              <StatCard
                icon={<Flame className="size-4 text-[#ffb300]" />}
                label="Streak"
                value={
                  userStats
                    ? `${userStats.currentStreak}`
                    : "—"
                }
                subtitle={
                  userStats
                    ? `${userStats.maxStreak} max`
                    : "no data"
                }
                loading={!userStats}
              />
            </div>

            {/* ─── Role Management Section ───────────────────────── */}
            <SectionHeader>Role Management</SectionHeader>
            <div className="mb-6 rounded-xl border border-[#444933]/10 bg-[#09090b]/50 p-4">
              <label className="mb-2 block font-label-caps text-[10px] uppercase tracking-widest text-[#c4c9ac]">
                User Role
              </label>
              <div className="flex items-center gap-3">
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value ?? "user")}
                >
                  <SelectTrigger className="h-10 w-full bg-[#09090b] border-[#444933]/40 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setRoleDialogOpen(true)}
                  disabled={selectedRole === user.role}
                  className="shrink-0"
                >
                  <Save className="size-3.5" />
                  Save Role
                </Button>
              </div>
              {selectedRole !== user.role && (
                <p className="mt-2 text-xs text-[#c4c9ac]/60">
                  Changes will take effect immediately upon confirmation.
                </p>
              )}
            </div>

            {/* ─── Coach Assignment Section (only for users) ──────── */}
            {selectedRole === "user" && (
              <>
                <SectionHeader>Coach Assignment</SectionHeader>
                <div className="mb-6 rounded-xl border border-[#444933]/10 bg-[#09090b]/50 p-4">
                  <label className="mb-2 block font-label-caps text-[10px] uppercase tracking-widest text-[#c4c9ac]">
                    Assigned Coach
                  </label>
                  <div className="flex items-center gap-3">
                    <Select
                      value={selectedCoachId}
                      onValueChange={(value) =>
                        setSelectedCoachId(value ?? "none")
                      }
                    >
                      <SelectTrigger className="h-10 w-full bg-[#09090b] border-[#444933]/40 text-sm">
                        <SelectValue placeholder="Select a coach" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {coaches?.map((coach) => (
                          <SelectItem key={coach._id} value={coach._id}>
                            {coach.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleCoachAssign}
                      disabled={
                        selectedCoachId === user.coachId || assigningCoach
                      }
                      className="shrink-0"
                    >
                      {assigningCoach ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="size-3.5" />
                          Assign
                        </>
                      )}
                    </Button>
                  </div>
                  {user.coachName && selectedCoachId === user.coachId && (
                    <p className="mt-2 text-xs text-[#c4c9ac]/60">
                      Currently assigned to{" "}
                      <span className="text-[#e2e4cf]">{user.coachName}</span>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ─── Danger Zone ───────────────────────────────────── */}
            <SectionHeader>Danger Zone</SectionHeader>
            <div className="rounded-xl border border-[#ffb4ab]/20 bg-[#ffb4ab]/5 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[#e2e4cf]">
                    {user.status === "suspended"
                      ? "User is Suspended"
                      : "Suspend User"}
                  </p>
                  <p className="mt-1 text-xs text-[#c4c9ac]/60">
                    {user.status === "suspended"
                      ? "This user is currently suspended and cannot access the platform."
                      : "This will immediately ban the user from the platform and revoke all access."}
                  </p>
                </div>
                {user.status === "suspended" ? (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => setReinstateDialogOpen(true)}
                    className="shrink-0"
                  >
                    <UserCheck className="size-3.5" />
                    Reinstate
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setSuspendDialogOpen(true)}
                    className="shrink-0 bg-[#ffb4ab]/15 text-[#ffb4ab] hover:bg-[#ffb4ab]/25"
                  >
                    <UserMinus className="size-3.5" />
                    Suspend
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Dialogs ─────────────────────────────────────────────── */}
      <RoleChangeDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        userId={user._id}
        userName={user.name}
        oldRole={user.role}
        newRole={selectedRole}
        onSuccess={() => {
          onUserUpdated?.();
          onOpenChange(false);
        }}
      />

      <SuspendUserDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        userId={user._id}
        userName={user.name}
        userEmail={user.email}
        onSuccess={() => {
          onUserUpdated?.();
          onOpenChange(false);
        }}
      />

      <ReinstateUserDialog
        open={reinstateDialogOpen}
        onOpenChange={setReinstateDialogOpen}
        userId={user._id}
        userName={user.name}
        onSuccess={() => {
          onUserUpdated?.();
          onOpenChange(false);
        }}
      />
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 font-label-caps text-[10px] uppercase tracking-widest text-[#c4c9ac]">
      {children}
    </h3>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[#444933]/10 bg-[#09090b]/50 p-3">
        <Skeleton className="mb-2 h-3 w-12 rounded bg-[#282b1d] skeleton-shimmer" />
        <Skeleton className="mb-1 h-6 w-8 rounded bg-[#282b1d] skeleton-shimmer" />
        <Skeleton className="h-2.5 w-14 rounded bg-[#1e2113] skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#444933]/10 bg-[#09090b]/50 p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        {icon}
        <span className="font-label-caps text-[9px] uppercase tracking-widest text-[#c4c9ac]">
          {label}
        </span>
      </div>
      <p className="font-metric-lg text-xl font-bold tabular-nums text-[#e2e4cf]">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-[#c4c9ac]/60">{subtitle}</p>
    </div>
  );
}
