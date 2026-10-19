import type { DaySummary } from "@/types/domain";
import { parseDateKey } from "@/lib/date";

/** 周一开始的固定表头，与 PRD 3.5.1 一致。 */
export const WEEKDAY_HEADERS = [
  "周一",
  "周二",
  "周三",
  "周四",
  "周五",
  "周六",
  "周日",
] as const;

export function emptyDaySummary(date: string): DaySummary {
  return { date, total: 0, done: 0, unfinished: 0, paused: 0, items: [] };
}

/** 当天遗留的孤儿记录数量（规则修改后仍保留的历史记录）。 */
export function historyCountOf(summary: DaySummary): number {
  return summary.items.filter(
    (item) => item.kind === "orphan-done" || item.kind === "orphan-note",
  ).length;
}

export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}

/** 日期格显示的数字。只从本地日期字符串解析，不做 UTC 转换。 */
export function dayOfMonth(date: string): number {
  return parseDateKey(date).getDate();
}
