import { useRef, type KeyboardEvent } from "react";
import type { DaySummary } from "@/types/domain";
import { addDaysKey } from "@/lib/date";
import { CalendarDayCell } from "@/features/calendar/calendar-day-cell";
import { WEEKDAY_HEADERS } from "@/features/calendar/calendar-utils";

const ARROW_DELTAS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

export interface MonthCalendarProps {
  days: string[];
  monthKey: string;
  today: string;
  summaries: Map<string, DaySummary>;
}

/**
 * 固定 6 行 × 7 列、周一开始的月历网格。
 * 只读渲染：不写数据库，也不生成任何每日记录。
 */
export function MonthCalendar({
  days,
  monthKey,
  today,
  summaries,
}: MonthCalendarProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = ARROW_DELTAS[event.key];
    if (delta === undefined) return;
    const target = event.target as HTMLElement | null;
    const date = target?.closest<HTMLElement>("[data-date]")?.dataset.date;
    if (!date) return;
    event.preventDefault();
    const nextDate = addDaysKey(date, delta);
    const nextCell = gridRef.current?.querySelector<HTMLElement>(
      `[data-date="${nextDate}"]`,
    );
    nextCell?.focus();
  };

  return (
    <section
      aria-label="月历"
      className="paper-panel rounded-2xl p-3 sm:p-4"
    >
      <div className="mb-2 grid grid-cols-7 gap-1.5 px-0.5">
        {WEEKDAY_HEADERS.map((label) => (
          <span
            key={label}
            className="py-1 text-center text-[11px] font-semibold tracking-wide text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
      <div
        ref={gridRef}
        onKeyDown={handleKeyDown}
        className="grid grid-cols-7 gap-1.5"
      >
        {days.map((date) => (
          <CalendarDayCell
            key={date}
            date={date}
            summary={summaries.get(date)}
            isToday={date === today}
            isOutsideMonth={!date.startsWith(`${monthKey}-`)}
          />
        ))}
      </div>
    </section>
  );
}
