import type { TaskPause } from "@/types/domain";

/**
 * `useWorkspaceBundle` 返回的暂停对象只保证 taskId / pauseDate；
 * 领域函数（buildCalendarSummaries / buildDaySummary）只读取这两个字段。
 * 这里补齐类型要求的 createdAt，避免在页面层使用 any 或类型断言。
 */
export function toTaskPauses(
  pauses: Array<{ taskId: string; pauseDate: string }>,
): TaskPause[] {
  return pauses.map((pause) => ({
    taskId: pause.taskId,
    pauseDate: pause.pauseDate,
    createdAt: "",
  }));
}
