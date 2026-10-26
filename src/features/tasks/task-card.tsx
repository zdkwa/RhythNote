import {
  Archive,
  BookOpenCheck,
  CalendarDays,
  Check,
  Clock3,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  PlayCircle,
  Repeat2,
  TimerReset,
  Undo2,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { isTaskOverdue } from "@/domain/day";
import { withTimeout } from "@/lib/async";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  keys,
  useAddPause,
  useArchiveTask,
  useDeleteRecord,
  useRemovePause,
  useSetOnceCompletion,
  useUpsertRecord,
} from "@/data/queries";
import {
  InlineNote,
  type InlineNoteHandle,
} from "@/features/records/inline-note";
import { formatRuleSummary, probeTaskOccurrence } from "@/features/tasks/recurrence-rule";
import {
  reviewPlanLabel,
  reviewStageForDate,
  reviewStageLabel,
} from "@/domain/review";
import { TimeAdjustDialog } from "@/features/day/time-adjust-dialog";
import { dateLabel, shortDateLabel, timeRangeLabel, weekdayShort } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
  PRIORITY_LABEL,
  TYPE_LABEL,
  type Category,
  type DailyRecord,
  type OccurrenceWithStatus,
  type Priority,
  type Tag,
  type Task,
  type TaskWithStatus,
} from "@/types/domain";

type CardBadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "accent"
  | "done"
  | "backfill"
  | "archived";

interface StatusInfo {
  label: string;
  variant: CardBadgeVariant;
}

const PRIORITY_BADGE: Record<Priority, CardBadgeVariant> = {
  high: "destructive",
  medium: "accent",
  low: "outline",
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant={PRIORITY_BADGE[priority]}>
      {PRIORITY_LABEL[priority]}优先级
    </Badge>
  );
}

function TypeBadge({ type }: { type: Task["type"] }) {
  return (
    <Badge variant="secondary" className="gap-1">
      {type === "recurring" ? (
        <Repeat2 className="h-3 w-3" />
      ) : type === "review" ? (
        <BookOpenCheck className="h-3 w-3" />
      ) : (
        <TimerReset className="h-3 w-3" />
      )}
      {TYPE_LABEL[type]}
    </Badge>
  );
}

function CategoryChip({ category }: { category: Category | null }) {
  if (!category) {
    return <span className="text-[11px] text-muted-foreground">未分类</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        className="h-2 w-2 rounded-full ring-2 ring-black/5 dark:ring-white/10"
        style={{ backgroundColor: category.color }}
      />
      {category.name}
    </span>
  );
}

