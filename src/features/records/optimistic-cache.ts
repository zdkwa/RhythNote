import type { QueryClient } from "@tanstack/react-query";
import type { DailyRecord, Task } from "@/types/domain";
import type { DailyRecordInput } from "@/data/repository";
import { keys } from "@/data/queries";

export type Rollback = () => void;

const noopRollback: Rollback = () => {};

type PauseCacheItem = { taskId: string; pauseDate: string };

function isSameRecord(
  record: DailyRecord,
  taskId: string,
  recordDate: string,
): boolean {
  return record.taskId === taskId && record.recordDate === recordDate;
}

/**
 * 完成/取消/备注的乐观更新：直接改写当天 records 查询缓存，
 * 失败时由调用方执行返回的 rollback 恢复。查询成功后 react-query
 * 会通过既有 invalidate 逻辑用数据库结果替换缓存。
 */
export function applyOptimisticRecord(
  queryClient: QueryClient,
  start: string,
  end: string,
  input: DailyRecordInput,
): Rollback {
  const key = keys.records(start, end);
  const previous = queryClient.getQueryData<DailyRecord[]>(key);
  if (!previous) return noopRollback;

  const now = new Date().toISOString();
  const note = input.note?.trim() || null;
  const completedAt =
    input.status === "done" ? (input.completedAt ?? now) : null;
  const index = previous.findIndex((record) =>
    isSameRecord(record, input.taskId, input.recordDate),
  );

  if (index >= 0) {
    const existing = previous[index];
    const next = previous.slice();
    next[index] = {
      ...existing,
      status: input.status,
      note,
      isBackfilled: input.isBackfilled,
      completedAt,
      updatedAt: now,
    };
    queryClient.setQueryData<DailyRecord[]>(key, next);
  } else {
    const optimistic: DailyRecord = {
      id: `optimistic-${input.taskId}-${input.recordDate}`,
      taskId: input.taskId,
      recordDate: input.recordDate,
      status: input.status,
      note,
      isBackfilled: input.isBackfilled,
      completedAt,
      createdAt: now,
      updatedAt: now,
    };
    queryClient.setQueryData<DailyRecord[]>(key, [...previous, optimistic]);
  }

  return () => {
    queryClient.setQueryData<DailyRecord[]>(key, previous);
  };
}

export function applyOptimisticDeleteRecord(
  queryClient: QueryClient,
  start: string,
  end: string,
  taskId: string,
  recordDate: string,
): Rollback {
  const key = keys.records(start, end);
  const previous = queryClient.getQueryData<DailyRecord[]>(key);
  if (!previous) return noopRollback;
  queryClient.setQueryData<DailyRecord[]>(
    key,
    previous.filter(
      (record) => !isSameRecord(record, taskId, recordDate),
    ),
  );
  return () => {
    queryClient.setQueryData<DailyRecord[]>(key, previous);
  };
}

/** 一次性任务完成/取消的乐观更新：改写 tasks 缓存中的任务定义。 */
export function applyOptimisticTaskPatch(
  queryClient: QueryClient,
  taskId: string,
  patch: Partial<Task>,
): Rollback {
  const scopes = [true, false] as const;
  const snapshots: Array<{ key: readonly unknown[]; previous: Task[] }> = [];

  for (const scope of scopes) {
    const key = keys.tasks(scope);
    const previous = queryClient.getQueryData<Task[]>(key);
    if (!previous) continue;
    snapshots.push({ key, previous });
    queryClient.setQueryData<Task[]>(
      key,
      previous.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task,
      ),
    );
  }

  return () => {
    for (const snapshot of snapshots) {
      queryClient.setQueryData<Task[]>(snapshot.key, snapshot.previous);
    }
  };
}

export function applyOptimisticPause(
  queryClient: QueryClient,
  start: string,
  end: string,
  taskId: string,
  pauseDate: string,
): Rollback {
  const key = keys.pauses(start, end);
  const previous = queryClient.getQueryData<PauseCacheItem[]>(key);
  if (!previous) return noopRollback;
  if (
    previous.some(
      (pause) => pause.taskId === taskId && pause.pauseDate === pauseDate,
    )
  ) {
    return noopRollback;
  }
  queryClient.setQueryData<PauseCacheItem[]>(key, [
    ...previous,
    { taskId, pauseDate },
  ]);
  return () => {
    queryClient.setQueryData<PauseCacheItem[]>(key, previous);
  };
}

export function applyOptimisticRemovePause(
  queryClient: QueryClient,
  start: string,
  end: string,
  taskId: string,
  pauseDate: string,
): Rollback {
  const key = keys.pauses(start, end);
  const previous = queryClient.getQueryData<PauseCacheItem[]>(key);
  if (!previous) return noopRollback;
  queryClient.setQueryData<PauseCacheItem[]>(
    key,
    previous.filter(
      (pause) =>
        !(pause.taskId === taskId && pause.pauseDate === pauseDate),
    ),
  );
  return () => {
    queryClient.setQueryData<PauseCacheItem[]>(key, previous);
  };
}
