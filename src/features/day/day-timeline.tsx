import { Clock3 } from "lucide-react";
import type { DayItem, Task } from "@/types/domain";
import { isItemDone } from "@/features/day/day-items";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#EA580C",
  "#CA8A04",
  "#16A34A",
  "#0D9488",
  "#0891B2",
  "#4F46E5",
  "#9333EA",
  "#BE123C",
];

interface Period {
  id: string;
  label: string;
  start: number;
  end: number;
}

const PERIODS: Period[] = [
  { id: "dawn", label: "凌晨", start: 0, end: 6 * 60 },
  { id: "morning", label: "上午", start: 6 * 60, end: 12 * 60 },
  { id: "afternoon", label: "下午", start: 12 * 60, end: 18 * 60 },
  { id: "evening", label: "晚上", start: 18 * 60, end: 24 * 60 },
];

interface PositionedRow {
  item: DayItem;
  order: number;
  periodIndex: number;
  start: number;
  end: number;
  kind: "range" | "deadline";
  color: string;
}

interface AllDayRow {
  item: DayItem;
  order: number;
  color: string;
}

function timeToMinutes(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function timeLabel(task: Task): string {
  if (task.timeSemantic === "deadline") {
    return task.endTime ? `截止 ${task.endTime}` : "当天截止";
  }
  if (task.startTime && task.endTime) {
    return `${task.startTime} – ${task.endTime}`;
  }
  if (task.startTime) return task.startTime;
  if (task.endTime) return `截止 ${task.endTime}`;
  return "全天";
}

/** 把分钟数转换为“小时/分钟”展示，例如 130 -> 2小时10分。 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}小时${rest}分` : `${hours}小时`;
}

function colourFor(index: number): string {
  return index < PALETTE.length
    ? PALETTE[index]
    : `hsl(${Math.round((index * 137.508) % 360)} 66% 42%)`;
}

function buildRows(items: DayItem[]): {
  periods: Array<{ period: Period; rows: PositionedRow[] }>;
  allDay: AllDayRow[];
} {
  const scheduled = items.filter(
    (item) => item.kind === "scheduled" && !item.isArchived,
  );
  const timed: Array<{
    item: DayItem;
    start: number;
    end: number;
    kind: "range" | "deadline";
  }> = [];
  const allDay: DayItem[] = [];

  for (const item of scheduled) {
    const start = timeToMinutes(item.task.startTime);
    const end = timeToMinutes(item.task.endTime);
    if (start === null && end === null) {
      allDay.push(item);
      continue;
    }
    if (item.task.timeSemantic === "deadline" && end !== null) {
      timed.push({ item, start: end, end, kind: "deadline" });
      continue;
    }
    timed.push({
      item,
      start: start ?? 0,
      end: Math.max(end ?? start ?? 0, start ?? 0),
      kind: "range",
    });
  }

  timed.sort((a, b) => a.start - b.start || a.end - b.end);
  const ordered: Array<{
    item: DayItem;
    start: number;
    end: number;
    kind: "range" | "deadline";
    periodIndex: number;
    order: number;
    color: string;
  }> = [];

  timed.forEach((row, index) => {
    const periodIndex = Math.max(
      0,
      PERIODS.findIndex(
        (period) => row.start >= period.start && row.start < period.end,
      ),
    );
    ordered.push({
      ...row,
      periodIndex,
      order: index + 1,
      color: colourFor(index),
    });
  });

  const periods = PERIODS.map((period, periodIndex) => ({
    period,
    rows: ordered.filter((row) => row.periodIndex === periodIndex),
  })).filter((entry) => entry.rows.length > 0);

  return {
    periods,
    allDay: allDay.map((item, index) => ({
      item,
      order: timed.length + index + 1,
      color: colourFor(timed.length + index),
    })),
  };
}

function PeriodChart({
  period,
  rows,
  nowMinutes,
  today,
  date,
}: {
  period: Period;
  rows: PositionedRow[];
  nowMinutes: number | null;
  today: string;
  date: string;
}) {
  const durationMinutes = period.end - period.start;
  const showNow =
    date === today &&
    nowMinutes !== null &&
    nowMinutes >= period.start &&
    nowMinutes < period.end;
  const nowPercent = showNow
    ? ((nowMinutes - period.start) / durationMinutes) * 100
    : null;
  const axisHours = Array.from(
    { length: durationMinutes / 60 + 1 },
    (_, index) => period.start + index * 60,
  );

  return (
    <section className="rounded-xl border border-border/80 bg-background/45 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold">{period.label}</h3>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {String(period.start / 60).padStart(2, "0")}:00 –{" "}
          {String(period.end / 60).padStart(2, "0")}:00
        </span>
      </div>

      <div
        className="grid items-end gap-x-2"
        style={{ gridTemplateColumns: "178px minmax(0, 1fr)" }}
      >
        <div />
        <div className="relative h-4 border-b border-border/70">
          {axisHours.map((minutes) => {
            const percent = ((minutes - period.start) / durationMinutes) * 100;
            const isFirst = minutes === period.start;
            const isLast = minutes === period.end;
            return (
              <span
                key={minutes}
                className={cn(
                  "absolute text-[9px] tabular-nums text-muted-foreground",
                  isFirst
                    ? "translate-x-0"
                    : isLast
                      ? "-translate-x-full"
                      : "-translate-x-1/2",
                )}
                style={{ left: `${percent}%` }}
              >
                {String(minutes / 60).padStart(2, "0")}
              </span>
            );
          })}
        </div>
      </div>

      <div className="relative">
        {rows.map((row) => {
          const start = Math.max(row.start, period.start);
          const end = Math.min(row.end, period.end);
          const left = ((start - period.start) / durationMinutes) * 100;
          const width = Math.max(((end - start) / durationMinutes) * 100, 1.2);
          const minutes = row.end - row.start;
          const duration =
            row.kind === "deadline"
              ? "截止"
              : formatDuration(Math.max(minutes, 0));
          const showDuration = width >= 4.5;
          const done = isItemDone(row.item);
          const paused = row.item.isPaused;

          return (
            <div
              key={row.item.key}
              className="grid min-h-9 items-center gap-x-2 border-t border-border/40 first:border-t-0"
              style={{ gridTemplateColumns: "178px minmax(0, 1fr)" }}
            >
              <div className="flex min-w-0 items-center gap-2 py-1">
                <span
                  className="h-[11px] w-[11px] shrink-0 rounded-[2px]"
                  style={{ backgroundColor: row.color }}
                />
                <span
                  className={cn(
                    "min-w-0 truncate text-[11px] font-medium",
                    done && "text-muted-foreground line-through",
                  )}
                  title={row.item.task.title}
                >
                  {row.item.task.title}
                </span>
                <span className="ml-auto shrink-0 text-[9px] tabular-nums text-muted-foreground">
                  {timeLabel(row.item.task)}
                </span>
              </div>

              <div className="relative h-8 overflow-hidden border-x border-border/60 bg-muted/15">
                <div
                  className="pointer-events-none absolute inset-0 opacity-60"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to right, hsl(var(--border) / 0.45) 0 1px, transparent 1px 16.6667%)",
                  }}
                />
                {nowPercent !== null ? (
                  <div
                    className="absolute inset-y-0 z-20 w-px bg-rose-500/80"
                    style={{ left: `${nowPercent}%` }}
                    title="当前时间"
                  />
                ) : null}

                <div
                  className={cn(
                    "absolute top-1 z-10 flex h-6 items-center justify-center overflow-hidden rounded px-1 text-[9px] font-semibold text-white",
                    paused && "border border-dashed border-white/80",
                    done && "opacity-55",
                  )}
                  style={{
                    left: `${left}%`,
                    width: `max(${width}%, 2.25rem)`,
                    backgroundColor:
                      row.kind === "deadline" ? "transparent" : row.color,
                    color: row.kind === "deadline" ? row.color : undefined,
                  }}
                  title={`${row.item.task.title} · ${duration}`}
                >
                  {row.kind === "deadline" ? (
                    <>
                      <span
                        className="absolute inset-x-0 top-1/2 border-t border-dashed"
                        style={{ borderColor: row.color }}
                      />
                      <span
                        className="relative z-10 h-2 w-2 rotate-45 border border-white"
                        style={{ backgroundColor: row.color }}
                      />
                    </>
                  ) : showDuration ? (
                    <span className="w-full truncate text-center tabular-nums">
                      {duration}
                    </span>
                  ) : (
                    <span className="w-full text-center">…</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function DayTimeline({
  items,
  date,
  today,
  nowTime,
  className,
}: {
  items: DayItem[];
  date: string;
  today: string;
  nowTime: string;
  className?: string;
}) {
  const { periods, allDay } = buildRows(items);
  if (periods.length === 0 && allDay.length === 0) return null;

  const nowMinutes = date === today ? timeToMinutes(nowTime) : null;

  return (
    <section
      className={cn("paper-panel overflow-hidden rounded-2xl p-4", className)}
      aria-label="当天任务时间轴"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            Timeline
          </p>
          <h2 className="mt-0.5 font-display text-xl font-semibold">
            当天时间轴
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            按上午 / 下午 / 晚上分段；左侧为任务与时间，右侧白色数字为预计花费时间。
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-600" />
            已完成
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-[2px] border border-dashed border-amber-600" />
            暂停
          </span>
          <span>{periods.reduce((total, entry) => total + entry.rows.length, 0) + allDay.length} 项</span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {periods.map((entry) => (
          <PeriodChart
            key={entry.period.id}
            period={entry.period}
            rows={entry.rows}
            nowMinutes={nowMinutes}
            today={today}
            date={date}
          />
        ))}

        {allDay.length > 0 ? (
          <section className="rounded-xl border border-border/80 bg-background/45 p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-xs font-semibold">全天</h3>
              <span className="text-[10px] text-muted-foreground">
                不设具体时间段
              </span>
            </div>
            <div className="space-y-1.5">
              {allDay.map((row) => (
                <div
                  key={row.item.key}
                  className="grid min-h-8 items-center gap-x-2"
                  style={{ gridTemplateColumns: "178px minmax(0, 1fr)" }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-[11px] w-[11px] shrink-0 rounded-[2px]"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="min-w-0 truncate text-[11px] font-medium">
                      {row.item.task.title}
                    </span>
                    <span className="ml-auto shrink-0 text-[9px] text-muted-foreground">
                      全天
                    </span>
                  </div>
                  <div className="relative h-7 overflow-hidden rounded bg-muted/15">
                    <div
                      className="absolute inset-x-0 top-1 flex h-5 items-center justify-center rounded text-[9px] font-semibold text-foreground"
                      style={{
                        backgroundColor: `${row.color}22`,
                        backgroundImage: `repeating-linear-gradient(45deg, ${row.color}33 0 6px, transparent 6px 12px)`,
                        border: `1px solid ${row.color}66`,
                      }}
                    >
                      全天
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Clock3 className="h-3 w-3" />
        时间轴按上午 / 下午 / 晚上分段；时间段内按先后顺序排列。
      </div>
    </section>
  );
}