function TagChips({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-full border border-border/80 px-1.5 py-0.5 text-[10px] text-muted-foreground"
        >
          <span
            className="h-1 w-1 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          {tag.name}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: StatusInfo }) {
  return <Badge variant={status.variant}>{status.label}</Badge>;
}

function DefinitionStatusBadge({
  task,
  today,
  nowTime,
}: {
  task: TaskWithStatus;
  today: string;
  nowTime: string;
}) {
  if (task.archivedAt) {
    return <StatusBadge status={{ label: "已归档", variant: "archived" }} />;
  }
  if (task.type === "once") {
    if (task.completedAt) {
      return (
        <StatusBadge
          status={
            task.isBackfilled
              ? { label: "已补做", variant: "backfill" }
              : { label: "已完成", variant: "done" }
          }
        />
      );
    }
    return isTaskOverdue(task, task.taskDate, false, today, nowTime) ? (
      <StatusBadge status={{ label: "逾期", variant: "destructive" }} />
    ) : (
      <StatusBadge status={{ label: "未完成", variant: "outline" }} />
    );
  }

  const probe =
    task.type === "review"
      ? { occurs: reviewStageForDate(task, today) !== null, broken: false }
      : probeTaskOccurrence(task, today);
  if (probe.broken) {
    return (
      <StatusBadge status={{ label: "规则异常", variant: "destructive" }} />
    );
  }
  if (task.todayPaused) {
    return <StatusBadge status={{ label: "今日已暂停", variant: "secondary" }} />;
  }
  if (task.todayRecord?.status === "done") {
    return <StatusBadge status={{ label: "今天已完成", variant: "done" }} />;
  }
  const overdueToday = isTaskOverdue(task, today, false, today, nowTime);
  if (task.todayRecord?.status === "undone") {
    return (
      <StatusBadge
        status={
          overdueToday
            ? { label: "今天已逾期（有备注）", variant: "destructive" }
            : { label: "今天未完成（有备注）", variant: "outline" }
        }
      />
    );
  }
  if (probe.occurs) {
    return overdueToday ? (
      <StatusBadge status={{ label: "今天已逾期", variant: "destructive" }} />
    ) : (
      <StatusBadge status={{ label: "今天待完成", variant: "outline" }} />
    );
  }
  return <StatusBadge status={{ label: "今天无安排", variant: "outline" }} />;
}

interface DefinitionCardProps {
  variant: "definition";
  task: TaskWithStatus;
  today: string;
  nowTime: string;
  onEdit: (task: Task) => void;
}

interface OccurrenceCardProps {
  variant: "occurrence";
  item: OccurrenceWithStatus;
  today: string;
  nowTime: string;
  showDate?: boolean;
  onEdit: (task: Task) => void;
}

export type TaskCardProps = DefinitionCardProps | OccurrenceCardProps;

function CompleteToggle({
  done,
  disabled,
  disabledHint,
  busy,
  onToggle,
  label,
}: {
  done: boolean;
  disabled: boolean;
  disabledHint?: string;
  busy: boolean;
  onToggle: () => void;
  label: string;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      aria-pressed={done}
      disabled={disabled || busy}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        "mt-0.5 inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition-colors",
        done
          ? "border-destructive/35 bg-destructive/[0.06] text-destructive hover:bg-destructive/10"
          : label === "补做"
            ? "border-amber-500/50 bg-amber-500 text-white hover:bg-amber-600"
            : "border-emerald-600/50 bg-emerald-600 text-white hover:bg-emerald-700",
        (disabled || busy) && "cursor-not-allowed opacity-50",
      )}
    >
      {done ? (
        <Undo2 className="h-3 w-3" />
      ) : (
        <Check className="h-3 w-3" />
      )}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );

  if (!disabled || !disabledHint) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{disabledHint}</TooltipContent>
    </Tooltip>
  );
}

