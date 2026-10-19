import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CalendarX2,
  ChevronLeft,
  Clock3,
  Plus,
} from "lucide-react";
import type { Task } from "@/types/domain";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useWorkspaceBundle } from "@/data/queries";
import { buildDaySummary } from "@/domain/day";
import { useClock, useToday } from "@/hooks/useToday";
import {
  dateWithWeekday,
  isValidDateKey,
  nowTimeKey,
  shortDateLabel,
} from "@/lib/date";
import { DayProgressSummary } from "@/features/day/day-progress-summary";
import { DaySection } from "@/features/day/day-section";
import { DaySkeleton } from "@/features/day/day-skeleton";
import { DayTaskCard } from "@/features/day/day-task-card";
import { groupDayItems } from "@/features/day/day-items";
import { useDayActions } from "@/features/day/use-day-actions";
import { toTaskPauses } from "@/features/records/pause-utils";
import { QueryErrorBar } from "@/features/records/query-error-bar";

export interface DayPageProps {
  /** 由 Lead 在 TaskEditorDialog 就绪后注入；未注入时回退到任务页链接。 */
  onCreateTask?: (date: string) => void;
  /** 同上，编辑任务入口。 */
  onEditTask?: (task: Task) => void;
}

export function DayPage({ onCreateTask, onEditTask }: DayPageProps) {
  const { date = "" } = useParams<{ date: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const today = useToday();
  const clock = useClock(30_000);
  const nowTime = nowTimeKey(clock);
  const valid = isValidDateKey(date);

  const bundle = useWorkspaceBundle(
    valid ? date : "",
    valid ? date : "",
    valid,
  );
  const pauses = useMemo(() => toTaskPauses(bundle.pauses), [bundle.pauses]);
  const summary = useMemo(
    () =>
      valid
        ? buildDaySummary(date, bundle.tasks, bundle.records, pauses)
        : null,
    [valid, date, bundle.tasks, bundle.records, pauses],
  );
  const groups = useMemo(
    () =>
      summary
        ? groupDayItems(summary.items, today, nowTime)
        : { unfinished: [], completed: [], paused: [], history: [] },
    [summary, today, clock],
  );
  const actions = useDayActions(valid ? date : "");

  const previousTodayRef = useRef(today);
  const [midnightNotice, setMidnightNotice] = useState(false);
  useEffect(() => {
    if (previousTodayRef.current !== today) {
      previousTodayRef.current = today;
      setMidnightNotice(true);
    }
  }, [today]);

  const goBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  };

  const openCreate = () => {
    if (onCreateTask) onCreateTask(date);
    else navigate(`/tasks?new=1&date=${encodeURIComponent(date)}`);
  };

  const openEdit = (task: Task) => {
    if (onEditTask) onEditTask(task);
    else navigate(`/tasks?edit=${encodeURIComponent(task.id)}`);
  };

  if (!valid) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <PageHeader
          eyebrow="Day / Detail"
          title="日期不存在"
          description="地址中的日期格式错误，或不是真实存在的日期。"
        />
        <EmptyState
          icon={CalendarX2}
          title="无法识别这个日期"
          description="日期必须是真实存在的 YYYY-MM-DD，例如 2026-10-19。"
          action={
            <Button asChild>
              <Link to="/">
                <ChevronLeft className="h-4 w-4" />
                返回日历
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const isToday = date === today;
  const isFuture = date > today;
  const historyTotal = summary
    ? summary.items.filter(
        (item) =>
          item.kind === "orphan-done" || item.kind === "orphan-note",
      ).length
    : 0;
  const isEmpty =
    !summary ||
    (summary.total === 0 &&
      summary.paused === 0 &&
      historyTotal === 0 &&
      groups.completed.length === 0);
  const hasData =
    bundle.tasks.length > 0 ||
    bundle.records.length > 0 ||
    bundle.pauses.length > 0;
  const showSkeleton = bundle.isLoading || (bundle.isError && !hasData);

  const description = isToday
    ? "今天的安排。完成、补写当日备注，或提前暂停某一次循环任务。"
    : isFuture
      ? "未来日期：可以查看并暂停发生实例，但不能打卡或写备注。"
      : "过去日期：完成会自动记为补做，也可以补写当日备注。";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="-ml-2 gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            返回日历
          </Button>
          {isToday ? <Badge variant="outline">今天</Badge> : null}
          {isFuture ? <Badge variant="outline">未来</Badge> : null}
          {midnightNotice && !isToday ? (
            <Badge variant="accent">已跨天</Badge>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">
          月历 · {shortDateLabel(date)}
        </p>
      </div>

      <PageHeader
        eyebrow="Day / Detail"
        title={dateWithWeekday(date)}
        description={description}
      />

      {midnightNotice && !isToday ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/[0.08] px-4 py-2.5 text-xs text-accent"
        >
          <span className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5 shrink-0" />
            已跨天，当前是 {dateWithWeekday(today)}；本页仍停留在{" "}
            {shortDateLabel(date)}。
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/day/${today}`)}
          >
            回到今天
          </Button>
        </div>
      ) : null}

      {bundle.isError ? (
        <QueryErrorBar
          message="当天数据加载失败，已保留页面结构，请重试。"
          onRetry={bundle.refetch}
        />
      ) : null}

      {showSkeleton || !summary ? (
        <DaySkeleton />
      ) : (
        <div className="space-y-7">
          <DayProgressSummary
            summary={summary}
            historyCount={historyTotal}
            isFuture={isFuture}
          />

          {isEmpty ? (
            <EmptyState
              icon={CalendarDays}
              title={isToday ? "今天没有安排" : "这一天没有安排"}
              description={
                isFuture
                  ? "给未来留一点余地：新建一个任务，或提前安排。"
                  : "新建一个任务，从一件小事开始。"
              }
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={openCreate}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  新建任务
                </Button>
              }
            />
          ) : (
            <>
              <DaySection
                title="未完成"
                count={groups.unfinished.length}
                description="当天安排但还没有完成"
                emptyHint="没有未完成项，今天可以松一口气。"
              >
                {groups.unfinished.map((item) => (
                  <DayTaskCard
                    key={item.key}
                    item={item}
                    today={today}
                    nowTime={nowTime}
                    mode="active"
                    pendingKey={actions.pendingKey}
                    onToggleCompletion={actions.toggleCompletion}
                    onPause={actions.pauseOccurrence}
                    onResume={actions.resumeOccurrence}
                    onEdit={openEdit}
                  />
                ))}
              </DaySection>

              {groups.completed.length > 0 ? (
                <DaySection
                  title="已完成"
                  count={groups.completed.length}
                  description="按完成时间倒序"
                >
                  {groups.completed.map((item) => (
                    <DayTaskCard
                      key={item.key}
                      item={item}
                      today={today}
                      nowTime={nowTime}
                      mode={item.kind === "scheduled" ? "active" : "history"}
                      pendingKey={actions.pendingKey}
                      onToggleCompletion={actions.toggleCompletion}
                      onPause={actions.pauseOccurrence}
                      onResume={actions.resumeOccurrence}
                      onEdit={openEdit}
                    />
                  ))}
                </DaySection>
              ) : null}

              {groups.paused.length > 0 ? (
                <DaySection
                  title="已暂停"
                  count={groups.paused.length}
                  description="暂停日期从完成统计中排除"
                  collapsible
                >
                  {groups.paused.map((item) => (
                    <DayTaskCard
                      key={item.key}
                      item={item}
                      today={today}
                      nowTime={nowTime}
                      mode="paused"
                      pendingKey={actions.pendingKey}
                      onToggleCompletion={actions.toggleCompletion}
                      onPause={actions.pauseOccurrence}
                      onResume={actions.resumeOccurrence}
                      onEdit={openEdit}
                    />
                  ))}
                </DaySection>
              ) : null}

              {groups.history.length > 0 ? (
                <DaySection
                  title="历史记录"
                  count={groups.history.length}
                  description="规则修改后保留的孤儿记录，只读"
                >
                  {groups.history.map((item) => (
                    <DayTaskCard
                      key={item.key}
                      item={item}
                      today={today}
                      nowTime={nowTime}
                      mode="history"
                      pendingKey={actions.pendingKey}
                      onToggleCompletion={actions.toggleCompletion}
                      onPause={actions.pauseOccurrence}
                      onResume={actions.resumeOccurrence}
                      onEdit={openEdit}
                    />
                  ))}
                </DaySection>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
