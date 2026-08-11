"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function PageTransition({
  children,
  className,
  delay = 0,
}: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      className={cn(
        "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-3 opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PageTransition className={cn("flex min-h-screen flex-col", className)}>
      {children}
    </PageTransition>
  );
}
