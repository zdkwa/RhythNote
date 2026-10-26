import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSetTimeOverride, useUpdateTaskTimeFrom } from "@/data/queries";
import { dateWithWeekday } from "@/lib/date";
import { withTimeout } from "@/lib/async";
import { cn } from "@/lib/utils";
import type { Task, TimeSemantic } from "@/types/domain";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type AdjustScope = "single" | "future";

interface TimeAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  date: string;
}

export function TimeAdjustDialog({
  open,
  onOpenChange,
  task,
  date,
}: TimeAdjustDialogProps) {
  const setOverride = useSetTimeOverride();
  const updateFuture = useUpdateTaskTimeFrom();
  const [scope, setScope] = useState<AdjustScope>("single");
  const [timeSemantic, setTimeSemantic] = useState<TimeSemantic>(
    task.timeSemantic,
  );
  const [hasRange, setHasRange] = useState(
    Boolean(task.startTime && task.endTime),
  );
  const [startTime, setStartTime] = useState(task.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(task.endTime ?? "10:00");
  const [error, setError] = useState<string | null>(null);
  const saving = setOverride.isPending || updateFuture.isPending;

  useEffect(() => {
    if (!open) return;
    setScope("single");
    setTimeSemantic(task.timeSemantic);
    setHasRange(Boolean(task.startTime && task.endTime));
    setStartTime(task.startTime ?? "09:00");
    setEndTime(task.endTime ?? "10:00");
    setError(null);
  }, [open, task.id, task.startTime, task.endTime, task.timeSemantic]);

  const handleSave = async () => {
    let nextStart: string | null = null;
    let nextEnd: string | null = null;

    if (timeSemantic === "deadline") {
      if (endTime && !TIME_PATTERN.test(endTime)) {
        setError("截止时间格式应为 HH:mm。");
        return;
      }
      nextEnd = endTime || null;
    } else if (hasRange) {
      if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
        setError("开始和结束时间格式应为 HH:mm。");
        return;
      }
      if (startTime >= endTime) {
        setError("结束时间必须晚于开始时间，不支持跨午夜。");
        return;
      }
      nextStart = startTime;
      nextEnd = endTime;
    }

    setError(null);
    try {
      if (scope === "single") {
        await withTimeout(
          setOverride.mutateAsync({
            taskId: task.id,
            occurrenceDate: date,
            timeSemantic,
            startTime: nextStart,
            endTime: nextEnd,
            updatedAt: new Date().toISOString(),
          }),
          10_000,
          "调整超时，数据库可能被其他 RhythNote 实例占用；请关闭其他实例后重试。",
        );
        toast.success("已只调整今天的时间");
      } else {
        await withTimeout(
          updateFuture.mutateAsync({
            taskId: task.id,
            timeSemantic,
            startTime: nextStart,
            endTime: nextEnd,
            fromDate: date,
          }),
          10_000,
          "调整超时，数据库可能被其他 RhythNote 实例占用；请关闭其他实例后重试。",
        );
        toast.success("已调整今天及之后所有复习时间");
      }
      onOpenChange(false);
    } catch (cause) {
      setOverride.reset();
      updateFuture.reset();
      setError(cause instanceof Error ? cause.message : "调整失败，请重试。");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>调整复习时间</DialogTitle>
          <DialogDescription>
            「{task.title}」· {dateWithWeekday(date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>调整范围</Label>
            <div className="grid gap-2">
              {(
                [
                  ["single", "仅调整这一次"],
                  ["future", "从这次起调整之后所有"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={scope === value}
                  onClick={() => setScope(value)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                    scope === value
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/80 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  <span className="mt-0.5 block text-[10px] font-normal opacity-75">
                    {value === "single"
                      ? "只覆盖当前日期，明天恢复默认时间。"
                      : "更新任务默认时间，并清理从今天起的单次覆盖。"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>时间设置</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["planned", "计划时间"],
                  ["deadline", "截止时间"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={timeSemantic === value}
                  onClick={() => setTimeSemantic(value)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    timeSemantic === value
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/80 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {timeSemantic === "deadline" ? (
            <div className="space-y-1.5">
              <Label htmlFor="adjust-deadline">截止时间（可选）</Label>
              <Input
                id="adjust-deadline"
                type="time"
                step={60}
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Switch
                  checked={hasRange}
                  onCheckedChange={setHasRange}
                  aria-label="设置计划时间段"
                />
                设置计划时间段
              </label>
              {hasRange ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="adjust-start">开始时间</Label>
                    <Input
                      id="adjust-start"
                      type="time"
                      step={60}
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="adjust-end">结束时间</Label>
                    <Input
                      id="adjust-end"
                      type="time"
                      step={60}
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  不设置时间段即全天计划。
                </p>
              )}
            </div>
          )}

          {error ? (
            <p className="text-[11px] leading-4 text-destructive">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "保存中…" : "保存调整"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
