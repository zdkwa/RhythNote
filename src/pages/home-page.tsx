import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/page-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWorkspaceBundle } from "@/data/queries";
import { useToday } from "@/hooks/useToday";
import { buildCalendarSummaries } from "@/domain/day";
import {
  addMonthsKey,
  isValidMonthKey,
  monthGridRange,
  parseDateKey,
  toMonthKey,
} from "@/lib/date";
import { CalendarLegend } from "@/features/calendar/calendar-legend";
import { CalendarSkeleton } from "@/features/calendar/calendar-skeleton";
import { MonthCalendar } from "@/features/calendar/month-calendar";
import { MonthToolbar } from "@/features/calendar/month-toolbar";
import { toTaskPauses } from "@/features/records/pause-utils";
import { QueryErrorBar } from "@/features/records/query-error-bar";

export function HomePage() {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const currentMonthKey = toMonthKey(parseDateKey(today));

  const rawMonth = params.get("month");
  const monthKey = isValidMonthKey(rawMonth) ? rawMonth : currentMonthKey;

  // 非法 month 参数回退到当前月，并把 URL 规范化为合法值。
  useEffect(() => {
    if (rawMonth === null || isValidMonthKey(rawMonth)) return;
    const updated = new URLSearchParams(params);
    updated.set("month", currentMonthKey);
    setParams(updated, { replace: true });
  }, [rawMonth, currentMonthKey, params, setParams]);

  const grid = useMemo(() => monthGridRange(monthKey), [monthKey]);
  const bundle = useWorkspaceBundle(grid.start, grid.end, true);
  const pauses = useMemo(() => toTaskPauses(bundle.pauses), [bundle.pauses]);
  const summaries = useMemo(
    () =>
      buildCalendarSummaries({
        tasks: bundle.tasks,
        records: bundle.records,
        pauses,
        start: grid.start,
        end: grid.end,
      }),
    [bundle.tasks, bundle.records, pauses, grid.start, grid.end],
  );

  const goToMonth = (nextMonth: string) => {
    const updated = new URLSearchParams(params);
    updated.set("month", nextMonth);
    setParams(updated, { replace: true });
  };

  const hasData =
    bundle.tasks.length > 0 ||
    bundle.records.length > 0 ||
    bundle.pauses.length > 0;
  const showSkeleton = bundle.isLoading || (bundle.isError && !hasData);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-1 flex-col gap-5">
        <PageHeader
          eyebrow="Calendar / Month"
          title="节律月历"
          description="每天完成多少、漏掉多少，一眼看清。点击日期进入当天安排；月历只读，不会生成任何记录。"
          actions={
            <MonthToolbar
              monthKey={monthKey}
              isCurrentMonth={monthKey === currentMonthKey}
              onPrevMonth={() => goToMonth(addMonthsKey(monthKey, -1))}
              onNextMonth={() => goToMonth(addMonthsKey(monthKey, 1))}
              onToday={() => goToMonth(currentMonthKey)}
            />
          }
        />

        {bundle.isError ? (
          <QueryErrorBar
            message="月历数据加载失败，已保留页面结构，请重试。"
            onRetry={bundle.refetch}
          />
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            周一开始 · 固定 6 行视图 · 外月日期淡化但仍可点击
          </p>
          <CalendarLegend />
        </div>

        {showSkeleton ? (
          <CalendarSkeleton />
        ) : (
          <MonthCalendar
            days={grid.days}
            monthKey={monthKey}
            today={today}
            summaries={summaries}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
