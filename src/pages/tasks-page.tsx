import {
  AlertTriangle,
  CalendarDays,
  FolderKanban,
  ListTodo,
  Plus,
  Repeat2,
  TimerReset,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/page-header";
import { QuickFilter, useQuickFilter } from "@/components/layout/quick-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, usePauses, useWorkspaceBundle } from "@/data/queries";
import { useClock, useToday } from "@/hooks/useToday";
import { TaskCard } from "@/features/tasks/task-card";
import { TaskEditorDialog } from "@/features/tasks/task-editor-dialog";
import {
  addDaysKey,
  dateRange,
  nowTimeKey,
  shortDateLabel,
  weekRange,
  weekdayShort,
} from "@/lib/date";
import {
  buildTaskWithStatus,
  sortDefinitions,
  sortOccurrences,
  sortOverdue,
} from "@/domain/day";
import {
  collectOccurrences,
  collectOverdue,
  occurrenceDone,
} from "@/domain/occurrences";
import type {
  OccurrenceWithStatus,
  Task,
  TaskScope,
  TaskType,
  TaskWithStatus,
} from "@/types/domain";

const PAGE_SIZE = 100;

const SCOPE_DESCRIPTION: Record<TaskScope, string> = {
  all: "全部视图只展示任务定义，不展开无限发生实例。可按全部 / 今天 / 本周 / 逾期切换。",
  today: "今天发生的循环实例与今天的一次性任务；过去完成的项会自动记为补做。",
  week: "本周一至周日按日分组；过去日期可补做，未来日期只读。",
  overdue: "今天之前漏掉的任务。循环任务只回看最近 30 天，一次性任务回看全部历史。",
};

function CardListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function TasksPage({ fixedType }: { fixedType?: TaskType }) {
  const { categoryId } = useParams();
  const [scope, setScope] = useQuickFilter();
  const today = useToday();
  const clock = useClock(60_000);
  const nowTime = nowTimeKey(clock);

  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();

  const range = useMemo(() => {
    if (scope === "week") return weekRange(today);
    if (scope === "overdue") {
      return { start: addDaysKey(today, -30), end: today };
    }
    return { start: today, end: today };
  }, [scope, today]);

  const bundle = useWorkspaceBundle(range.start, range.end, false);
  const { data: pauses = [] } = usePauses(range.start, range.end);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const openCreate = useCallback(() => {
    setEditingTask(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setEditorOpen(true);
  }, []);

  const handleEditorOpenChange = useCallback((next: boolean) => {
    setEditorOpen(next);
    if (!next) setEditingTask(null);
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [scope, fixedType, categoryId]);

  const category = categoryId
    ? (categories.find((item) => item.id === categoryId) ?? null)
    : null;
  const categoryMissing = Boolean(categoryId) && !categoriesLoading && !category;

  const filteredTasks = useMemo(
    () =>
      bundle.tasks.filter((task) => {
        if (fixedType && task.type !== fixedType) return false;
        if (categoryId && task.categoryId !== categoryId) return false;
        return true;
      }),
    [bundle.tasks, fixedType, categoryId],
  );

  const recordByKey = useMemo(() => {
    const map = new Map<string, (typeof bundle.records)[number]>();
    for (const record of bundle.records) {
      map.set(`${record.taskId}|${record.recordDate}`, record);
    }
    return map;
  }, [bundle.records]);

  const pauseKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const pause of pauses) {
      set.add(`${pause.taskId}|${pause.pauseDate}`);
    }
    return set;
  }, [pauses]);

  const definitions = useMemo<TaskWithStatus[]>(() => {
    if (scope !== "all") return [];
    return sortDefinitions(
      filteredTasks.map((task) =>
        buildTaskWithStatus(
          task,
          today,
          recordByKey.get(`${task.id}|${today}`) ?? null,
          pauseKeySet.has(`${task.id}|${today}`),
        ),
      ),
    );
  }, [scope, filteredTasks, today, recordByKey, pauseKeySet]);

  const occurrences = useMemo<OccurrenceWithStatus[]>(() => {
    if (scope !== "today" && scope !== "week") return [];
    const items = collectOccurrences({
      tasks: filteredTasks,
      records: bundle.records,
      pauses,
      start: range.start,
      end: range.end,
    }).filter((item) => !item.isPaused);
    return sortOccurrences(items, today, nowTime);
  }, [
    scope,
    filteredTasks,
    bundle.records,
    pauses,
    range.start,
    range.end,
    today,
    nowTime,
  ]);

  const weekGroups = useMemo(() => {
    if (scope !== "week") return [];
    return dateRange(range.start, range.end).map((day) => ({
      day,
      items: occurrences.filter((item) => item.date === day),
    }));
  }, [scope, range.start, range.end, occurrences]);

  const overdue = useMemo<OccurrenceWithStatus[]>(() => {
    if (scope !== "overdue") return [];
    return sortOverdue(
      collectOverdue(
        filteredTasks,
        bundle.records,
        pauses,
        today,
        30,
        nowTime,
      ),
      nowTime,
    );
  }, [
    scope,
    filteredTasks,
    bundle.records,
    pauses,
    today,
    nowTime,
  ]);

  const title = category
    ? category.name
    : fixedType === "once"
      ? "临时任务"
      : fixedType === "recurring"
        ? "循环任务"
        : "全部任务";
  const eyebrow = category
    ? "Categories / Tasks"
    : fixedType === "once"
      ? "Tasks / Once"
      : fixedType === "recurring"
        ? "Tasks / Recurring"
        : "Tasks / Library";
  const description = category
    ? `分类「${category.name}」下的任务定义与发生实例；只显示未归档任务。`
    : SCOPE_DESCRIPTION[scope];

  const categoryTaskCount = categoryId
    ? bundle.tasks.filter((task) => task.categoryId === categoryId).length
    : 0;

  if (categoryMissing) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <PageHeader
          eyebrow="Categories / Tasks"
          title="分类不存在"
          description="该分类可能已被删除，或者链接中的分类 ID 无效。"
        />
        <EmptyState
          icon={FolderKanban}
          title="分类不存在或已删除"
          description="分类删除后，原来的任务会变为「未分类」，任务本身与历史记录都仍然保留。"
          action={
            <Button asChild>
              <Link to="/tasks">
                <ListTodo className="h-4 w-4" />
                返回全部任务
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const emptyAction = (
    <Button onClick={openCreate}>
      <Plus className="h-4 w-4" />
      新建任务
    </Button>
  );

  const renderEmpty = () => {
    if (fixedType === "once") {
      return (
        <EmptyState
          icon={TimerReset}
          title={category ? "这个分类下还没有临时任务" : "还没有临时任务"}
          description="临时任务只有一次安排，可设置计划时间段或截止时间。"
          action={emptyAction}
        />
      );
    }
    if (fixedType === "recurring") {
      return (
        <EmptyState
          icon={Repeat2}
          title={category ? "这个分类下还没有循环任务" : "还没有循环任务"}
          description="用规则描述重复，例如每个工作日 09:00–10:00；创建后不会预生成任何每日记录。"
          action={emptyAction}
        />
      );
    }
    if (scope === "today") {
      return (
        <EmptyState
          icon={CalendarDays}
          title="今天没有安排"
          description="今天发生的循环实例与今天的一次性任务会出现在这里。新建任务可以安排在今天。"
          action={emptyAction}
        />
      );
    }
    if (scope === "week") {
      return (
        <EmptyState
          icon={CalendarDays}
          title="本周没有安排"
          description="本周一至周日的发生实例会按日分组显示。去新建任务，给这一周安排一点节律。"
          action={emptyAction}
        />
      );
    }
    if (scope === "overdue") {
      return (
        <EmptyState
          icon={AlertTriangle}
          title="没有逾期任务"
          description="今天之前漏掉的循环实例（回看 30 天）与逾期未完成的一次性任务会出现在这里。"
          action={
            <Button variant="outline" asChild>
              <Link to="/tasks?scope=today">查看今天</Link>
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={ListTodo}
        title={category ? "这个分类下还没有任务" : "还没有任务"}
        description="创建第一条任务：用规则描述重复，用记录保存事实。所有数据只保存在本机。"
        action={emptyAction}
      />
    );
  };

  const renderBody = () => {
    if (bundle.isLoading) return <CardListSkeleton />;
    if (bundle.isError) {
      return (
        <div className="paper-panel rounded-2xl p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            任务数据加载失败
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            无法读取本地数据库中的任务、记录或暂停信息。请重试；任务数据不会因此丢失。
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => bundle.refetch()}
          >
            重新加载
          </Button>
        </div>
      );
    }

    if (scope === "all") {
      if (definitions.length === 0) return renderEmpty();
      const visible = definitions.slice(0, visibleCount);
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              任务定义 · {definitions.length} 条
            </p>
            <p className="text-[11px] text-muted-foreground">
              未完成优先 → 优先级 → 日期/时间
            </p>
          </div>
          <div className="stagger space-y-3">
            {visible.map((task) => (
              <TaskCard
                key={task.id}
                variant="definition"
                task={task}
                today={today}
                nowTime={nowTime}
                onEdit={openEdit}
              />
            ))}
          </div>
          {definitions.length > visibleCount ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                加载更多（剩余 {definitions.length - visibleCount} 条）
              </Button>
            </div>
          ) : null}
        </div>
      );
    }

    if (scope === "today") {
      if (occurrences.length === 0) return renderEmpty();
      const pending = occurrences.filter((item) => !occurrenceDone(item));
      const completed = occurrences.filter((item) => occurrenceDone(item));
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              今天 · 待完成 {pending.length} · 已完成 {completed.length}
            </p>
            <p className="text-[11px] text-muted-foreground">
              当前时间段任务置顶
            </p>
          </div>
          <div className="stagger space-y-3">
            {pending.map((item) => (
              <TaskCard
                key={`${item.task.id}|${item.date}`}
                variant="occurrence"
                item={item}
                today={today}
                nowTime={nowTime}
                onEdit={openEdit}
              />
            ))}
          </div>
          {completed.length > 0 ? (
            <>
              <p className="px-1 pt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                已完成 · {completed.length}
              </p>
              <div className="space-y-3 opacity-90">
                {completed.map((item) => (
                  <TaskCard
                    key={`${item.task.id}|${item.date}`}
                    variant="occurrence"
                    item={item}
                    today={today}
                    nowTime={nowTime}
                    onEdit={openEdit}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      );
    }

    if (scope === "week") {
      const total = weekGroups.reduce(
        (sum, group) => sum + group.items.length,
        0,
      );
      if (total === 0) return renderEmpty();
      return (
        <div className="space-y-5">
          {weekGroups.map((group) => (
            <section key={group.day} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-semibold">
                  {shortDateLabel(group.day)} · {weekdayShort(group.day)}
                </h2>
                {group.day === today ? (
                  <Badge variant="done">今天</Badge>
                ) : group.day < today ? (
                  <Badge variant="outline">过去 · 可补做</Badge>
                ) : (
                  <Badge variant="secondary">未来 · 只读</Badge>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {group.items.length} 项
                </span>
              </div>
              {group.items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/70 px-3 py-3 text-[11px] text-muted-foreground">
                  当天没有安排。
                </p>
              ) : (
                <div className="stagger space-y-3">
                  {group.items.map((item) => (
                    <TaskCard
                      key={`${item.task.id}|${item.date}`}
                      variant="occurrence"
                      item={item}
                      today={today}
                      nowTime={nowTime}
                      onEdit={openEdit}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      );
    }

    if (overdue.length === 0) return renderEmpty();
    const visibleOverdue = overdue.slice(0, visibleCount);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            逾期 · {overdue.length} 条
          </p>
          <p className="text-[11px] text-muted-foreground">
            循环回看 30 天 · 可补做
          </p>
        </div>
        <div className="stagger space-y-3">
          {visibleOverdue.map((item) => (
            <TaskCard
              key={`${item.task.id}|${item.date}`}
              variant="occurrence"
              item={item}
              today={today}
              nowTime={nowTime}
              showDate
              onEdit={openEdit}
            />
          ))}
        </div>
        {overdue.length > visibleCount ? (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              加载更多（剩余 {overdue.length - visibleCount} 条）
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={<QuickFilter value={scope} onChange={setScope} />}
      />

      {category ? (
        <div className="paper-panel flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
          <span
            className="h-3 w-3 rounded-full ring-2 ring-black/5 dark:ring-white/10"
            style={{ backgroundColor: category.color }}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold">分类：{category.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {categoryTaskCount} 个未归档任务 · 归档任务不在分类页展示
            </p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" asChild>
            <Link to="/settings/categories">
              <FolderKanban className="h-3.5 w-3.5" />
              管理分类
            </Link>
          </Button>
        </div>
      ) : null}

      {renderBody()}

      <TaskEditorDialog
        open={editorOpen}
        onOpenChange={handleEditorOpenChange}
        task={editingTask}
        defaultDate={today}
        defaultType={fixedType}
        defaultCategoryId={categoryId ?? null}
      />
    </div>
  );
}
