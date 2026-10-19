import type {
  DailyRecord,
  DayItem,
  DaySummary,
  Task,
  TaskPause,
} from "@/types/domain";
import {
  PRIORITY_ORDER,
  type OccurrenceWithStatus,
  type TaskWithStatus,
} from "@/types/domain";
import { dateRange, timestampToDateKey } from "@/lib/date";
import { expandOccurrences, nextOccurrence } from "@/lib/recurrence";

export type CalendarState = "green" | "yellow" | "red" | "none";

interface BuildOptions {
  tasks: Task[];
  records: DailyRecord[];
  pauses: TaskPause[];
  start: string;
  end: string;
}

export function archiveDateOf(task: Task): string | null {
  return task.archivedAt ? timestampToDateKey(task.archivedAt) : null;
}

export function isTaskCompletedOnce(task: Task): boolean {
  return task.type === "once" && Boolean(task.completedAt);
}

export function isTaskVisibleInActiveList(task: Task): boolean {
  return !task.archivedAt;
}

export function calendarStateFromSummary(summary: DaySummary): CalendarState {
  if (summary.total === 0) return "none";
  if (summary.done >= summary.total) return "green";
  if (summary.done <= 0) return "red";
  return "yellow";
}

export function buildCalendarSummaries({
  tasks,
  records,
  pauses,
  start,
  end,
}: BuildOptions): Map<string, DaySummary> {
  const days = dateRange(start, end);
  const summaries = new Map<string, DaySummary>();
  for (const date of days) {
    summaries.set(date, {
      date,
      total: 0,
      done: 0,
      unfinished: 0,
      paused: 0,
      items: [],
    });
  }

  const recordsByKey = new Map<string, DailyRecord>();
  for (const record of records) {
    recordsByKey.set(`${record.taskId}|${record.recordDate}`, record);
  }
  const pauseKeys = new Set(
    pauses.map((pause) => `${pause.taskId}|${pause.pauseDate}`),
  );
  const scheduledKeys = new Set<string>();

  for (const task of tasks) {
    const archiveDate = archiveDateOf(task);
    let dates: string[] = [];
    try {
      dates =
        task.type === "once"
          ? [task.taskDate]
          : expandOccurrences(task, start, end);
    } catch {
      continue;
    }

    for (const date of dates) {
      if (date < start || date > end) continue;
      const key = `${task.id}|${date}`;
      const record = recordsByKey.get(key) ?? null;
      const isArchived = Boolean(task.archivedAt);
      if (
        archiveDate &&
        (date > archiveDate || (date === archiveDate && !record))
      ) {
        continue;
      }
      scheduledKeys.add(key);
      if (pauseKeys.has(key)) {
        const summary = summaries.get(date);
        if (summary) {
          summary.paused += 1;
          summary.items.push({
            key,
            kind: "scheduled",
            task,
            date,
            record,
            isPaused: true,
            isArchived,
            isBackfilled: false,
          });
        }
        continue;
      }

      const summary = summaries.get(date);
      if (!summary) continue;
      const isDone =
        task.type === "once"
          ? isTaskCompletedOnce(task)
          : record?.status === "done";
      const isBackfilled =
        task.type === "once" ? task.isBackfilled : Boolean(record?.isBackfilled);
      summary.total += 1;
      if (isDone) summary.done += 1;
      summary.items.push({
        key,
        kind: "scheduled",
        task,
        date,
        record,
        isPaused: false,
        isArchived,
        isBackfilled,
      });
    }
  }

  for (const record of records) {
    const task = tasks.find((item) => item.id === record.taskId);
    if (!task) continue;
    const key = `${task.id}|${record.recordDate}`;
    if (scheduledKeys.has(key)) continue;
    if (pauseKeys.has(key)) continue;
    const summary = summaries.get(record.recordDate);
    if (!summary) continue;
    const isDone = record.status === "done";
    summary.items.push({
      key,
      kind: isDone ? "orphan-done" : "orphan-note",
      task,
      date: record.recordDate,
      record,
      isPaused: false,
      isArchived: Boolean(task.archivedAt),
      isBackfilled: record.isBackfilled,
    });
    if (isDone) {
      summary.total += 1;
      summary.done += 1;
    }
  }

  for (const summary of summaries.values()) {
    summary.unfinished = Math.max(0, summary.total - summary.done);
  }

  return summaries;
}

export function buildDaySummary(
  date: string,
  tasks: Task[],
  records: DailyRecord[],
  pauses: TaskPause[],
): DaySummary {
  const map = buildCalendarSummaries({
    tasks,
    records,
    pauses,
    start: date,
    end: date,
  });
  return map.get(date) ?? {
    date,
    total: 0,
    done: 0,
    unfinished: 0,
    paused: 0,
    items: [],
  };
}

