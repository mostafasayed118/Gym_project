import { Badge } from "@/components/ui/badge";
import { CalendarDays, User } from "lucide-react";
import type { ActivePlanData } from "@/hooks/use-active-plan";

interface PlanHeaderProps {
  plan: ActivePlanData["plan"];
  coach: ActivePlanData["coach"];
}

export function PlanHeader({ plan, coach }: PlanHeaderProps) {
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold leading-tight">{plan.title}</h1>
        <Badge variant="secondary">Active</Badge>
      </div>

      {plan.description && (
        <p className="text-muted-foreground text-sm">{plan.description}</p>
      )}

      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-4 text-xs">
        {coach && (
          <span className="flex items-center gap-1.5">
            <User className="size-3.5" />
            Coach: {coach.name}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {formatDate(plan.startDate)} — {formatDate(plan.endDate)}
        </span>
      </div>
    </div>
  );
}
