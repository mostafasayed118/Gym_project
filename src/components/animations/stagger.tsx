import { cn } from "@/lib/utils";

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function Stagger({
  children,
  className,
  delay = 0,
}: StaggerProps) {
  return (
    <div
      className={cn("stagger-children", className)}
      style={{ "--stagger-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
