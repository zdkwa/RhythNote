import type { ReviewAnchor, Task } from "@/types/domain";
import { addDaysKey } from "@/lib/date";

export const REVIEW_INTERVALS_MAX = 30;
export const REVIEW_INTERVAL_MAX_DAYS = 3650;

export interface ReviewPreset {
  id: string;
  name: string;
  intervals: number[];
  description: string;
}

export const REVIEW_PRESETS: ReviewPreset[] = [
  {
    id: "standard",
    name: "艾宾浩斯标准",
    intervals: [1, 2, 4, 7, 15, 30],
    description: "6 次复习，适合日常单词和知识点。",
  },
  {
    id: "long",
    name: "长期记忆",
    intervals: [1, 2, 4, 7, 15, 30, 60, 120, 240],
    description: "9 次复习，适合长期备考和语言学习。",
  },
  {
    id: "short",
    name: "短期强化",
    intervals: [1, 2, 3, 5, 7],
    description: "5 次复习，适合考前集中记忆。",
  },
];

export interface ReviewDate {
  date: string;
  /** 0 = 首次学习，1..N = 第 N 次复习 */
  stage: number;
}

export function normalizeReviewIntervals(values: number[]): number[] {
  const normalized = [
    ...new Set(
      values
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.floor(value))
        .filter((value) => value >= 1 && value <= REVIEW_INTERVAL_MAX_DAYS),
    ),
  ].sort((a, b) => a - b);
  return normalized.slice(0, REVIEW_INTERVALS_MAX);
}

export function reviewIntervalsOf(task: Task): number[] {
  return normalizeReviewIntervals(task.reviewIntervals ?? []);
}

export function reviewAnchorOf(task: Task): ReviewAnchor {
  return task.reviewAnchor === "previous" ? "previous" : "initial";
}

export function reviewDatesFrom(
  taskDate: string,
  intervals: number[],
  anchor: ReviewAnchor = "initial",
): ReviewDate[] {
  const normalized = normalizeReviewIntervals(intervals);
  const result: ReviewDate[] = [{ date: taskDate, stage: 0 }];
  let previous = taskDate;
  normalized.forEach((interval, index) => {
    const next = addDaysKey(anchor === "previous" ? previous : taskDate, interval);
    previous = next;
    result.push({ date: next, stage: index + 1 });
  });
  return result;
}

export function reviewStageDates(
  task: Task,
  rangeStart?: string,
  rangeEnd?: string,
): ReviewDate[] {
  const intervals = reviewIntervalsOf(task);
  if (intervals.length === 0) return [];
  return reviewDatesFrom(task.taskDate, intervals, reviewAnchorOf(task)).filter(
    (item) =>
      (!rangeStart || item.date >= rangeStart) &&
      (!rangeEnd || item.date <= rangeEnd),
  );
}

export function expandReviewDates(
  task: Task,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  return reviewStageDates(task, rangeStart, rangeEnd).map((item) => item.date);
}

export function nextReviewOccurrence(
  task: Task,
  fromDate: string,
  includeFrom = true,
): string | null {
  const dates = reviewStageDates(task);
  const next = dates.find((item) =>
    includeFrom ? item.date >= fromDate : item.date > fromDate,
  );
  return next?.date ?? null;
}

export function reviewStageForDate(task: Task, date: string): number | null {
  const found = reviewStageDates(task).find((item) => item.date === date);
  return found ? found.stage : null;
}

export function reviewStageLabel(stage: number, totalReviews: number): string {
  if (stage <= 0) return "首次学习";
  return `第 ${stage}/${totalReviews} 次复习`;
}

export function reviewPlanLabel(task: Task): string {
  const intervals = reviewIntervalsOf(task);
  if (intervals.length === 0) return "未设置复习";
  const anchor = reviewAnchorOf(task) === "previous" ? "上次复习" : "首次学习";
  return `${anchor}后 ${intervals.join("、")} 天 · 共 ${intervals.length} 次`;
}
