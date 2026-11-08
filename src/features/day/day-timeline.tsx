import { Clock3 } from "lucide-react";
import type { DayItem, Task } from "@/types/domain";
import { isItemDone } from "@/features/day/day-items";
import { cn } from "@/lib/utils";

const HOUR_MARKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
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

interface TimelineRow {
  item: DayItem;
  order: number;
  start: number | null;
  end: number | null;
  color: string;
  kind: "range" | "deadline" | "all-day";
}

function buildRows(items: DayItem[]): TimelineRow[] {
  const scheduled = items.filter(
    (item) => item.kind === "scheduled" && !item.isArchived,
  );
  const allDay: DayItem[] = [];
  const timed: Array<{
    item: DayItem;
    start: number;
    end: number;
    kind: "range" | "deadline";
  }> = [];

  for (const item of scheduled) {
    const start = timeToMinutes(item.task.startTime);
    const end = timeToMinutes(item.task.endTime);
    if (start === null && end === null) {
      allDay.push(item);
      continue;
    }
    if (item.task.timeSemantic === "deadline" && end !== null) {
      timed.push({ item, start: 0, end, kind: "deadline" });
      continue;
    }
    timed.push({
      item,
      start: start ?? 0,
      end: end ?? start ?? 0,
      kind: "range",
    });
  }

  timed.sort((a, b) => a.start - b.start || a.end - b.end);
  const ordered = [
    ...timed,
    ...allDay.map((item) => ({
      item,
      start: 0,
      end: 24 * 60,
      kind: "all-day" as const,
    })),
  ];

  return ordered.map((row, index) => ({
    ...row,
    order: index + 1,
    color:
      index < PALETTE.length
        ? PALETTE[index]
        : `hsl(${Math.round((index * 137.508) % 360)} 66% 42%)`,
  }));
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
  const rows = buildRows(items);
  if (rows.length === 0) return null;

  const nowMinutes = date === today ? timeToMinutes(nowTime) : null;
  const showNow = nowMinutes !== null;

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
            横轴为时间，纵轴为任务顺序；颜色用于区分任务。
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            已完成
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full border border-dashed border-amber-600" />
            暂停
          </span>
          <span>{rows.length} 项</span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto scrollbar-thin">
        <div className="min-w-[720px]">
          <div
            className="grid items-end gap-x-3"
            style={{ gridTemplateColumns: "9rem minmax(0, 1fr)" }}
          >
            <div />
            <div className="relative h-5 border-b border-border/80">
              {HOUR_MARKS.map((hour) => (
                <span
                  key={hour}
                  className={cn(
                    "absolute text-[10px] tabular-nums text-muted-foreground",
                    hour === 0
                      ? "translate-x-0"
                      : hour === 24
                        ? "-translate-x-full"
                        : "-translate-x-1/2",
                  )}
                  style={{ left: `${(hour / 24) * 100}%` }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ))}
            </div>
          </div>

          <div className="max-h-[560px] space-y-0.5 overflow-y-auto pr-1 scrollbar-thin">
            {rows.map((row) => {
              const done = isItemDone(row.item);
              const paused = row.item.isPaused;
              const label = timeLabel(row.item.task);
              const left =
                row.kind === "deadline"
                  ? ((row.end ?? 0) / (24 * 60)) * 100
                  : ((row.start ?? 0) / (24 * 60)) * 100;
              const width =
                row.kind === "all-day"
                  ? 100
                  : row.kind === "deadline"
                    ? left
                    : Math.max((((row.end ?? 0) - (row.start ?? 0)) / (24 * 60)) * 100, 0.8);
              const showBarLabel = row.kind === "all-day" || width >= 6;

              return (
                <div
                  key={row.item.key}
                  className="grid items-center gap-x-3"
                  style={{ gridTemplateColumns: "9rem minmax(0, 1fr)" }}
                >
                  <div className="flex min-w-0 items-center gap-2 py-1">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {row.order}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate text-xs font-medium",
                          done && "text-muted-foreground line-through",
                        )}
                        title={row.item.task.title}
                      >
                        {row.item.task.title}
                      </p>
                      <p className="truncate text-[10px] tabular-nums text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  </div>

                  <div className="relative h-9 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-60"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(to right, hsl(var(--border) / 0.55) 0 1px, transparent 1px 12.5%)",
                      }}
                    />
                    {showNow ? (
                      <div
                        className="absolute inset-y-0 z-20 w-px bg-rose-500/80"
                        style={{
                          left: `${(nowMinutes / (24 * 60)) * 100}%`,
                        }}
                        title="当前时间"
                      />
                    ) : null}

                    {row.kind === "deadline" ? (
                      <>
                        <div
                          className="absolute top-1/2 h-0 border-t border-dashed"
                          style={{
                            left: 0,
                            width: `${left}%`,
                            borderColor: row.color,
                          }}
                        />
                        <span
                          className="absolute top-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/80"
                          style={{ left: `${left}%`, backgroundColor: row.color }}
                        />
                      </>
                    ) : (
                      <div
                        className={cn(
                          "absolute top-1 z-10 flex h-7 items-center overflow-hidden rounded-md px-2 text-[10px] font-medium text-white shadow-sm",
                          paused && "border border-dashed border-white/80 opacity-60",
                          done && "opacity-55",
                        )}
                        style={{
                          left: `${left}%`,
                          width:
                            row.kind === "all-day"
                              ? "calc(100% - 4px)"
                              : `max(${width}%, 2.5rem)`,
                          backgroundColor:
                            row.kind === "all-day" ? `${row.color}22` : row.color,
                          backgroundImage:
                            row.kind === "all-day"
                              ? `repeating-linear-gradient(45deg, ${row.color}33 0 6px, transparent 6px 12px)`
                              : undefined,
                          borderColor: row.kind === "all-day" ? row.color : undefined,
                        }}
                        title={row.item.task.title}
                      >
                        {showBarLabel ? (
                          <span
                            className={cn(
                              "truncate",
                              row.kind === "all-day" && "text-foreground",
                            )}
                          >
                            {row.item.task.title}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Clock3 className="h-3 w-3" />
        时间轴按 0–24 点展示；没有设置时间的任务归入全天行。
      </div>
    </section>
  );
}
