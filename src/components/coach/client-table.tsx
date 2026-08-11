"use client";

import Link from "next/link";
import {
  MessageSquare,
  Pencil,
  BarChart3,
  MoreHorizontal,
  Eye,
  Dumbbell,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ClientRow {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  activePlan: { title: string } | null;
  lastWorkoutDate: string | null;
  status: "active" | "plan_pending" | "stale";
  weeklySessions: number;
  completedThisWeek: number;
  engagementRate: number;
}

interface ClientTableProps {
  clients: ClientRow[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getDaysSince(dateString: string | null): string {
  if (!dateString) return "Never";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

const statusConfig = {
  active: {
    label: "Active",
    className:
      "bg-[#abd600]/15 text-[#abd600] border-[#abd600]/20",
  },
  plan_pending: {
    label: "Plan Pending",
    className:
      "bg-[#ffb300]/10 text-[#ffb300] border-[#ffb300]/20",
  },
  stale: {
    label: "Stale",
    className:
      "bg-[#ff6b6b]/10 text-[#ff6b6b] border-[#ff6b6b]/20",
  },
} as const;

function EngagementBar({ rate }: { rate: number }) {
  const percentage = Math.round(rate * 100);

  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#333627]">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            percentage >= 75
              ? "bg-[#abd600]"
              : percentage >= 40
                ? "bg-[#ffb300]"
                : "bg-[#ff6b6b]",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-[#c4c9ac]">
        {percentage}%
      </span>
    </div>
  );
}

function HoverActions({ clientId }: { clientId: string }) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/row:opacity-100">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Message client"
        className="text-muted-foreground hover:text-foreground"
        nativeButton={false}
        render={<Link href={`/coach/clients/${clientId}/progress`} />}
      >
        <MessageSquare className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Edit plan"
        className="text-muted-foreground hover:text-foreground"
        nativeButton={false}
        render={<Link href={`/coach/clients/${clientId}/plan/new`} />}
      >
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="View progress"
        className="text-muted-foreground hover:text-foreground"
        nativeButton={false}
        render={<Link href={`/coach/clients/${clientId}/progress`} />}
      >
        <BarChart3 className="size-3.5" />
      </Button>
    </div>
  );
}

export function ClientTable({ clients }: ClientTableProps) {
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="border-[rgba(68,73,51,0.1)] hover:bg-transparent">
            <TableHead className="font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
              Client
            </TableHead>
            <TableHead className="font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
              Status
            </TableHead>
            <TableHead className="font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
              Active Plan
            </TableHead>
            <TableHead className="font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
              Last Workout
            </TableHead>
            <TableHead className="font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
              Engagement
            </TableHead>
            <TableHead className="text-right font-label-caps text-[12px] text-[#c4c9ac] uppercase tracking-widest">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const status = statusConfig[client.status];
            return (
              <TableRow
                key={client._id}
                className="group/row border-[rgba(68,73,51,0.1)] transition-colors duration-150 hover:bg-[#1e2113]/20"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarImage src={client.avatarUrl} alt={client.name} />
                      <AvatarFallback>
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#e2e4cf]">{client.name}</p>
                      <p className="truncate text-xs text-[#c4c9ac]">
                        {client.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border px-2 py-0.5 text-xs font-medium",
                      status.className,
                    )}
                  >
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {client.activePlan ? (
                    <Badge variant="secondary" className="bg-[#333627]/60 text-[#e2e4cf] text-xs">
                      {client.activePlan.title}
                    </Badge>
                  ) : (
                    <span className="text-sm text-[#c4c9ac]">
                      No plan
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-[#e2e4cf]">
                      {client.lastWorkoutDate
                        ? formatDate(client.lastWorkoutDate)
                        : "\u2014"}
                    </span>
                    <span className="text-xs text-[#c4c9ac]">
                      {getDaysSince(client.lastWorkoutDate)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <EngagementBar rate={client.engagementRate} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <HoverActions clientId={client._id} />
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="More actions"
                            className="text-muted-foreground"
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={
                            <Link
                              href={`/coach/clients/${client._id}/progress`}
                            />
                          }
                        >
                          <Eye className="size-4" />
                          View Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          render={
                            <Link
                              href={`/coach/clients/${client._id}/plan/new`}
                            />
                          }
                        >
                          <Dumbbell className="size-4" />
                          Create Plan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
