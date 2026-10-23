import type {
  DailyRecord,
  OccurrenceWithStatus,
  Task,
  TaskPause,
} from "@/types/domain";
import {
  addDaysKey,
  nowTimeKey,
  timestampToDateKey,
} from "@/lib/date";
import { expandOccurrences } from "@/lib/recurrence";
import { expandReviewDates, reviewStageForDate } from "@/domain/review";
import {
  taskAtDate,
  type TimeOverrideMap,
} from "@/domain/time-overrides";

interface CollectInput {
  tasks: Task[];
  records: DailyRecord[];
  pauses: TaskPause[];
  start: string;
  end: string;
  overrides?: TimeOverrideMap;
}

export function collectOccurrences({
  tasks,
  records,
  pauses,
  start,
  end,
  overrides,
}: CollectInput): OccurrenceWithStatus[] {
  const recordsByKey = new Map<string, DailyRecord>();
  for (const record of records) {
    recordsByKey.set(`${record.taskId}|${record.recordDate}`, record);
  }
  const pauseKeys = new Set(
    pauses.map((pause) => `${pause.taskId}|${pause.pauseDate}`),
  );
  const items: OccurrenceWithStatus[] = [];

  for (const task of tasks) {
    if (task.archivedAt) continue;
    if (task.type === "once") {
      if (task.taskDate < start || task.taskDate > end) continue;
      const record = recordsByKey.get(`${task.id}|${task.taskDate}`) ?? null;
      items.push({
        task: taskAtDate(task, task.taskDate, overrides),
        date: task.taskDate,
        record,
        isBackfilled: task.isBackfilled,
        isPaused: pauseKeys.has(`${task.id}|${task.taskDate}`),
        isArchived: false,
      });
      continue;
    }
    let dates: string[] = [];
    try {
      dates =
        task.type === "review"
          ? expandReviewDates(task, start, end)
          : expandOccurrences(task, start, end);
    } catch {
      continue;
    }
    const createdDate = timestampToDateKey(task.createdAt);
    for (const date of dates) {
      if (date < createdDate) continue;
      const key = `${task.id}|${date}`;
      const record = recordsByKey.get(key) ?? null;
      items.push({
        task: taskAtDate(task, date, overrides),
        date,
        record,
        isBackfilled: Boolean(record?.isBackfilled),
        isPaused: pauseKeys.has(key),
        isArchived: false,
        reviewStage:
          task.type === "review" ? reviewStageForDate(task, date) : null,
      });
    }
  }

  return items;
}

export function collectOverdue(
  tasks: Task[],
  records: DailyRecord[],
  pauses: TaskPause[],
  today: string,
  lookbackDays = 30,
  currentTime = nowTimeKey(),
  overrides?: TimeOverrideMap,
): OccurrenceWithStatus[] {
  const start = addDaysKey(today, -lookbackDays);
  const daily = collectOccurrences({
    tasks,
    records,
    pauses,
    start,
    end: today,
    overrides,
  });
  const activeRecurring = daily.filter((item) => {
    if (item.task.type !== "recurring" && item.task.type !== "review") {
      return false;
    }
    if (item.isPaused) return false;
    if (item.record?.status === "done") return false;
    return item.date < today;
  });

  const once = tasks
    .filter((task) => {
      if (task.type !== "once" || task.archivedAt || task.completedAt) {
        return false;
      }
      if (task.taskDate < today) return true;
      return (
        task.taskDate === today &&
        task.timeSemantic === "deadline" &&
        Boolean(task.endTime) &&
        currentTime > (task.endTime ?? "24:00")
      );
    })
    .map<OccurrenceWithStatus>((task) => ({
      task,
      date: task.taskDate,
      record: null,
      isBackfilled: false,
      isPaused: false,
      isArchived: false,
    }));

  return [...activeRecurring, ...once];
}

export function occurrenceDone(item: OccurrenceWithStatus): boolean {
  if (item.task.type === "once") return Boolean(item.task.completedAt);
  return item.record?.status === "done";
}
