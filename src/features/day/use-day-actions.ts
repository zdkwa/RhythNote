import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  keys,
  useAddPause,
  useDeleteRecord,
  useRemovePause,
  useSetOnceCompletion,
  useUpsertRecord,
} from "@/data/queries";
import type { DailyRecordInput } from "@/data/repository";
import type { DailyRecord, DayItem } from "@/types/domain";
import { todayKey } from "@/lib/date";
import { isItemDone } from "@/features/day/day-items";
import {
  applyOptimisticDeleteRecord,
  applyOptimisticPause,
  applyOptimisticRecord,
  applyOptimisticRemovePause,
  applyOptimisticTaskPatch,
  type Rollback,
} from "@/features/records/optimistic-cache";

/** 数据层错误若已有中文说明就直接展示，否则用统一中文兜底。 */
function userMessage(error: unknown, fallback: string): string {
  if (
    error instanceof Error &&
    error.message.length > 0 &&
    /[\u4e00-\u9fa5]/.test(error.message)
  ) {
    return error.message;
  }
  return fallback;
}

export interface DayActions {
  pendingKey: string | null;
  /** 完成/取消完成：循环任务写 daily_records，一次性任务写 tasks。 */
  toggleCompletion: (item: DayItem) => Promise<void>;
  pauseOccurrence: (item: DayItem) => Promise<void>;
  resumeOccurrence: (item: DayItem) => Promise<void>;
}

/**
 * 日期详情的全部写操作。所有写库动作都由用户显式点击触发；
 * 日期判定使用“提交瞬间”的本地日期（PRD 4.11），不使用模块级缓存。
 */
export function useDayActions(date: string): DayActions {
  const queryClient = useQueryClient();
  const upsertRecord = useUpsertRecord();
  const deleteRecord = useDeleteRecord();
  const setOnceCompletion = useSetOnceCompletion();
  const addPause = useAddPause();
  const removePause = useRemovePause();

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const pendingRef = useRef(false);

  const latestRecord = useCallback(
    (taskId: string): DailyRecord | null => {
      const cached = queryClient.getQueryData<DailyRecord[]>(
        keys.records(date, date),
      );
      return (
        cached?.find(
          (record) =>
            record.taskId === taskId && record.recordDate === date,
        ) ?? null
      );
    },
    [queryClient, date],
  );

  const run = useCallback(
    async (
      key: string,
      action: () => Promise<void>,
      rollback: Rollback,
      fallbackMessage: string,
    ): Promise<void> => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      setPendingKey(key);
      try {
        await action();
      } catch (error) {
        rollback();
        console.error("[day] 写操作失败", error);
        toast.error(userMessage(error, fallbackMessage));
      } finally {
        pendingRef.current = false;
        setPendingKey(null);
      }
    },
    [],
  );

  const toggleCompletion = useCallback(
    async (item: DayItem): Promise<void> => {
      if (item.task.archivedAt) return;
      const submitToday = todayKey();
      const key = `toggle:${item.task.id}:${item.date}`;

      if (item.task.type === "once") {
        if (item.task.completedAt) {
          const rollback = applyOptimisticTaskPatch(
            queryClient,
            item.task.id,
            { completedAt: null, isBackfilled: false },
          );
          await run(
            key,
            async () => {
              await setOnceCompletion.mutateAsync({
                id: item.task.id,
                completed: false,
                isBackfilled: false,
              });
              toast.success("已取消完成");
            },
            rollback,
            "取消完成失败，请重试",
          );
          return;
        }
        if (item.date > submitToday) {
          toast.error("未来日期不可打卡");
          return;
        }
        const isBackfilled = item.date < submitToday;
        const rollback = applyOptimisticTaskPatch(queryClient, item.task.id, {
          completedAt: new Date().toISOString(),
          isBackfilled,
        });
        await run(
          key,
          async () => {
            await setOnceCompletion.mutateAsync({
              id: item.task.id,
              completed: true,
              isBackfilled,
            });
            toast.success(isBackfilled ? "已补做" : "已完成");
          },
          rollback,
          "完成失败，请重试",
        );
        return;
      }

      const current = latestRecord(item.task.id) ?? item.record;
      const done = current?.status === "done" || isItemDone(item);

      if (done) {
        const hasNote = Boolean(current?.note);
        if (hasNote) {
          const input: DailyRecordInput = {
            taskId: item.task.id,
            recordDate: date,
            status: "undone",
            note: current?.note ?? null,
            isBackfilled: false,
            completedAt: null,
          };
          const rollback = applyOptimisticRecord(
            queryClient,
            date,
            date,
            input,
          );
          await run(
            key,
            async () => {
              await upsertRecord.mutateAsync(input);
              toast.success("已取消完成");
            },
            rollback,
            "取消完成失败，请重试",
          );
          return;
        }
        const rollback = applyOptimisticDeleteRecord(
          queryClient,
          date,
          date,
          item.task.id,
          date,
        );
        await run(
          key,
          async () => {
            await deleteRecord.mutateAsync({
              taskId: item.task.id,
              recordDate: date,
            });
            toast.success("已取消完成");
          },
          rollback,
          "取消完成失败，请重试",
        );
        return;
      }

      if (date > submitToday) {
        toast.error("未来日期不可打卡");
        return;
      }

      const isBackfilled = date < submitToday;
      const input: DailyRecordInput = {
        taskId: item.task.id,
        recordDate: date,
        status: "done",
        note: current?.note ?? null,
        isBackfilled,
        completedAt: new Date().toISOString(),
      };
      const rollback = applyOptimisticRecord(queryClient, date, date, input);
      await run(
        key,
        async () => {
          await upsertRecord.mutateAsync(input);
          toast.success(isBackfilled ? "已补做" : "已完成");
        },
        rollback,
        "完成失败，请重试",
      );
    },
    [
      date,
      deleteRecord,
      latestRecord,
      queryClient,
      run,
      setOnceCompletion,
      upsertRecord,
    ],
  );

  const pauseOccurrence = useCallback(
    async (item: DayItem): Promise<void> => {
      if (item.task.type !== "recurring") return;
      if (item.task.archivedAt || item.isPaused) return;
      if (item.date < todayKey()) {
        toast.error("只能暂停今天或未来日期");
        return;
      }
      if (latestRecord(item.task.id) || item.record) {
        toast.error("该日期已有记录，无法暂停");
        return;
      }
      const rollback = applyOptimisticPause(
        queryClient,
        date,
        date,
        item.task.id,
        date,
      );
      await run(
        `pause:${item.task.id}:${date}`,
        async () => {
          await addPause.mutateAsync({
            taskId: item.task.id,
            pauseDate: date,
          });
          toast.success("已暂停本次");
        },
        rollback,
        "暂停失败，请重试",
      );
    },
    [addPause, date, latestRecord, queryClient, run],
  );

  const resumeOccurrence = useCallback(
    async (item: DayItem): Promise<void> => {
      if (item.task.archivedAt) return;
      const rollback = applyOptimisticRemovePause(
        queryClient,
        date,
        date,
        item.task.id,
        date,
      );
      await run(
        `resume:${item.task.id}:${date}`,
        async () => {
          await removePause.mutateAsync({
            taskId: item.task.id,
            pauseDate: date,
          });
          toast.success("已取消暂停");
        },
        rollback,
        "取消暂停失败，请重试",
      );
    },
    [date, queryClient, removePause, run],
  );

  return { pendingKey, toggleCompletion, pauseOccurrence, resumeOccurrence };
}
