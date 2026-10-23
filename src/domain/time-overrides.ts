import type { OccurrenceTimeOverride, Task } from "@/types/domain";

export type TimeOverrideMap = Map<string, OccurrenceTimeOverride>;

export function timeOverrideKey(taskId: string, date: string): string {
  return `${taskId}|${date}`;
}

export function buildTimeOverrideMap(
  overrides: OccurrenceTimeOverride[],
): TimeOverrideMap {
  const map: TimeOverrideMap = new Map();
  for (const override of overrides) {
    map.set(timeOverrideKey(override.taskId, override.occurrenceDate), override);
  }
  return map;
}

/** 返回某天生效的任务时间视图；没有覆盖时直接返回原任务。 */
export function taskAtDate(
  task: Task,
  date: string,
  overrides: TimeOverrideMap | null | undefined,
): Task {
  if (!overrides) return task;
  const override = overrides.get(timeOverrideKey(task.id, date));
  if (!override) return task;
  return {
    ...task,
    timeSemantic: override.timeSemantic,
    startTime: override.startTime,
    endTime: override.endTime,
  };
}
