import type { DayItem } from "@/types/domain";
import { sortDayItems } from "@/domain/day";

export function isItemDone(item: DayItem): boolean {
  if (item.kind === "orphan-done") return true;
  if (item.kind === "orphan-note") return false;
  if (item.task.type === "once") return Boolean(item.task.completedAt);
  return item.record?.status === "done";
}

export function itemCompletedAt(item: DayItem): string | null {
  if (item.task.type === "once") return item.task.completedAt;
  return item.record?.completedAt ?? null;
}

export function itemNote(item: DayItem): string | null {
  return item.record?.note ?? null;
}

export interface DayGroups {
  unfinished: DayItem[];
  completed: DayItem[];
  paused: DayItem[];
  history: DayItem[];
}

/**
 * 按 PRD 3.6.1 分区：
 * - 未完成：当天发生但未完成的实例 + 未完成的一次性任务
 * - 已完成：已完成项（含历史孤儿 done），按完成时间倒序
 * - 已暂停：当天被暂停的循环任务
 * - 历史记录：规则修改后遗留的 undone 孤儿记录，只读
 */
export function groupDayItems(
  items: DayItem[],
  today: string,
  nowTime: string,
): DayGroups {
  const sorted = sortDayItems(items, today, nowTime);
  const unfinished: DayItem[] = [];
  const completed: DayItem[] = [];
  const paused: DayItem[] = [];
  const history: DayItem[] = [];

  for (const item of sorted) {
    if (item.isPaused) {
      paused.push(item);
    } else if (item.kind === "orphan-note") {
      history.push(item);
    } else if (isItemDone(item)) {
      completed.push(item);
    } else if (item.kind === "scheduled") {
      unfinished.push(item);
    }
  }

  completed.sort((a, b) =>
    (itemCompletedAt(b) ?? "").localeCompare(itemCompletedAt(a) ?? ""),
  );

  return { unfinished, completed, paused, history };
}
