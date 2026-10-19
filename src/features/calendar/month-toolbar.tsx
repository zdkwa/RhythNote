import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthLabel } from "@/lib/date";

export interface MonthToolbarProps {
  monthKey: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  isCurrentMonth: boolean;
}

export function MonthToolbar({
  monthKey,
  onPrevMonth,
  onNextMonth,
  onToday,
  isCurrentMonth,
}: MonthToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-card/70 p-1 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="上一月"
          title="上一月"
          onClick={onPrevMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span
          aria-live="polite"
          className="min-w-[7.5rem] select-none text-center font-display text-lg font-semibold leading-none tracking-tight"
        >
          {monthLabel(monthKey)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="下一月"
          title="下一月"
          onClick={onNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Button
        type="button"
        variant={isCurrentMonth ? "outline" : "default"}
        size="sm"
        onClick={onToday}
        className="gap-1.5"
      >
        <CalendarDays className="h-3.5 w-3.5" />
        回到今天
      </Button>
    </div>
  );
}
