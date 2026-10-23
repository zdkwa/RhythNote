import { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Archive,
  BookOpenCheck,
  Check,
  Clock3,
  History,
  Info,
  Loader2,
  Lock,
  PauseCircle,
  Pencil,
  PlayCircle,
  Repeat2,
  TimerReset,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import type { DayItem, Task } from "@/types/domain";
import { PRIORITY_LABEL, TYPE_LABEL } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useArchiveTask } from "@/data/queries";
import {
  InlineNote,
  type InlineNoteHandle,
} from "@/features/records/inline-note";
import {
  isItemDone,
  itemCompletedAt,
  itemNote,
} from "@/features/day/day-items";
import {
  dateWithWeekday,
  shortDateLabel,
  timeRangeLabel,
  timestampToDateKey,
} from "@/lib/date";
import { isTaskOverdue } from "@/domain/day";
import {
  reviewPlanLabel,
  reviewStageForDate,
  reviewStageLabel,
} from "@/domain/review";
import { describeRecurrence } from "@/lib/recurrence";
import { TimeAdjustDialog } from "@/features/day/time-adjust-dialog";

export type DayCardMode = "active" | "paused" | "history";

export interface DayTaskCardProps {
  item: DayItem;
  today: string;
  nowTime: string;
  mode: DayCardMode;
  pendingKey: string | null;
  onToggleCompletion: (item: DayItem) => Promise<void>;
  onPause: (item: DayItem) => Promise<void>;
  onResume: (item: DayItem) => Promise<void>;
  onEdit: (task: Task) => void;
}

const PRIORITY_VARIANT = {
  high: "destructive",
  medium: "accent",
  low: "outline",
} as const;

function completionLabel(timestamp: string, date: string): string {
  try {
    const day = timestampToDateKey(timestamp);
    const time = format(parseISO(timestamp), "HH:mm");
    return day === date
      ? `完成于 ${time}`
      : `完成于 ${shortDateLabel(day)} ${time}`;
  } catch {
    return "已完成";
  }
}

