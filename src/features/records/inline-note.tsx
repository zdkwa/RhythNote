import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Check, Loader2, PencilLine, TriangleAlert } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { keys, useDeleteRecord, useUpsertRecord } from "@/data/queries";
import type { DailyRecordInput } from "@/data/repository";
import type { DailyRecord } from "@/types/domain";
import {
  applyOptimisticDeleteRecord,
  applyOptimisticRecord,
} from "@/features/records/optimistic-cache";
import { cn } from "@/lib/utils";

export const INLINE_NOTE_MAX_LENGTH = 500;
const SAVE_DEBOUNCE_MS = 500;
const SAVED_FADE_MS = 1500;

type SaveState = "idle" | "saving" | "saved" | "error";

export interface InlineNoteHandle {
  /** 立即落盘未保存内容（失焦、切换页面、任务完成前调用）。 */
  flush: () => Promise<void>;
}

export interface InlineNoteProps {
  taskId: string;
  /** 本地日期 YYYY-MM-DD。 */
  date: string;
  record: DailyRecord | null;
  disabled?: boolean;
  disabledReason?: string;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

/**
 * 循环任务每日备注（PRD 3.6.3 / 4.6）：
 * 500ms 防抖 + 失焦保存、单条在途保存、旧请求不覆盖新文本、卸载前 flush。
 * 清空规则：未完成删除记录；已完成保留完成记录、备注置空。
 */
export const InlineNote = forwardRef<InlineNoteHandle, InlineNoteProps>(
  function InlineNote(
    {
      taskId,
      date,
      record,
      disabled = false,
      disabledReason,
      placeholder = "添加当日备注…",
      maxLength = INLINE_NOTE_MAX_LENGTH,
      className,
    },
    ref,
  ) {
    const queryClient = useQueryClient();
    const upsertRecord = useUpsertRecord();
    const deleteRecord = useDeleteRecord();
    const noteId = useId();
    const statusId = useId();

    const [value, setValue] = useState(() => record?.note ?? "");
    const [saveState, setSaveState] = useState<SaveState>("idle");
    const [focused, setFocused] = useState(false);

    const mountedRef = useRef(true);
    const valueRef = useRef(value);
    const recordRef = useRef(record);
    const dirtyRef = useRef(false);
    const timerRef = useRef<number | null>(null);
    const fadeTimerRef = useRef<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const chainRef = useRef<Promise<void>>(Promise.resolve());
    const flushRef = useRef<() => Promise<void>>(async () => {});

    useEffect(() => {
      valueRef.current = value;
    }, [value]);

    useEffect(() => {
      recordRef.current = record;
    }, [record]);

    // 服务端结果回流：只在未聚焦、没有未保存内容时同步，避免覆盖正在输入的文字。
    useEffect(() => {
      if (focused || dirtyRef.current) return;
      const serverNote = record?.note ?? "";
      if (serverNote !== valueRef.current) {
        valueRef.current = serverNote;
        setValue(serverNote);
      }
    }, [record?.note, record?.status, focused]);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

    useEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, [value, focused]);

    const clearFadeTimer = useCallback(() => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    }, []);

    const scheduleFade = useCallback(() => {
      clearFadeTimer();
      fadeTimerRef.current = window.setTimeout(() => {
        fadeTimerRef.current = null;
        if (mountedRef.current) setSaveState("idle");
      }, SAVED_FADE_MS);
    }, [clearFadeTimer]);

    /** 从缓存读取最新记录，避免与完成/取消操作并发时使用过期的 props。 */
    const readLatestRecord = useCallback((): DailyRecord | null => {
      const cached = queryClient.getQueryData<DailyRecord[]>(
        keys.records(date, date),
      );
      const found = cached?.find(
        (item) => item.taskId === taskId && item.recordDate === date,
      );
      return found ?? recordRef.current;
    }, [queryClient, taskId, date]);

