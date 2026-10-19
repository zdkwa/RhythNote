import type { DaySummary } from "@/types/domain";
import { calendarStateFromSummary, type CalendarState } from "@/domain/day";
import { progressPercent } from "@/features/calendar/calendar-utils";
import { cn } from "@/lib/utils";

const BAR_COLOR: Record<CalendarState, string> = {
  green: "hsl(var(--cal-green))",
  yellow: "hsl(var(--cal-yellow))",
  red: "hsl(var(--cal-red))",
  none: "hsl(var(--cal-gray))",
};

export interface DayProgressSummaryProps {
  summary: DaySummary;
  historyCount: number;
  className?: string;
}

export function DayProgressSummary({
  summary,
  historyCount,
  className,
}: DayProgressSummaryProps) {
  const state = calendarStateFromSummary(summary);
  const percent = progressPercent(summary.done, summary.total);

  return (
    <section
      aria-label="当天进度"
      className={cn("paper-panel rounded-2xl px-5 py-4", className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex items-end gap-2">
          <span className="pb-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            已完成
          </span>
          <span className="display-number text-4xl font-semibold leading-none text-foreground">
            {summary.done}
          </span>
          <span className="pb-0.5 text-sm text-muted-foreground">
            / {summary.total}
          </span>
        </div>
        <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-baseline gap-1">
            <dt>未完成</dt>
            <dd className="font-semibold tabular-nums text-foreground">
              {summary.unfinished}
            </dd>
          </div>
          <div className="flex items-baseline gap-1">
            <dt>暂停</dt>
            <dd className="font-semibold tabular-nums text-foreground">
              {summary.paused}
            </dd>
          </div>
          {historyCount > 0 ? (
            <div className="flex items-baseline gap-1">
              <dt>历史记录</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {historyCount}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div
        role="progressbar"
        aria-label="当天完成进度"
        aria-valuemin={0}
        aria-valuemax={summary.total}
        aria-valuenow={summary.done}
        className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10"
      >
        {summary.total > 0 ? (
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{
              width: `${percent}%`,
              backgroundColor: BAR_COLOR[state],
            }}
          />
        ) : null}
      </div>
    </section>
  );
}
