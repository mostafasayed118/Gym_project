"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDialogShell } from "@/hooks/use-dialog-shell";

interface ReinstateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onSuccess?: () => void;
}

const CONFIRM_TOKEN = "REINSTATE";

export function ReinstateUserDialog({
  open,
  onOpenChange,
  userId,
  userName,
  onSuccess,
}: ReinstateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [confirmToken, setConfirmToken] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const unsuspendUser = useMutation(api.users.unsuspendUser);

  const isMatch = confirmToken === CONFIRM_TOKEN;

  const [prevOpen, setPrevOpen] = useState(open);
  // Reset the confirmation token whenever the dialog (re)opens. Done during
  // render (React's "storing information from previous renders" pattern)
  // rather than in an effect to avoid react-hooks/set-state-in-effect.
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setConfirmToken("");
    }
  }

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!isMatch || loading) return;

    setLoading(true);
    try {
      const result = await unsuspendUser({ targetUserId: userId as never });

      if (result?.changed === false) {
        toast.info(`${userName} was not suspended`, {
          description: "No changes were made.",
        });
      } else {
        toast.success("User reinstated", {
          description: `${userName} has been unbanned and can now access the platform again.`,
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to reinstate user", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

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
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !loading && onOpenChange(false)}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="reinstate-title"
          aria-describedby="reinstate-desc"
          className={cn(
            "w-full max-w-md overflow-hidden rounded-xl outline-none",
            "bg-[rgba(9,9,11,0.8)] shadow-2xl backdrop-blur-2xl",
            "border border-[#abd600]/30",
          )}
        >
          <div className="flex items-start gap-4 p-6 pb-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#abd600]/10">
              <ShieldCheck className="size-5 text-[#abd600]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="reinstate-title"
                className="text-lg font-bold tracking-tight text-[#e2e4cf]"
              >
                Reinstate User
              </h2>
              <p
                id="reinstate-desc"
                className="mt-2 text-sm leading-relaxed text-[#c4c9ac]"
              >
                You are about to reinstate{" "}
                <span className="font-medium text-[#e2e4cf]">{userName}</span>.
                This will lift their suspension in Convex and unban them in
                Clerk so they regain full platform access.
              </p>
            </div>
          </div>

          <div className="px-6">
            <label
              htmlFor="confirm-reinstate"
              className="mb-2 block font-label-caps text-[10px] uppercase tracking-widest text-[#c4c9ac]"
            >
              Type <span className="font-bold text-[#abd600]">{CONFIRM_TOKEN}</span> to confirm
            </label>
            <Input
              ref={inputRef}
              id="confirm-reinstate"
              type="text"
              placeholder={CONFIRM_TOKEN}
              autoComplete="off"
              spellCheck={false}
              value={confirmToken}
              onChange={(e) => setConfirmToken(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                "h-10 bg-[#09090b] text-sm",
                confirmToken.length > 0 && !isMatch
                  ? "border-[#ffb4ab]/60 focus:border-[#ffb4ab]"
                  : isMatch
                    ? "border-[#abd600]/60 focus:border-[#abd600]"
                    : "",
              )}
              disabled={loading}
            />
            {confirmToken.length > 0 && !isMatch && (
              <p className="mt-1.5 text-xs text-[#ffb4ab]/80">
                Must match exactly (case-sensitive)
              </p>
            )}
          </div>

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
              variant="success"
              size="sm"
              onClick={handleConfirm}
              disabled={loading || !isMatch}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Reinstating…
                </>
              ) : (
                <>
                  <UserCheck className="size-3.5" />
                  Reinstate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
