"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Wires focus trapping, Escape-to-close, body scroll lock, and focus restoration
 * onto a custom modal/dialog. Returns a ref to attach to the dialog's content
 * element.
 *
 * Closes BUG-041 — the custom Suspend/Reinstate/RoleChange dialogs previously
 * had no focus trap, no scroll lock, and no Escape handler. Keyboard-only
 * users could Tab out of the dialog into the page beneath.
 *
 * Usage:
 *   const dialogRef = useDialogShell({ open, onClose });
 *   if (!open) return null;
 *   return <div ref={dialogRef} role="alertdialog" aria-modal="true">...</div>;
 */
export function useDialogShell({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Remember what had focus so we can restore it on close.
    previousActiveElementRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    // Lock body scroll.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move initial focus to the first focusable element inside the dialog.
    const focusFirst = () => {
      const node = ref.current;
      if (!node) return;
      const focusable = node.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable ?? node).focus({ preventScroll: true });
    };
    // Small delay so any animation completes before we move focus.
    const focusTimer = window.setTimeout(focusFirst, 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const node = ref.current;
      if (!node) return;
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("data-focus-skip"));
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !node.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !node.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElementRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  return ref;
}
