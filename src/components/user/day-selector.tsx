import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DaySelectorProps {
  days: string[];
  selectedDay?: string;
  currentDay: string;
  completedDays: Set<string>;
  onDaySelect: (day: string) => void;
}

const DAY_ABBREVS: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

export function DaySelector({
  days,
  selectedDay = days[0],
  currentDay,
  completedDays,
  onDaySelect,
}: DaySelectorProps) {
  return (
    <div className="grid grid-cols-7 gap-3">
      {days.map((day) => {
        const isSelected = day === selectedDay;
        const isToday = day === currentDay;
        const isCompleted = completedDays.has(day);

        return (
          <button
            key={day}
            type="button"
            onClick={() => onDaySelect(day)}
            className={cn(
              "relative flex h-20 flex-col items-center justify-center gap-1 rounded-lg transition-all duration-200",
              isSelected
                ? "bg-[#c3f400]/15 border border-[#c3f400]"
                : isToday
                  ? "bg-[rgba(9,9,11,0.5)] border border-[rgba(68,73,51,0.2)]"
                  : "bg-[rgba(9,9,11,0.5)] border border-[rgba(68,73,51,0.2)] opacity-60",
              "active:scale-95",
            )}
            style={{ backdropFilter: "blur(24px)" }}
          >
            {/* Top indicator bar for selected */}
            {isSelected && (
              <div className="absolute top-0 left-0 w-full h-1 bg-[#c3f400] rounded-t-lg" />
            )}

            <span
              className={cn(
                "font-label-caps text-[10px] uppercase tracking-wider",
                isSelected
                  ? "text-[#c3f400]"
                  : "text-[#c4c9ac]",
              )}
            >
              {DAY_ABBREVS[day] ?? day.slice(0, 3)}
            </span>

            <span
              className={cn(
                "font-headline-lg text-xl font-bold",
                isSelected
                  ? "text-[#c3f400]"
                  : isCompleted
                    ? "text-[#abd600]"
                    : "text-[#e2e4cf]",
              )}
            >
              {day.slice(-2)}
            </span>

            {/* Completed checkmark */}
            {isCompleted && !isSelected && (
              <div className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#abd600]">
                <Check className="size-2.5 text-[#09090b]" />
              </div>
            )}

            {/* Today indicator dot */}
            {isToday && !isSelected && !isCompleted && (
              <div className="size-1.5 rounded-full bg-[#abd600] animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
}
