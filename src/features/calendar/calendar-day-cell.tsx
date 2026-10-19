import { Link } from "react-router-dom";
import type { DaySummary } from "@/types/domain";
import {
  calendarStateFromSummary,
  type CalendarState,
} from "@/domain/day";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { dateWithWeekday } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
  dayOfMonth,
  emptyDaySummary,
  historyCountOf,
  progressPercent,
} from "@/features/calendar/calendar-utils";

const BAR_COLOR: Record<CalendarState, string> = {
  green: "hsl(var(--cal-green))",
  yellow: "hsl(var(--cal-yellow))",
  red: "hsl(var(--cal-red))",
  none: "hsl(var(--cal-gray))",
  upcoming: "hsl(var(--cal-upcoming))",
};

export interface CalendarDayCellProps {
  date: string;
  summary: DaySummary | undefined;
  isToday: boolean;
  isOutsideMonth: boolean;
  isFuture: boolean;
  compact?: boolean;
}

export function CalendarDayCell({
  date,
  summary,
  isToday,
  isOutsideMonth,
  isFuture,
  compact = false,
}: CalendarDayCellProps) {
  const resolved = summary ?? emptyDaySummary(date);
  const plannedOnly = isFuture && resolved.total > 0;
  const state: CalendarState = plannedOnly
    ? "upcoming"
    : calendarStateFromSummary(resolved);
  const { total, done, unfinished, paused } = resolved;
  const history = historyCountOf(resolved);
  const percent = progressPercent(done, total);

  const ariaLabel = [
    dateWithWeekday(date),
    plannedOnly
      ? `未开始，计划 ${total} 项`
      : total > 0
        ? `完成：${done}，未完成：${unfinished}`
        : "无任务安排",
    paused > 0 ? `暂停：${paused}` : null,
    history > 0 ? `历史记录：${history}` : null,
  ]
    .filter(Boolean)
    .join("，");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={`/day/${date}`}
          data-date={date}
          data-state={state}
          data-outside={isOutsideMonth ? "true" : "false"}
          aria-current={isToday ? "date" : undefined}
          aria-label={ariaLabel}
          className={cn(
            "cal-cell flex flex-col rounded-lg border border-border/60 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            compact
              ? "min-h-[56px] p-1.5 sm:min-h-[60px]"
              : "min-h-[72px] p-2 sm:min-h-[80px] sm:p-2.5",
            isToday && "border-primary/60 ring-2 ring-primary/35",
          )}
        >
          <span className="flex items-start justify-between gap-1">
            <span
              className={cn(
                "display-number font-semibold leading-none",
                compact ? "text-[13px]" : "text-[15px]",
                isToday
                  ? compact
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground"
                    : "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[13px] text-primary-foreground"
                  : isOutsideMonth
                    ? "text-muted-foreground"
                    : "text-foreground",
              )}
            >
              {dayOfMonth(date)}
            </span>
            {paused > 0 && !compact ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground">
                暂停 {paused}
              </span>
            ) : null}
          </span>

          <span className={cn("mt-auto block", compact ? "space-y-1" : "space-y-1.5")}>
            <span
              className={cn(
                "flex items-baseline justify-between gap-1 leading-none",
                compact ? "text-[9px]" : "text-[11px]",
              )}
            >
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  total === 0 || plannedOnly
                    ? "text-muted-foreground/80"
                    : "text-foreground/90",
                )}
              >
                {plannedOnly
                  ? "未开始"
                  : total > 0
                    ? `${done}/${total}`
                    : "—"}
              </span>
              {history > 0 && !compact ? (
                <span className="text-[9px] tabular-nums text-muted-foreground">
                  历史 {history}
                </span>
              ) : null}
            </span>
            <span className={cn("block w-full overflow-hidden rounded-full bg-ink/10", compact ? "h-0.5" : "h-1")}>
              {total > 0 && !plannedOnly ? (
                <span
                  className="block h-full rounded-full transition-[width] duration-200"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: BAR_COLOR[state],
                  }}
                />
              ) : null}
            </span>
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="space-y-1">
        <p className="font-medium tabular-nums">
          {plannedOnly
            ? `未开始 · 计划 ${total} 项`
            : `完成：${done}，未完成：${unfinished}`}
        </p>
        {paused > 0 ? (
          <p className="tabular-nums text-muted-foreground">暂停：{paused}</p>
        ) : null}
        {history > 0 ? (
          <p className="tabular-nums text-muted-foreground">
            历史记录：{history}
          </p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
