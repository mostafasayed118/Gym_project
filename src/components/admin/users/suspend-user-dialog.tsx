"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { AlertOctagon, Loader2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDialogShell } from "@/hooks/use-dialog-shell";

// ─── Types ──────────────────────────────────────────────────────────

interface SuspendUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string;
  onSuccess?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function SuspendUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
  onSuccess,
}: SuspendUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const suspendUser = useMutation(api.users.suspendUser);

  const isMatch = confirmEmail === userEmail;

  const [prevOpen, setPrevOpen] = useState(open);
  // Reset the confirmation email whenever the dialog (re)opens. Done during
  // render (React's "storing information from previous renders" pattern)
  // rather than in an effect to avoid react-hooks/set-state-in-effect.
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setConfirmEmail("");
    }
  }

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!isMatch) return;

    setLoading(true);
    try {
      await suspendUser({
        targetUserId: userId as never,
      });
      toast.success(`User suspended`, {
        description: `${userName} has been suspended and banned from the platform.`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to suspend user", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key in email input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isMatch && !loading) {
      e.preventDefault();
      handleConfirm();
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
          aria-labelledby="suspend-title"
          aria-describedby="suspend-desc"
          className={cn(
            "w-full max-w-md overflow-hidden rounded-xl outline-none",
            "bg-[rgba(9,9,11,0.8)] shadow-2xl backdrop-blur-2xl",
            "border border-[#ffb4ab]/30"
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-4 p-6 pb-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ffb4ab]/10">
              <AlertOctagon className="size-5 text-[#ffb4ab]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="suspend-title"
                className="text-lg font-bold tracking-tight text-[#e2e4cf]"
              >
                Suspend User
              </h2>
              <p
                id="suspend-desc"
                className="mt-2 text-sm leading-relaxed text-[#c4c9ac]"
              >
                You are about to suspend{" "}
                <span className="font-medium text-[#e2e4cf]">{userName}</span>{" "}
                (<span className="text-[#ffb4ab]">{userEmail}</span>). This will
                immediately ban them from the platform and revoke all access.
              </p>
            </div>
          </div>

          {/* Confirmation input */}
          <div className="px-6">
            <label
              htmlFor="confirm-email"
              className="mb-2 block font-label-caps text-[10px] uppercase tracking-widest text-[#c4c9ac]"
            >
              Type the user&apos;s email to confirm
            </label>
            <Input
              ref={inputRef}
              id="confirm-email"
              type="email"
              placeholder={userEmail}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "h-10 bg-[#09090b] text-sm",
                confirmEmail.length > 0 && !isMatch
                  ? "border-[#ffb4ab]/60 focus:border-[#ffb4ab]"
                  : ""
              )}
              disabled={loading}
            />
            {confirmEmail.length > 0 && !isMatch && (
              <p className="mt-1.5 text-xs text-[#ffb4ab]/80">
                Email does not match
              </p>
            )}
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
              variant="destructive"
              size="sm"
              onClick={handleConfirm}
              disabled={loading || !isMatch}
              className="min-w-[100px] bg-[#ffb4ab]/15 text-[#ffb4ab] hover:bg-[#ffb4ab]/25"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <UserX className="size-3.5" />
                  Suspend
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