function ActionMenu({
  archived,
  onEdit,
  historyHref,
  pauseLabel,
  onPause,
  onResume,
  onAdjustTime,
  onArchive,
}: {
  archived: boolean;
  onEdit: () => void;
  historyHref: string;
  pauseLabel?: string;
  onPause?: () => void;
  onResume?: () => void;
  onAdjustTime?: () => void;
  onArchive: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="任务操作菜单"
          className="h-8 w-8 text-muted-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>任务操作</DropdownMenuLabel>
        <DropdownMenuItem disabled={archived} onSelect={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          编辑任务
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={historyHref}>
            <CalendarDays className="h-3.5 w-3.5" />
            查看当天
          </Link>
        </DropdownMenuItem>
        {pauseLabel && onPause ? (
          <DropdownMenuItem disabled={archived} onSelect={onPause}>
            <PauseCircle className="h-3.5 w-3.5" />
            {pauseLabel}
          </DropdownMenuItem>
        ) : null}
        {onResume ? (
          <DropdownMenuItem disabled={archived} onSelect={onResume}>
            <PlayCircle className="h-3.5 w-3.5" />
            取消暂停
          </DropdownMenuItem>
        ) : null}
        {onAdjustTime ? (
          <DropdownMenuItem disabled={archived} onSelect={onAdjustTime}>
            <Clock3 className="h-3.5 w-3.5" />
            调整本次时间
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={archived}
          onSelect={onArchive}
          className="text-destructive focus:text-destructive"
        >
          <Archive className="h-3.5 w-3.5" />
          归档任务
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DefinitionCard({ task, today, nowTime, onEdit }: DefinitionCardProps) {
  const queryClient = useQueryClient();
  const setOnceCompletion = useSetOnceCompletion();
  const archiveTask = useArchiveTask();
  const addPause = useAddPause();
  const removePause = useRemovePause();

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);

  const archived = Boolean(task.archivedAt);
  const completedOnce = task.type === "once" && Boolean(task.completedAt);
  const probe =
    task.type === "recurring"
      ? probeTaskOccurrence(task, today)
      : task.type === "review"
        ? { occurs: reviewStageForDate(task, today) !== null, broken: false }
        : { occurs: false, broken: false };
  const future = task.taskDate > today;
  const overdue = isTaskOverdue(
    task,
    task.taskDate,
    Boolean(task.completedAt),
    today,
    nowTime,
  );

  const canPauseToday =
    (task.type === "recurring" || task.type === "review") &&
    !archived &&
    probe.occurs &&
    !task.todayPaused &&
    !task.todayRecord;
  const canResumeToday =
    (task.type === "recurring" || task.type === "review") &&
    !archived &&
    task.todayPaused;

  const handleToggleOnce = async () => {
    if (task.type !== "once" || archived) return;
    try {
      if (task.completedAt) {
        await withTimeout(
          setOnceCompletion.mutateAsync({
            id: task.id,
            completed: false,
            isBackfilled: false,
          }),
          10_000,
          "操作超时，数据库可能被其他 RhythNote 实例占用；请关闭其他实例后重试。",
        );
        toast.success("已取消完成");
        return;
      }
      const backfilled = task.taskDate < today;
      await withTimeout(
        setOnceCompletion.mutateAsync({
          id: task.id,
          completed: true,
          isBackfilled: backfilled,
        }),
        10_000,
        "操作超时，数据库可能被其他 RhythNote 实例占用；请关闭其他实例后重试。",
      );
      toast.success(backfilled ? "已补做" : "已完成");
    } catch (cause) {
      setOnceCompletion.reset();
      void queryClient.invalidateQueries();
      toast.error(`操作失败：${errorMessage(cause, "请重试")}`);
    }
  };

  const handleArchive = async () => {
    try {
      await archiveTask.mutateAsync(task.id);
      toast.success("任务已归档，历史记录已保留");
      setArchiveOpen(false);
    } catch (cause) {
      toast.error(`归档失败：${errorMessage(cause, "请重试")}`);
    }
  };

  const handlePause = async () => {
    setPauseOpen(false);
    try {
      await withTimeout(
        addPause.mutateAsync({ taskId: task.id, pauseDate: today }),
        8_000,
        "暂停超时，数据库可能被其他 RhythNote 窗口占用；请关闭其他实例后重试。",
      );
      toast.success("今天已暂停，未写入每日记录");
    } catch (cause) {
      addPause.reset();
      toast.error(`暂停失败：${errorMessage(cause, "请先清除该日期记录")}`);
    }
  };

  const handleResume = async () => {
    try {
      await withTimeout(
        removePause.mutateAsync({ taskId: task.id, pauseDate: today }),
        8_000,
        "取消暂停超时，请关闭其他 RhythNote 实例后重试。",
      );
      toast.success("已取消暂停，今天恢复安排");
    } catch (cause) {
      removePause.reset();
      toast.error(`取消暂停失败：${errorMessage(cause, "请重试")}`);
    }
  };

  return (
    <article
      className="task-card rounded-xl px-4 py-3"
      data-completed={completedOnce ? "true" : "false"}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/35 text-muted-foreground">
          {task.type === "recurring" ? (
            <Repeat2 className="h-4 w-4" />
          ) : task.type === "review" ? (
            <BookOpenCheck className="h-4 w-4" />
          ) : (
            <CalendarDays className="h-4 w-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold">{task.title}</h3>
            <TypeBadge type={task.type} />
            {task.type === "once" ? (
              <PriorityBadge priority={task.priority} />
            ) : null}
            <DefinitionStatusBadge
              task={task}
              today={today}
              nowTime={nowTime}
            />
            {task.type === "once" && task.isBackfilled && task.completedAt ? (
              <Badge variant="backfill">补做</Badge>
            ) : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {task.type === "recurring"
                ? timeRangeLabel(task.startTime, task.endTime, "planned")
                : `${dateLabel(task.taskDate)} · ${timeRangeLabel(
                    task.startTime,
                    task.endTime,
                    task.timeSemantic,
                  )}`}
            </span>
            {task.type === "recurring" ? (
              <span className="inline-flex items-center gap-1">
                <Repeat2 className="h-3 w-3" />
                {formatRuleSummary(task.recurrenceRule)}
              </span>
            ) : task.type === "review" ? (
              <span className="inline-flex items-center gap-1">
                <BookOpenCheck className="h-3 w-3" />
                {reviewPlanLabel(task)}
              </span>
            ) : null}
            <CategoryChip category={task.category} />
          </div>

          {task.type === "recurring" || task.type === "review" ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {task.nextOccurrence
                ? `下次发生：${dateLabel(task.nextOccurrence)}`
                : task.type === "review"
                  ? "复习计划已结束（历史记录仍保留）"
                  : "系列已结束（历史记录仍保留）"}
            </p>
          ) : null}

          {task.description ? (
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
              {task.description}
            </p>
          ) : null}

          <div className="mt-1.5">
            <TagChips tags={task.tags} />
          </div>
        </div>

        {task.type === "once" ? (
          <CompleteToggle
            done={Boolean(task.completedAt)}
            disabled={archived || future}
            disabledHint={future ? "未来日期不可打卡" : undefined}
            busy={setOnceCompletion.isPending}
            onToggle={() => void handleToggleOnce()}
            label={task.completedAt ? "取消完成" : overdue ? "补做" : "完成"}
          />
        ) : null}

        <ActionMenu
          archived={archived}
          onEdit={() => onEdit(task)}
          historyHref={task.type === "once" ? `/day/${task.taskDate}` : "/tasks?scope=today"}
          pauseLabel={canPauseToday ? "暂停今天" : undefined}
          onPause={canPauseToday ? () => setPauseOpen(true) : undefined}
          onResume={canResumeToday ? () => void handleResume() : undefined}
          onArchive={() => setArchiveOpen(true)}
        />
      </div>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="归档任务？"
        description={
          <span>
            「{task.title}」会从全部任务、今天、本周、逾期与未来日历中隐藏，并停止产生新记录；
            已有历史记录、备注与标签关联全部保留。V1 归档后不可恢复。
          </span>
        }
        confirmLabel="归档任务"
        destructive
        onConfirm={() => void handleArchive()}
      />

      <ConfirmDialog
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        title="暂停今天？"
        description={
          <span>
            「{task.title}」将在 {dateLabel(today)} 暂停一次，只影响这一天，
            不修改循环规则，也不写入每日记录。
          </span>
        }
        confirmLabel="暂停今天"
        onConfirm={() => void handlePause()}
      />
    </article>
  );
}

function OccurrenceCard({
  item,
  today,
  nowTime,
  showDate = false,
  onEdit,
}: OccurrenceCardProps) {
  const { task, date, record, isPaused, isArchived } = item;
  const queryClient = useQueryClient();
  const setOnceCompletion = useSetOnceCompletion();
  const upsertRecord = useUpsertRecord();
  const deleteRecord = useDeleteRecord();
  const archiveTask = useArchiveTask();
  const addPause = useAddPause();
  const removePause = useRemovePause();
  const noteRef = useRef<InlineNoteHandle>(null);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [timeAdjustOpen, setTimeAdjustOpen] = useState(false);

  const latestRecord = (): DailyRecord | null => {
    const cached = queryClient.getQueryData<DailyRecord[]>(
      keys.records(date, date),
    );
    return (
      cached?.find(
        (item) => item.taskId === task.id && item.recordDate === date,
      ) ?? record
    );
  };

  const done =
    task.type === "once" ? Boolean(task.completedAt) : record?.status === "done";
  const backfilled =
    done && (task.type === "once" ? task.isBackfilled : Boolean(record?.isBackfilled));
  const future = date > today;
  const overdue = isTaskOverdue(task, date, done, today, nowTime);
  const busy =
    setOnceCompletion.isPending ||
    upsertRecord.isPending ||
    deleteRecord.isPending ||
    archiveTask.isPending ||
    addPause.isPending ||
    removePause.isPending;

  const status: StatusInfo = isArchived
    ? { label: "已归档", variant: "archived" }
    : isPaused
      ? { label: "已暂停", variant: "secondary" }
      : done
        ? backfilled
          ? { label: "已补做", variant: "backfill" }
          : { label: "已完成", variant: "done" }
        : overdue
          ? {
              label:
                record?.status === "undone" ? "逾期（有备注）" : "逾期",
              variant: "destructive",
            }
          : record?.status === "undone"
            ? { label: "未完成（有备注）", variant: "outline" }
            : { label: "未完成", variant: "outline" };

  const flushNote = async () => {
    await noteRef.current?.flush();
  };

  const handleComplete = async () => {
    if (future || isArchived || isPaused) return;
    const backfill = date < today;
    try {
      await flushNote();
      const current = latestRecord();
      if (task.type === "once") {
        await withTimeout(
          setOnceCompletion.mutateAsync({
            id: task.id,
            completed: true,
            isBackfilled: backfill,
          }),
          10_000,
          "操作超时，数据库可能被其他 RhythNote 实例占用；请关闭其他实例后重试。",
        );
      } else {
        await withTimeout(
          upsertRecord.mutateAsync({
            taskId: task.id,
            recordDate: date,
            status: "done",
            note: current?.note ?? null,
            isBackfilled: backfill,
            completedAt: new Date().toISOString(),
          }),
          10_000,
          "操作超时，数据库可能被其他 RhythNote 实例占用；请关闭其他实例后重试。",
        );
      }
      toast.success(backfill ? "已补做" : "已完成");
    } catch (cause) {
      setOnceCompletion.reset();
      upsertRecord.reset();
      void queryClient.invalidateQueries();
      toast.error(`完成失败：${errorMessage(cause, "请重试")}`);
    }
  };

  const handleUncomplete = async () => {
    if (isArchived) return;
    try {
      await flushNote();
      const current = latestRecord();
      if (task.type === "once") {
        await withTimeout(
          setOnceCompletion.mutateAsync({
            id: task.id,
            completed: false,
            isBackfilled: false,
          }),
          10_000,
          "操作超时，请关闭其他 RhythNote 实例后重试。",
        );
      } else if (current?.note) {
        // 有备注时保留记录，只把状态改回 undone。
        await withTimeout(
          upsertRecord.mutateAsync({
            taskId: task.id,
            recordDate: date,
            status: "undone",
            note: current.note,
            isBackfilled: false,
            completedAt: null,
          }),
          10_000,
          "操作超时，请关闭其他 RhythNote 实例后重试。",
        );
      } else {
        await withTimeout(
          deleteRecord.mutateAsync({ taskId: task.id, recordDate: date }),
          10_000,
          "操作超时，请关闭其他 RhythNote 实例后重试。",
        );
      }
      toast.success("已取消完成");
    } catch (cause) {
      setOnceCompletion.reset();
      upsertRecord.reset();
      deleteRecord.reset();
      void queryClient.invalidateQueries();
      toast.error(`取消失败：${errorMessage(cause, "请重试")}`);
    }
  };

  const handleArchive = async () => {
    try {
      await flushNote();
      await archiveTask.mutateAsync(task.id);
      toast.success("任务已归档，历史记录已保留");
      setArchiveOpen(false);
    } catch (cause) {
      toast.error(`归档失败：${errorMessage(cause, "请重试")}`);
    }
  };

  const handlePause = async () => {
    setPauseOpen(false);
    try {
      await flushNote();
      if (latestRecord()) {
        toast.error("该日期已有备注或完成记录，无法暂停");
        return;
      }
      await withTimeout(
        addPause.mutateAsync({ taskId: task.id, pauseDate: date }),
        8_000,
        "暂停超时，请关闭其他 RhythNote 实例后重试。",
      );
      toast.success("已暂停，该日期不再计入统计");
    } catch (cause) {
      addPause.reset();
      toast.error(`暂停失败：${errorMessage(cause, "该日期可能已有记录")}`);
    }
  };

  const handleResume = async () => {
    try {
      await withTimeout(
        removePause.mutateAsync({ taskId: task.id, pauseDate: date }),
        8_000,
        "取消暂停超时，请关闭其他 RhythNote 实例后重试。",
      );
      toast.success("已取消暂停");
    } catch (cause) {
      removePause.reset();
      toast.error(`取消暂停失败：${errorMessage(cause, "请重试")}`);
    }
  };

  const canPause =
    (task.type === "recurring" || task.type === "review") &&
    date >= today &&
    !isArchived &&
    !isPaused &&
    !record;

  return (
    <article
      className="task-card rounded-xl px-4 py-3"
      data-completed={done ? "true" : "false"}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold">{task.title}</h3>
            {showDate || date !== today ? (
              <Badge variant="outline" className="gap-1">
                <CalendarDays className="h-3 w-3" />
                {shortDateLabel(date)} {weekdayShort(date)}
              </Badge>
            ) : null}
            <TypeBadge type={task.type} />
            {task.type === "once" ? (
              <PriorityBadge priority={task.priority} />
            ) : null}
            {task.type === "review" && item.reviewStage != null ? (
              <Badge variant="accent" className="gap-1">
                <BookOpenCheck className="h-3 w-3" />
                {reviewStageLabel(
                  item.reviewStage,
                  task.reviewIntervals?.length ?? 0,
                )}
              </Badge>
            ) : null}
            <StatusBadge status={status} />
            {backfilled ? <Badge variant="backfill">补做</Badge> : null}
            {isArchived ? <Badge variant="archived">已归档</Badge> : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {timeRangeLabel(task.startTime, task.endTime, task.timeSemantic)}
            </span>
            {task.type === "recurring" ? (
              <span className="inline-flex items-center gap-1">
                <Repeat2 className="h-3 w-3" />
                {formatRuleSummary(task.recurrenceRule)}
              </span>
            ) : task.type === "review" ? (
              <span className="inline-flex items-center gap-1">
                <BookOpenCheck className="h-3 w-3" />
                {reviewPlanLabel(task)}
              </span>
            ) : null}
            <CategoryChip category={task.category} />
          </div>

          <div className="mt-1.5">
            <TagChips tags={task.tags} />
          </div>

        </div>

        <CompleteToggle
          done={done}
          disabled={future || isArchived || isPaused}
          disabledHint={
            isArchived
              ? "归档任务只读"
              : isPaused
                ? "该日期已暂停"
                : future
                  ? "未来日期不可打卡"
                  : undefined
          }
          busy={busy}
          onToggle={() => void (done ? handleUncomplete() : handleComplete())}
          label={done ? "取消完成" : overdue ? "补做" : "完成"}
        />

        <ActionMenu
          archived={isArchived}
          onEdit={() => onEdit(task)}
          historyHref={`/day/${date}`}
          pauseLabel={canPause ? (date === today ? "暂停今天" : "暂停本次") : undefined}
          onPause={canPause ? () => setPauseOpen(true) : undefined}
          onResume={isPaused && !isArchived ? () => void handleResume() : undefined}
          onAdjustTime={
            task.type === "review" && !isArchived
              ? () => setTimeAdjustOpen(true)
              : undefined
          }
          onArchive={() => setArchiveOpen(true)}
        />
      </div>

      {(task.type === "recurring" || task.type === "review") &&
      !isPaused &&
      !isArchived &&
      !future ? (
        <div className="mt-2">
          <InlineNote
            ref={noteRef}
            taskId={task.id}
            date={date}
            record={record}
            placeholder="添加当日备注…"
          />
        </div>
      ) : null}

      {task.type === "review" ? (
        <TimeAdjustDialog
          open={timeAdjustOpen}
          onOpenChange={setTimeAdjustOpen}
          task={task}
          date={date}
        />
      ) : null}

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="归档任务？"
        description={
          <span>
            「{task.title}」会从活跃视图中隐藏并停止产生新记录，历史记录与备注全部保留。
            V1 归档后不可恢复。
          </span>
        }
        confirmLabel="归档任务"
        destructive
        onConfirm={() => void handleArchive()}
      />

      <ConfirmDialog
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        title={date === today ? "暂停今天？" : "暂停本次？"}
        description={
          <span>
            「{task.title}」将在 {dateLabel(date)} 暂停一次，不修改循环规则，也不写入每日记录。
          </span>
        }
        confirmLabel={date === today ? "暂停今天" : "暂停本次"}
        onConfirm={() => void handlePause()}
      />
    </article>
  );
}

export function TaskCard(props: TaskCardProps) {
  if (props.variant === "definition") {
    return <DefinitionCard {...props} />;
  }
  return <OccurrenceCard {...props} />;
}
