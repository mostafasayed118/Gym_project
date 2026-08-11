"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Shield, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandK } from "./command-k";

export function AdminHeader() {
  const { user } = useUser();

  return (
    <>
      <header
        className="sticky top-0 z-40 h-14 w-full flex items-center justify-between px-6 border-b border-[#444933]/10"
        style={{
          background: "rgba(17, 21, 8, 0.5)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "4px solid #ffb300",
        }}
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/dashboard" />}
            className="size-10"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="h-4 w-px bg-[#444933]/30" />
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-[#ffb300]" />
            <h1 className="text-sm font-bold tracking-tight text-[#ffb300]">
              Admin Mode
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            className="hidden gap-2 sm:flex"
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                }),
              );
            }}
          >
            <Search className="size-3.5" />
            Search
            <kbd className="ml-1 rounded border border-[#444933]/30 bg-[#1e2113] px-1.5 py-0.5 text-[10px] font-medium text-[#c4c9ac]">
              ⌘K
            </kbd>
          </Button>

          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[#ffb300]/10 flex items-center justify-center border border-[#ffb300]/30">
              <span className="text-xs font-bold text-[#ffb300]">
                {user?.firstName?.[0] ?? "A"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <CommandK />
    </>
  );
}