export function DayTaskCard({
  item,
  today,
  nowTime,
  mode,
  pendingKey,
  onToggleCompletion,
  onPause,
  onResume,
  onEdit,
}: DayTaskCardProps) {
  const { task } = item;
  const date = item.date;
  const noteRef = useRef<InlineNoteHandle>(null);
  const archiveTask = useArchiveTask();
  const [pauseOpen, setPauseOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [timeAdjustOpen, setTimeAdjustOpen] = useState(false);

  const isArchived = item.isArchived || Boolean(task.archivedAt);
  const isFuture = date > today;
  const done = isItemDone(item);
  const isOverdue =
    !item.isPaused && isTaskOverdue(task, date, done, today, nowTime);
  const isHistory = mode === "history";
  const completedAt = itemCompletedAt(item);
  const note = itemNote(item);
  const busy = pendingKey !== null || archiveTask.isPending;

  const toggleKey = `toggle:${task.id}:${date}`;
  const pauseKey = `pause:${task.id}:${date}`;
  const resumeKey = `resume:${task.id}:${date}`;
  const togglePending = pendingKey === toggleKey;
  const pausePending = pendingKey === pauseKey;
  const resumePending = pendingKey === resumeKey;

  const canPause =
    mode === "active" &&
    (task.type === "recurring" || task.type === "review") &&
    !isArchived &&
    !done &&
    !item.record &&
    date >= today;

  const showInlineNote =
    (task.type === "recurring" || task.type === "review") &&
    mode === "active" &&
    !isArchived &&
    item.kind === "scheduled";
  const reviewStage =
    task.type === "review" ? reviewStageForDate(task, date) : null;
  const canAdjustTime =
    task.type === "review" &&
    mode === "active" &&
    !isArchived &&
    !isHistory;

  const handleToggle = async () => {
    await noteRef.current?.flush();
    await onToggleCompletion(item);
  };

  const handleConfirmPause = async () => {
    await onPause(item);
    setPauseOpen(false);
  };

  const handleArchive = async () => {
    try {
      await noteRef.current?.flush();
      await archiveTask.mutateAsync(task.id);
      toast.success("任务已归档，历史记录已保留");
      setArchiveOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? `归档失败：${error.message}` : "归档失败，请重试",
      );
    }
  };

  const hint = isArchived
    ? "归档任务只读：历史记录已保留，但不能打卡、补做、暂停或写备注。"
    : isHistory
      ? item.kind === "orphan-note"
        ? "规则修改后遗留的历史备注，只读展示，不计入未完成。"
        : "历史完成记录：保留展示，并计入当天完成数与总数。"
      : mode === "paused"
        ? "暂停只影响这一天，不修改循环规则；取消暂停后恢复正常实例。"
        : null;

  return (
    <article
      className="task-card rounded-xl p-4"
      data-completed={mode === "active" && done ? "true" : "false"}
      aria-label={`${task.title}${done ? "，已完成" : ""}${isArchived ? "，已归档" : ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="mr-1 min-w-0 text-sm font-semibold leading-6 text-foreground">
              {task.title}
            </h3>
            {task.type === "recurring" ? (
              <Badge variant="secondary" className="gap-1">
                <Repeat2 className="h-3 w-3" />
                {TYPE_LABEL[task.type]}
              </Badge>
            ) : task.type === "review" ? (
              <Badge variant="secondary" className="gap-1">
                <BookOpenCheck className="h-3 w-3" />
                {TYPE_LABEL[task.type]}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <TimerReset className="h-3 w-3" />
                {TYPE_LABEL[task.type]}
              </Badge>
            )}
            {task.type === "review" && reviewStage != null ? (
              <Badge variant="accent">
                {reviewStageLabel(reviewStage, task.reviewIntervals?.length ?? 0)}
              </Badge>
            ) : null}
            {task.type === "once" ? (
              <Badge variant={PRIORITY_VARIANT[task.priority]}>
                {PRIORITY_LABEL[task.priority]}
              </Badge>
            ) : null}
            {done ? <Badge variant="done">已完成</Badge> : null}
            {!done && isOverdue ? (
              <Badge variant="destructive">逾期</Badge>
            ) : null}
            {item.isBackfilled ? <Badge variant="backfill">补做</Badge> : null}
            {isArchived ? (
              <Badge variant="archived" className="gap-1">
                <Archive className="h-3 w-3" />
                已归档
              </Badge>
            ) : null}
            {isHistory ? (
              <Badge variant="outline" className="gap-1">
                <History className="h-3 w-3" />
                历史记录
              </Badge>
            ) : null}
            {mode === "paused" ? (
              <Badge variant="secondary" className="gap-1">
                <PauseCircle className="h-3 w-3" />
                已暂停
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {task.category ? (
              <span className="inline-flex items-center gap-1">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: task.category.color }}
                />
                {task.category.name}
              </span>
            ) : null}
            <span className="tabular-nums">
              {timeRangeLabel(task.startTime, task.endTime, task.timeSemantic)}
            </span>
            {task.type === "recurring" ? (
              <span className="inline-flex items-center gap-1">
                <Repeat2 aria-hidden="true" className="h-3 w-3" />
                {describeRecurrence(task.recurrenceRule)}
              </span>
            ) : task.type === "review" ? (
              <span className="inline-flex items-center gap-1">
                <BookOpenCheck aria-hidden="true" className="h-3 w-3" />
                {reviewPlanLabel(task)}
              </span>
            ) : null}
            {done && completedAt ? (
              <span className="tabular-nums">
                {completionLabel(completedAt, date)}
              </span>
            ) : null}
            {isArchived && task.archivedAt ? (
              <span className="inline-flex items-center gap-1">
                <Archive aria-hidden="true" className="h-3 w-3" />
                归档于 {shortDateLabel(timestampToDateKey(task.archivedAt))}
              </span>
            ) : null}
          </div>

          {task.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {mode === "paused" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void onResume(item);
              }}
              disabled={isArchived || busy}
              title={isArchived ? "归档任务只读" : "取消暂停"}
              className="gap-1.5"
            >
              {resumePending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" />
              )}
              取消暂停
            </Button>
          ) : null}

          {mode === "active" && !isArchived ? (
            <>
              {done ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void handleToggle();
                  }}
                  disabled={busy}
                  className="gap-1.5 border-destructive/35 bg-destructive/[0.04] text-destructive hover:bg-destructive/10"
                >
                  {togglePending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Undo2 className="h-3.5 w-3.5" />
                  )}
                  取消完成
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    void handleToggle();
                  }}
                  disabled={isFuture || busy}
                  title={isFuture ? "未来日期不可打卡" : undefined}
                  className={`gap-1.5 border-transparent text-white ${
                    isOverdue
                      ? "bg-amber-500 hover:bg-amber-600"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {togglePending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {isOverdue ? "补做" : "完成"}
                </Button>
              )}

              {canPause ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPauseOpen(true)}
                  disabled={busy}
                  className="gap-1.5"
                >
                  {pausePending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PauseCircle className="h-3.5 w-3.5" />
                  )}
                  暂停本次
                </Button>
              ) : null}

              {canAdjustTime ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setTimeAdjustOpen(true)}
                  disabled={busy}
                  aria-label={`调整复习时间：${task.title}`}
                  title="调整复习时间"
                >
                  <Clock3 className="h-4 w-4" />
                </Button>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onEdit(task)}
                disabled={busy}
                aria-label={`编辑任务：${task.title}`}
                title="编辑任务"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setArchiveOpen(true)}
                disabled={busy}
                aria-label={`归档任务：${task.title}`}
                title="归档任务"
              >
                {archiveTask.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {showInlineNote ? (
        <InlineNote
          ref={noteRef}
          taskId={task.id}
          date={date}
          record={item.record}
          disabled={isFuture}
          disabledReason="未来日期不可写备注"
        />
      ) : null}

      {!showInlineNote && note ? (
        <p className="mt-3 whitespace-pre-wrap border-l-2 border-border/70 pl-3 text-xs leading-6 text-muted-foreground">
          {note}
        </p>
      ) : null}

      {hint ? (
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
          {isArchived || mode === "history" ? (
            <Archive aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
          ) : (
            <Info aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
          )}
          {hint}
        </p>
      ) : null}

      {isFuture && mode === "active" && !isArchived ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock aria-hidden="true" className="h-3 w-3 shrink-0" />
          未来日期不可打卡、不可写备注；可提前暂停本次。
        </p>
      ) : null}

      <ConfirmDialog
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        title="暂停本次"
        description={
          <span className="space-y-2">
            <span className="block">
              确认暂停「{task.title}」在 {dateWithWeekday(date)} 的发生实例吗？
            </span>
            <span className="block">
              暂停后这一天会从日历与统计中消失，不会写入任何每日记录；循环规则保持不变。
            </span>
          </span>
        }
        confirmLabel="暂停本次"
        onConfirm={handleConfirmPause}
      />

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
            「{task.title}」会从全部任务、今天、本周、逾期与未来日历中隐藏，
            并停止产生新记录；已有历史记录、备注与标签关联全部保留。V1 归档后不可恢复。
          </span>
        }
        confirmLabel="归档任务"
        destructive
        onConfirm={handleArchive}
      />
    </article>
  );
}
