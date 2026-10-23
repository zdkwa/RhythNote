import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  ListTodo,
  PauseCircle,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDayActions } from "@/features/day/use-day-actions";
import { isItemDone } from "@/features/day/day-items";
import { useCheckinDays, useWorkspaceBundle } from "@/data/queries";
import { useClock, useToday } from "@/hooks/useToday";
import {
  buildCalendarSummaries,
  buildDaySummary,
  isTaskOverdue,
  isTaskStartingSoon,
  isTodayWithinBlock,
  minutesFromTimeBlock,
} from "@/domain/day";
import {
  addMonthsKey,
  dateRange,
  dateWithWeekday,
  isValidMonthKey,
  monthGridRange,
  nowTimeKey,
  parseDateKey,
  timeRangeLabel,
  toMonthKey,
  weekRange,
  weekdayShort,
} from "@/lib/date";
import { PRIORITY_ORDER, type DayItem } from "@/types/domain";
import { CalendarLegend } from "@/features/calendar/calendar-legend";
import { CalendarSkeleton } from "@/features/calendar/calendar-skeleton";
import { MonthCalendar } from "@/features/calendar/month-calendar";
import { MonthToolbar } from "@/features/calendar/month-toolbar";
import { toTaskPauses } from "@/features/records/pause-utils";
import { QueryErrorBar } from "@/features/records/query-error-bar";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  suffix,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  hint?: string;
  tone?: "primary" | "danger" | "warm" | "neutral";
}) {
  const toneClass = {
    primary: "border-primary/25 bg-primary/[0.06]",
    danger: "border-destructive/20 bg-destructive/[0.045]",
    warm: "border-accent/25 bg-accent/[0.055]",
    neutral: "border-border/80 bg-card/55",
  }[tone ?? "neutral"];

  return (
    <div className={cn("rounded-2xl border px-4 py-3.5", toneClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="display-number text-3xl font-semibold leading-none">
          {value}
        </span>
        {suffix ? (
          <span className="text-xs font-medium text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function CheckinCard({
  dates,
  today,
}: {
  dates: Set<string>;
  today: string;
}) {
  const week = weekRange(today);
  const weekDays = dateRange(week.start, week.end);

  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/[0.055] px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        已打卡天数
      </p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="display-number text-3xl font-semibold leading-none">
          {dates.size}
        </span>
        <span className="text-xs font-medium text-muted-foreground">天</span>
      </p>
      <div
        className="mt-3 flex items-end justify-between gap-1"
        aria-label="本周打卡记录"
      >
        {weekDays.map((date) => {
          const checked = dates.has(date);
          const isToday = date === today;
          return (
            <span
              key={date}
              title={`${date} ${checked ? "已打卡" : "未打卡"}`}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "h-2 w-full max-w-[18px] rounded-full transition-colors",
                  checked ? "bg-primary" : "bg-muted-foreground/20",
                  isToday && "ring-2 ring-primary/30 ring-offset-1 ring-offset-card",
                )}
              />
              <span
                className={cn(
                  "text-[8px] leading-none",
                  isToday
                    ? "font-semibold text-primary"
                    : "text-muted-foreground",
                )}
              >
                {weekdayShort(date).replace("周", "")}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function DashboardTaskRow({
  item,
  today,
  now,
  busy,
  onToggle,
}: {
  item: DayItem;
  today: string;
  now: string;
  busy: boolean;
  onToggle: () => void;
}) {
  const done = isItemDone(item);
  const isOnce = item.task.type === "once";
  const doing =
    !done && isTodayWithinBlock(item.task, item.date, today, now);
  const startingSoon =
    !done && isTaskStartingSoon(item.task, item.date, today, now);
  const overdue = isTaskOverdue(item.task, item.date, done, today, now);
  const time = timeRangeLabel(
    item.task.startTime,
    item.task.endTime,
    item.task.timeSemantic,
  );

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 px-3 py-2.5 transition-colors",
        doing && "border-primary/35 bg-primary/[0.035]",
        done && "opacity-60",
      )}
    >
      <Link
        to={`/day/${item.date}`}
        className="min-w-0 flex-1"
      >
        <span className={cn("block truncate text-sm font-medium", done && "line-through")}>
          {item.task.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <span className="tabular-nums">{time}</span>
          {item.task.category ? (
            <span className="inline-flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: item.task.category.color }}
              />
              {item.task.category.name}
            </span>
          ) : null}
          {isOnce ? <Badge variant="outline" className="px-1.5 py-0 text-[9px]">临时</Badge> : null}
          {doing ? (
            <Badge variant="done" className="px-1.5 py-0 text-[9px]">
              正在做
            </Badge>
          ) : startingSoon ? (
            <Badge variant="accent" className="px-1.5 py-0 text-[9px]">
              即将开始
            </Badge>
          ) : null}
          {!done && overdue ? (
            <Badge variant="destructive" className="px-1.5 py-0 text-[9px]">
              逾期
            </Badge>
          ) : null}
          {item.isPaused ? (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <PauseCircle className="h-2.5 w-2.5" />
              暂停
            </span>
          ) : null}
        </span>
      </Link>

      <button
        type="button"
        onClick={onToggle}
        disabled={busy || item.isPaused || item.isArchived || item.date > today}
        className={cn(
          "ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2.5 text-[10px] font-semibold transition-colors",
          done
            ? "border-destructive/35 bg-destructive/[0.06] text-destructive hover:bg-destructive/10"
            : overdue
              ? "border-amber-500/50 bg-amber-500 text-white hover:bg-amber-600"
              : "border-emerald-600/50 bg-emerald-600 text-white hover:bg-emerald-700",
          (busy || item.isPaused || item.isArchived) && "cursor-not-allowed opacity-50",
        )}
        aria-label={
          done
            ? `取消完成：${item.task.title}`
            : overdue
              ? `补做：${item.task.title}`
              : `完成：${item.task.title}`
        }
        title={done ? "取消完成" : overdue ? "补做" : "完成"}
      >
        {done ? (
          <Undo2 className="h-3 w-3" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        {done ? "取消完成" : overdue ? "补做" : "完成"}
      </button>
    </div>
  );
}

export function HomePage() {
  const today = useToday();
  const clock = useClock(1_000);
  const now = nowTimeKey(clock);
  const clockText = format(clock, "HH:mm:ss");
  const [params, setParams] = useSearchParams();
  const currentMonthKey = toMonthKey(parseDateKey(today));

  const rawMonth = params.get("month");
  const monthKey = isValidMonthKey(rawMonth) ? rawMonth : currentMonthKey;

  useEffect(() => {
    if (rawMonth === null || isValidMonthKey(rawMonth)) return;
    const updated = new URLSearchParams(params);
    updated.set("month", currentMonthKey);
    setParams(updated, { replace: true });
  }, [rawMonth, currentMonthKey, params, setParams]);

  const todayBundle = useWorkspaceBundle(today, today, true);
  const checkinQuery = useCheckinDays();
  const todayPauses = useMemo(
    () => toTaskPauses(todayBundle.pauses),
    [todayBundle.pauses],
  );
  const todaySummary = useMemo(
    () =>
      buildDaySummary(
        today,
        todayBundle.tasks,
        todayBundle.records,
        todayPauses,
      ),
    [today, todayBundle.tasks, todayBundle.records, todayPauses],
  );

  const grid = useMemo(() => monthGridRange(monthKey), [monthKey]);
  const monthBundle = useWorkspaceBundle(grid.start, grid.end, true);
  const monthPauses = useMemo(
    () => toTaskPauses(monthBundle.pauses),
    [monthBundle.pauses],
  );
  const summaries = useMemo(
    () =>
      buildCalendarSummaries({
        tasks: monthBundle.tasks,
        records: monthBundle.records,
        pauses: monthPauses,
        start: grid.start,
        end: grid.end,
      }),
    [
      monthBundle.tasks,
      monthBundle.records,
      monthPauses,
      grid.start,
      grid.end,
    ],
  );

  const actions = useDayActions(today);

  const loopUnfinishedItems = useMemo(
    () =>
      todaySummary.items
        .filter(
          (item) =>
            item.kind === "scheduled" &&
            item.task.type === "recurring" &&
            !item.isPaused &&
            !isItemDone(item),
        )
        .sort((a, b) => {
          const aCurrent = isTodayWithinBlock(a.task, a.date, today, now);
          const bCurrent = isTodayWithinBlock(b.task, b.date, today, now);
          if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
          const aDistance = minutesFromTimeBlock(a.task, a.date, today, now);
          const bDistance = minutesFromTimeBlock(b.task, b.date, today, now);
          if (aDistance !== bDistance) return aDistance < bDistance ? -1 : 1;
          return (a.task.startTime ?? "24:00").localeCompare(
            b.task.startTime ?? "24:00",
          );
        }),
    [todaySummary.items, today, now],
  );

  const temporaryUnfinishedItems = useMemo(
    () =>
      todaySummary.items
        .filter(
          (item) =>
            item.task.type === "once" &&
            item.kind === "scheduled" &&
            !item.isPaused &&
            !isItemDone(item),
        )
        .sort((a, b) => {
          const aCurrent = isTodayWithinBlock(a.task, a.date, today, now);
          const bCurrent = isTodayWithinBlock(b.task, b.date, today, now);
          if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;

          const priority =
            PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority];
          if (priority !== 0) return priority;

          const aDistance = minutesFromTimeBlock(a.task, a.date, today, now);
          const bDistance = minutesFromTimeBlock(b.task, b.date, today, now);
          if (aDistance !== bDistance) return aDistance < bDistance ? -1 : 1;

          return (a.task.startTime ?? "24:00").localeCompare(
            b.task.startTime ?? "24:00",
          );
        }),
    [todaySummary.items, today, now],
  );

  const loopItems = loopUnfinishedItems.slice(0, 2);
  const temporaryItems = temporaryUnfinishedItems.slice(0, 2);

  const checkinDates = useMemo(
    () => new Set(checkinQuery.data ?? []),
    [checkinQuery.data],
  );

  const goToMonth = (nextMonth: string) => {
    const updated = new URLSearchParams(params);
    updated.set("month", nextMonth);
    setParams(updated, { replace: true });
  };

  const hasTodayData =
    todayBundle.tasks.length > 0 ||
    todayBundle.records.length > 0 ||
    todayBundle.pauses.length > 0;
  const todayLoading =
    todayBundle.isLoading || (todayBundle.isError && !hasTodayData);
  const calendarLoading =
    monthBundle.isLoading ||
    (monthBundle.isError &&
      monthBundle.tasks.length === 0 &&
      monthBundle.records.length === 0);

  const remaining = Math.max(0, todaySummary.total - todaySummary.done);
  const progress =
    todaySummary.total > 0
      ? Math.round((todaySummary.done / todaySummary.total) * 100)
      : 0;
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-1 flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                今天
              </p>
              <p className="mt-1 text-2xl font-semibold leading-none">
                {dateWithWeekday(today)}
              </p>
            </div>
            <span className="mb-1 hidden h-9 w-px bg-border/80 sm:block" />
            <div className="flex items-baseline gap-2">
              <span className="flex items-center gap-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                现在
              </span>
              <span className="display-number text-2xl font-semibold leading-none tabular-nums">
                {clockText}
              </span>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/day/${today}`}>
              <CalendarDays className="h-4 w-4" />
              今日详情
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {todayBundle.isError ? (
          <QueryErrorBar
            message="今日数据加载失败，请重试。"
            onRetry={todayBundle.refetch}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="今日完成"
            value={todaySummary.done}
            hint={
              progress >= 100 && todaySummary.total > 0
                ? "今天的安排全部完成"
                : "今天已经完成的任务数"
            }
            tone="primary"
          />
          <StatCard
            label="待完成"
            value={remaining}
            suffix="项"
            hint={remaining > 0 ? "先处理当前时间段的任务" : "今天暂时没有未完成项"}
            tone={remaining > 0 ? "danger" : "neutral"}
          />
          <div className="rounded-2xl border border-border/80 bg-card/55 px-4 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              今日节奏
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(hsl(var(--cal-green)) ${progress * 3.6}deg, hsl(var(--muted)) 0deg)`,
                }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-xs font-semibold tabular-nums">
                  {progress}%
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {todaySummary.total === 0
                    ? "今天还没有安排"
                    : progress >= 100
                      ? "今天完成得很漂亮"
                      : "按自己的节律来"}
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                  {todaySummary.paused > 0
                    ? `另有 ${todaySummary.paused} 项暂停`
                    : "完成、补做与备注都会留下记录"}
                </p>
              </div>
            </div>
          </div>
          <CheckinCard dates={checkinDates} today={today} />
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <section className="paper-panel rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Loop
                  </p>
                  <h2 className="mt-0.5 font-display text-xl font-semibold">
                    循环任务
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    正在做优先，其余按距离当前时间从近到远，最多展示 2 项
                  </p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <ListTodo className="h-3 w-3" />
                  {loopUnfinishedItems.length} 项
                </Badge>
              </div>

              {todayLoading ? (
                <div className="mt-3 space-y-2">
                  <div className="h-12 animate-pulse rounded-xl bg-muted/70" />
                  <div className="h-12 animate-pulse rounded-xl bg-muted/50" />
                </div>
              ) : loopItems.length === 0 ? (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-border/80 px-3 py-4 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <span>今天没有未完成的循环任务。</span>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {loopItems.map((item) => (
                    <DashboardTaskRow
                      key={item.key}
                      item={item}
                      today={today}
                      now={now}
                      busy={actions.pendingKey !== null}
                      onToggle={() => void actions.toggleCompletion(item)}
                    />
                  ))}
                </div>
              )}

              {loopUnfinishedItems.length > loopItems.length ? (
                <Link
                  to="/tasks/recurring"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  还有 {loopUnfinishedItems.length - loopItems.length} 项循环任务，查看全部
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
            </section>

            <section className="paper-panel rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                    One-off
                  </p>
                  <h2 className="mt-0.5 font-display text-xl font-semibold">
                    临时任务
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    当前时段 → 优先级 → 距离当前时间，最多展示 2 项
                  </p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <ListTodo className="h-3 w-3" />
                  {temporaryUnfinishedItems.length} 项
                </Badge>
              </div>

              {temporaryItems.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-border/80 px-3 py-4 text-sm text-muted-foreground">
                  今天没有未完成的临时任务。
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {temporaryItems.map((item) => (
                    <DashboardTaskRow
                      key={item.key}
                      item={item}
                      today={today}
                      now={now}
                      busy={actions.pendingKey !== null}
                      onToggle={() => void actions.toggleCompletion(item)}
                    />
                  ))}
                </div>
              )}

              {temporaryUnfinishedItems.length > temporaryItems.length ? (
                <Link
                  to="/tasks/once"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  还有 {temporaryUnfinishedItems.length - temporaryItems.length} 项临时任务，查看全部
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
            </section>
          </div>

          <section className="paper-panel rounded-2xl p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Calendar
                </p>
                <h2 className="font-display text-xl font-semibold">月度节律</h2>
              </div>
              <MonthToolbar
                monthKey={monthKey}
                isCurrentMonth={monthKey === currentMonthKey}
                onPrevMonth={() => goToMonth(addMonthsKey(monthKey, -1))}
                onNextMonth={() => goToMonth(addMonthsKey(monthKey, 1))}
                onToday={() => goToMonth(currentMonthKey)}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-[10px] text-muted-foreground">
                点击日期查看当天安排；未来日期显示为“未开始”
              </p>
              <CalendarLegend />
            </div>

            {monthBundle.isError ? (
              <div className="mt-2">
                <QueryErrorBar
                  message="月历数据加载失败，请重试。"
                  onRetry={monthBundle.refetch}
                />
              </div>
            ) : null}

            <div className="mt-2">
              {calendarLoading ? (
                <CalendarSkeleton />
              ) : (
                <MonthCalendar
                  days={grid.days}
                  monthKey={monthKey}
                  today={today}
                  summaries={summaries}
                  compact
                />
              )}
            </div>
          </section>
        </div>

      </div>
    </TooltipProvider>
  );
}
