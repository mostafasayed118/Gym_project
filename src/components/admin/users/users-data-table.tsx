"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Search,
  MoreHorizontal,
  ShieldCheck,
  Dumbbell,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { UserTableSkeleton } from "./user-table-skeleton";
import {
  UserManagementSheet,
  type UserManagementData,
} from "./user-management-sheet";

// ─── Constants ──────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "border-[#ffb300]/30 bg-[#ffb300]/10 text-[#ffb300]",
  coach: "border-[#abd600]/20 bg-[#c3f400]/10 text-[#abd600]",
  user: "border-[#444933]/30 bg-[#333627]/20 text-[#c4c9ac]",
};

const STATUS_PILL_STYLES: Record<string, string> = {
  active: "border-[#abd600]/20 bg-[#abd600]/10 text-[#abd600]",
  suspended: "border-[#ff6b6b]/20 bg-[#ff6b6b]/10 text-[#ff6b6b]",
};

// ─── Component ──────────────────────────────────────────────────────

export function UsersDataTable() {
  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] =
    useState<UserManagementData | null>(null);

  // Convex queries
  const users = useQuery(api.auth.listAllUsers, {
    role: roleFilter === "all" ? undefined : roleFilter,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Reset page on filter change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };
  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setPage(0);
  };
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(0);
  };

  // Pagination
  const totalPages = users ? Math.ceil(users.length / PAGE_SIZE) : 0;
  const paginatedUsers = useMemo(() => {
    if (!users) return [];
    return users
      .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
      .map((user) => ({
        ...user,
        avatarUrl: user.avatarUrl ?? null,
        coachId: user.coachId ?? null,
      }));
  }, [users, page]);

  // Open sheet for a user
  const openSheet = useCallback((user: UserManagementData) => {
    setSelectedUser(user);
    setSheetOpen(true);
  }, []);

  // Called after a mutation succeeds — optimistic update via Convex reactivity
  const handleUserUpdated = useCallback(() => {
    // Convex queries auto-refetch, so just close the sheet
    setSheetOpen(false);
    setSelectedUser(null);
  }, []);

  // ─── Loading state ──────────────────────────────────────────────
  if (!users) {
    return (
      <div className="rounded-xl border border-[#444933]/10 bg-[#0c0f04]/50 backdrop-blur-2xl">
        {/* Toolbar skeleton */}
        <div className="flex flex-col gap-3 border-b border-[#444933]/10 p-4 sm:flex-row sm:items-center">
          <Skeleton className="h-10 w-64 rounded-lg bg-[#282b1d] skeleton-shimmer" />
          <Skeleton className="h-10 w-28 rounded-lg bg-[#282b1d] skeleton-shimmer" />
          <Skeleton className="h-10 w-28 rounded-lg bg-[#282b1d] skeleton-shimmer" />
        </div>
        <UserTableSkeleton rows={8} />
      </div>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────
  const isFiltered =
    search !== "" || roleFilter !== "all" || statusFilter !== "all";

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-[#444933]/10 bg-[#0c0f04]/50 backdrop-blur-2xl">
        {/* Toolbar */}
        <Toolbar
          search={search}
          onSearchChange={handleSearchChange}
          roleFilter={roleFilter}
          onRoleChange={handleRoleFilterChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
        />

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#333627]/30">
            <Inbox className="size-7 text-[#c4c9ac]/40" />
          </div>
          <p className="text-sm font-medium text-[#e2e4cf]">No users found</p>
          <p className="mt-1 max-w-xs text-xs text-[#c4c9ac]/60">
            {isFiltered
              ? "Try adjusting your search or filters to find what you're looking for."
              : "There are no users in the system yet."}
          </p>
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-xs text-[#c4c9ac]"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Data table ─────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-[#444933]/10 bg-[#0c0f04]/50 backdrop-blur-2xl">
      {/* Toolbar */}
      <Toolbar
        search={search}
        onSearchChange={handleSearchChange}
        roleFilter={roleFilter}
        onRoleChange={handleRoleFilterChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        totalCount={users.length}
      />

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#444933]/10 hover:bg-transparent">
              <TableHead className="min-w-[220px] font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
                User
              </TableHead>
              <TableHead className="min-w-[80px] font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
                Role
              </TableHead>
              <TableHead className="min-w-[90px] font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
                Status
              </TableHead>
              <TableHead className="min-w-[120px] font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
                Coach
              </TableHead>
              <TableHead className="min-w-[80px] font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
                Joined
              </TableHead>
              <TableHead className="min-w-[40px] text-right font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow
                key={user._id}
                className="border-[#444933]/10 transition-colors hover:bg-[#1e2113]/20"
              >
                {/* User: Avatar + Name + Email */}
                <TableCell>
                  <div className="flex items-center gap-3">
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
                      <p className="truncate text-sm font-medium text-[#e2e4cf]">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-[#c4c9ac]">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Role badge */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border px-2 py-0.5 text-xs font-medium capitalize",
                      ROLE_BADGE_STYLES[user.role] ?? ROLE_BADGE_STYLES.user,
                    )}
                  >
                    {user.role}
                  </Badge>
                </TableCell>

                {/* Status pill */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border px-2 py-0.5 text-xs font-medium capitalize",
                      STATUS_PILL_STYLES[user.status] ??
                        STATUS_PILL_STYLES.active,
                    )}
                  >
                    {user.status}
                  </Badge>
                </TableCell>

                {/* Coach */}
                <TableCell>
                  {user.coachName ? (
                    <span className="text-sm text-[#e2e4cf]">
                      {user.coachName}
                    </span>
                  ) : (
                    <span className="text-xs text-[#c4c9ac]/50">
                      Unassigned
                    </span>
                  )}
                </TableCell>

                {/* Joined date */}
                <TableCell className="text-xs text-[#c4c9ac]">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openSheet(user)}
                    className="text-[#c4c9ac] hover:text-[#e2e4cf]"
                    aria-label={`Manage ${user.name}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#444933]/10 px-4 py-3">
          <p className="text-xs text-[#c4c9ac]/60">
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, users.length)} of {users.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-[#c4c9ac] hover:text-[#e2e4cf]"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "size-8 text-xs",
                    page === pageNum
                      ? "bg-[#333627] text-[#e2e4cf]"
                      : "text-[#c4c9ac] hover:text-[#e2e4cf]",
                  )}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-[#c4c9ac] hover:text-[#e2e4cf]"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── User Management Sheet ─────────────────────────────── */}
      {selectedUser && (
        <UserManagementSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          user={selectedUser}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
}

// ─── Toolbar ────────────────────────────────────────────────────────

function Toolbar({
  search,
  onSearchChange,
  roleFilter,
  onRoleChange,
  statusFilter,
  onStatusChange,
  totalCount,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  totalCount?: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#444933]/10 p-4 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#c4c9ac]/40" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-full pl-9 text-sm bg-[#1e2113]/60 border-[#444933]/20 md:max-w-xs"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {/* Role filter */}
        <Select
          value={roleFilter}
          onValueChange={(value) => onRoleChange(value ?? "all")}
        >
          <SelectTrigger size="sm" className="h-9 gap-1.5 px-3 text-xs">
            <Filter className="size-3 text-[#c4c9ac]/60" />
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="coach">Coach</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => onStatusChange(value ?? "all")}
        >
          <SelectTrigger size="sm" className="h-9 gap-1.5 px-3 text-xs">
            <ArrowUpDown className="size-3 text-[#c4c9ac]/60" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>

        {/* Count */}
        {totalCount !== undefined && (
          <span className="hidden text-xs tabular-nums text-[#c4c9ac]/50 sm:block">
            {totalCount} users
          </span>
        )}
      </div>
    </div>
  );
}