export function todayStatusForTask(
  task: Task,
  record: DailyRecord | null,
  paused: boolean,
): "done" | "undone" | "paused" | "none" {
  if (paused) return "paused";
  if (task.type === "once") return task.completedAt ? "done" : "none";
  if (record?.status === "done") return "done";
  if (record?.status === "undone") return "undone";
  return "none";
}

export function isTodayWithinBlock(
  task: Task,
  date: string,
  today: string,
  nowTime: string,
): boolean {
  if (date !== today) return false;
  if (task.timeSemantic !== "planned") return false;
  if (!task.startTime || !task.endTime) return false;
  return task.startTime <= nowTime && nowTime < task.endTime;
}

export function sortDayItems(
  items: DayItem[],
  today: string,
  nowTime: string,
): DayItem[] {
  return [...items].sort((a, b) => {
    const aDone =
      a.kind === "orphan-note"
        ? false
        : a.kind === "orphan-done"
          ? true
          : a.task.type === "once"
            ? Boolean(a.task.completedAt)
            : a.record?.status === "done";
    const bDone =
      b.kind === "orphan-note"
        ? false
        : b.kind === "orphan-done"
          ? true
          : b.task.type === "once"
            ? Boolean(b.task.completedAt)
            : b.record?.status === "done";
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (a.isPaused !== b.isPaused) return a.isPaused ? 1 : -1;
    const aCurrent = isTodayWithinBlock(a.task, a.date, today, nowTime);
    const bCurrent = isTodayWithinBlock(b.task, b.date, today, nowTime);
    if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
    const priority =
      PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority];
    if (priority !== 0) return priority;
    const aTime = a.task.startTime ?? a.task.endTime ?? "24:00";
    const bTime = b.task.startTime ?? b.task.endTime ?? "24:00";
    if (aTime !== bTime) return aTime.localeCompare(bTime);
    return a.task.createdAt.localeCompare(b.task.createdAt);
  });
}

export function sortOccurrences(
  items: OccurrenceWithStatus[],
  today: string,
  nowTime: string,
): OccurrenceWithStatus[] {
  return [...items].sort((a, b) => {
    const aDone =
      a.task.type === "once"
        ? Boolean(a.task.completedAt)
        : a.record?.status === "done";
    const bDone =
      b.task.type === "once"
        ? Boolean(b.task.completedAt)
        : b.record?.status === "done";
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (a.isPaused !== b.isPaused) return a.isPaused ? 1 : -1;
    const aCurrent = isTodayWithinBlock(a.task, a.date, today, nowTime);
    const bCurrent = isTodayWithinBlock(b.task, b.date, today, nowTime);
    if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
    const priority =
      PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority];
    if (priority !== 0) return priority;
    const aTime = a.task.startTime ?? a.task.endTime ?? "24:00";
    const bTime = b.task.startTime ?? b.task.endTime ?? "24:00";
    if (aTime !== bTime) return aTime.localeCompare(bTime);
    return a.task.createdAt.localeCompare(b.task.createdAt);
  });
}

export function sortOverdue(
  items: OccurrenceWithStatus[],
  nowTime: string,
): OccurrenceWithStatus[] {
  return [...items].sort((a, b) => {
    const priority =
      PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority];
    if (priority !== 0) return priority;
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    const aCurrent = isTodayWithinBlock(a.task, a.date, a.date, nowTime);
    const bCurrent = isTodayWithinBlock(b.task, b.date, b.date, nowTime);
    if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
    const aTime = a.task.startTime ?? a.task.endTime ?? "24:00";
    const bTime = b.task.startTime ?? b.task.endTime ?? "24:00";
    return aTime.localeCompare(bTime);
  });
}

export function sortDefinitions(tasks: TaskWithStatus[]): TaskWithStatus[] {
  return [...tasks].sort((a, b) => {
    const aDone = a.type === "once" && Boolean(a.completedAt);
    const bDone = b.type === "once" && Boolean(b.completedAt);
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (aDone && bDone) {
      return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
    }
    const priority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priority !== 0) return priority;
    if (a.taskDate !== b.taskDate) return a.taskDate.localeCompare(b.taskDate);
    const aTime = a.startTime ?? a.endTime ?? "24:00";
    const bTime = b.startTime ?? b.endTime ?? "24:00";
    if (aTime !== bTime) return aTime.localeCompare(bTime);
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function buildTaskWithStatus(
  task: Task,
  today: string,
  record: DailyRecord | null,
  paused: boolean,
): TaskWithStatus {
  let next: string | null = null;
  if (task.type === "recurring") {
    try {
      next = nextOccurrence(task, today);
    } catch {
      next = null;
    }
  }
  return {
    ...task,
    todayRecord: record,
    todayPaused: paused,
    nextOccurrence: next,
  };
}
