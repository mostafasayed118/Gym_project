"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDialogShell } from "@/hooks/use-dialog-shell";

// ─── Types ──────────────────────────────────────────────────────────

interface RoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  oldRole: string;
  newRole: string;
  onSuccess?: () => void;
}

// ─── Role Badge Styles ──────────────────────────────────────────────

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "border-[#ffb300]/30 bg-[#ffb300]/10 text-[#ffb300]",
  coach: "border-[#abd600]/20 bg-[#c3f400]/10 text-[#abd600]",
  user: "border-[#444933]/30 bg-[#333627]/20 text-[#c4c9ac]",
};

// ─── Component ──────────────────────────────────────────────────────

export function RoleChangeDialog({
  open,
  onOpenChange,
  userId,
  userName,
  oldRole,
  newRole,
  onSuccess,
}: RoleChangeDialogProps) {
  const [loading, setLoading] = useState(false);
  const updateRole = useMutation(api.users.updateUserRole);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await updateRole({
        targetUserId: userId as never,
        newRole: newRole as "admin" | "coach" | "user",
      });
      toast.success(`Role updated`, {
        description: `${userName} is now a ${newRole}.`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to update role", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  const dialogRef = useDialogShell({
    open,
    onClose: useCallback(() => {
      if (!loading) onOpenChange(false);
    }, [loading, onOpenChange]),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !loading && onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="role-change-title"
          aria-describedby="role-change-desc"
          className={cn(
            "w-full max-w-md overflow-hidden rounded-xl outline-none",
            "bg-[rgba(9,9,11,0.8)] shadow-2xl backdrop-blur-2xl",
            "border border-[rgba(68,73,51,0.2)]"
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-4 p-6 pb-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ffb300]/10">
              <AlertTriangle className="size-5 text-[#ffb300]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="role-change-title"
                className="text-lg font-bold tracking-tight text-[#e2e4cf]"
              >
                Change User Role
              </h2>
              <p
                id="role-change-desc"
                className="mt-2 text-sm leading-relaxed text-[#c4c9ac]"
              >
                You are about to change{" "}
                <span className="font-medium text-[#e2e4cf]">{userName}</span>
                &apos;s role from{" "}
                <Badge
                  variant="outline"
                  className={cn(
                    "border px-1.5 py-0.5 text-xs font-medium capitalize",
                    ROLE_BADGE_STYLES[oldRole] ?? ROLE_BADGE_STYLES.user
                  )}
                >
                  {oldRole}
                </Badge>{" "}
                to{" "}
                <Badge
                  variant="outline"
                  className={cn(
                    "border px-1.5 py-0.5 text-xs font-medium capitalize",
                    ROLE_BADGE_STYLES[newRole] ?? ROLE_BADGE_STYLES.user
                  )}
                >
                  {newRole}
                </Badge>
                . This will immediately alter their platform access.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[#444933]/20 px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-[#c4c9ac] hover:text-[#e2e4cf]"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirm}
              disabled={loading}
              className="min-w-[80px]"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