    const persist = useCallback(
      async (rawText: string): Promise<void> => {
        const text = rawText.trim().slice(0, maxLength);
        const current = readLatestRecord();
        const currentNote = current?.note ?? "";

        if (current?.status === "done") {
          if (currentNote === text) return;
          const input: DailyRecordInput = {
            taskId,
            recordDate: date,
            status: "done",
            note: text || null,
            isBackfilled: current.isBackfilled,
            completedAt: current.completedAt ?? new Date().toISOString(),
          };
          const rollback = applyOptimisticRecord(
            queryClient,
            date,
            date,
            input,
          );
          if (mountedRef.current) {
            clearFadeTimer();
            setSaveState("saving");
          }
          try {
            await upsertRecord.mutateAsync(input);
            if (mountedRef.current) {
              setSaveState("saved");
              scheduleFade();
            }
          } catch (error) {
            rollback();
            if (mountedRef.current) setSaveState("error");
            throw error;
          }
          return;
        }

        if (text.length > 0) {
          if (currentNote === text) return;
          const input: DailyRecordInput = {
            taskId,
            recordDate: date,
            status: "undone",
            note: text,
            isBackfilled: false,
            completedAt: null,
          };
          const rollback = applyOptimisticRecord(
            queryClient,
            date,
            date,
            input,
          );
          if (mountedRef.current) {
            clearFadeTimer();
            setSaveState("saving");
          }
          try {
            await upsertRecord.mutateAsync(input);
            if (mountedRef.current) {
              setSaveState("saved");
              scheduleFade();
            }
          } catch (error) {
            rollback();
            if (mountedRef.current) setSaveState("error");
            throw error;
          }
          return;
        }

        // 未完成 + 空备注：删除该日记录（PRD 2.4.4 / 4.6）。
        if (!current) return;
        const rollback = applyOptimisticDeleteRecord(
          queryClient,
          date,
          date,
          taskId,
          date,
        );
        if (mountedRef.current) {
          clearFadeTimer();
          setSaveState("saving");
        }
        try {
          await deleteRecord.mutateAsync({ taskId, recordDate: date });
          if (mountedRef.current) {
            setSaveState("saved");
            scheduleFade();
          }
        } catch (error) {
          rollback();
          if (mountedRef.current) setSaveState("error");
          throw error;
        }
      },
      [
        clearFadeTimer,
        date,
        deleteRecord,
        maxLength,
        queryClient,
        readLatestRecord,
        scheduleFade,
        taskId,
        upsertRecord,
      ],
    );

    /** 串行队列：同一任务同一天只有一个在途保存，后续输入排在后面。 */
    const enqueue = useCallback(
      (text: string): Promise<void> => {
        const run = chainRef.current.then(() => persist(text));
        chainRef.current = run.catch(() => {
          // 失败状态已在 persist 内记录，这里只保证队列继续可用。
        });
        return run;
      },
      [persist],
    );

    const flush = useCallback(async (): Promise<void> => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!dirtyRef.current) {
        await chainRef.current;
        return;
      }
      dirtyRef.current = false;
      try {
        await enqueue(valueRef.current);
      } catch {
        dirtyRef.current = true;
      }
    }, [enqueue]);

    useEffect(() => {
      flushRef.current = flush;
    }, [flush]);

    const scheduleSave = useCallback(() => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, SAVE_DEBOUNCE_MS);
    }, [flush]);

    // 卸载（切换页面/关闭详情）前把未保存内容落盘。
    useEffect(() => {
      return () => {
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        if (fadeTimerRef.current !== null) {
          window.clearTimeout(fadeTimerRef.current);
          fadeTimerRef.current = null;
        }
        if (dirtyRef.current) void flushRef.current();
      };
    }, []);

    // 关闭窗口前再尝试一次保存。
    useEffect(() => {
      const handleBeforeUnload = () => {
        if (dirtyRef.current) void flushRef.current();
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }, []);

    useImperativeHandle(ref, () => ({ flush }), [flush]);

    const handleChange = (next: string) => {
      const limited = next.slice(0, maxLength);
      setValue(limited);
      valueRef.current = limited;
      dirtyRef.current = true;
      setSaveState("idle");
      clearFadeTimer();
      scheduleSave();
    };

    const handleBlur = () => {
      setFocused(false);
      if (dirtyRef.current) void flush();
    };

    const handleRetry = () => {
      dirtyRef.current = true;
      void flush();
    };

    const feedback = disabled
      ? ""
      : saveState === "saving"
        ? "保存中…"
        : saveState === "saved"
          ? "已保存"
          : saveState === "error"
            ? "保存失败"
            : "";

    return (
      <div className={cn("mt-3", className)}>
        <div className="flex items-start gap-2">
          <PencilLine
            aria-hidden="true"
            className="mt-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
          />
          <div className="min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              id={noteId}
              value={value}
              rows={1}
              maxLength={maxLength}
              disabled={disabled}
              placeholder={disabled ? (disabledReason ?? "当前不可编辑备注") : placeholder}
              aria-label="当日备注"
              aria-describedby={statusId}
              onChange={(event) => handleChange(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={handleBlur}
              className="note-input block max-h-32 min-h-[2rem] w-full resize-none overflow-y-auto bg-transparent px-0 py-1.5 text-sm leading-6 text-foreground placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                borderTopWidth: 0,
                borderLeftWidth: 0,
                borderRightWidth: 0,
              }}
            />
            <div className="mt-1 flex min-h-[1rem] items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span
                id={statusId}
                role="status"
                aria-live="polite"
                className={cn(
                  "inline-flex items-center gap-1",
                  saveState === "error" && !disabled && "text-destructive",
                )}
              >
                {saveState === "saving" && !disabled ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : null}
                {saveState === "saved" && !disabled ? (
                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ) : null}
                {saveState === "error" && !disabled ? (
                  <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                ) : null}
                {feedback}
                {saveState === "error" && !disabled ? (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    重试
                  </button>
                ) : null}
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  value.length === 0 && "invisible",
                )}
              >
                {value.length}/{maxLength}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
