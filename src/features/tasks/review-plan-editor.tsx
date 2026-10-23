import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  REVIEW_INTERVALS_MAX,
  REVIEW_INTERVAL_MAX_DAYS,
  REVIEW_PRESETS,
  normalizeReviewIntervals,
  reviewDatesFrom,
} from "@/domain/review";
import { shortDateLabel, weekdayShort } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ReviewAnchor } from "@/types/domain";

interface ReviewPlanEditorProps {
  taskDate: string;
  intervals: number[];
  anchor: ReviewAnchor;
  onIntervalsChange: (intervals: number[]) => void;
  onAnchorChange: (anchor: ReviewAnchor) => void;
  error?: string | null;
  disabled?: boolean;
}

function matchesPreset(intervals: number[], preset: number[]): boolean {
  return (
    intervals.length === preset.length &&
    intervals.every((value, index) => value === preset[index])
  );
}

export function ReviewPlanEditor({
  taskDate,
  intervals,
  anchor,
  onIntervalsChange,
  onAnchorChange,
  error,
  disabled = false,
}: ReviewPlanEditorProps) {
  const presetMatch = REVIEW_PRESETS.find((preset) =>
    matchesPreset(intervals, preset.intervals),
  );
  const [custom, setCustom] = useState(!presetMatch);

  useEffect(() => {
    if (!presetMatch) setCustom(true);
  }, [presetMatch]);

  const preview = reviewDatesFrom(taskDate, intervals, anchor).slice(0, 10);

  const updateInterval = (index: number, raw: string) => {
    const next = [...intervals];
    next[index] = Number(raw);
    onIntervalsChange(next);
  };

  const addInterval = () => {
    const last = intervals.at(-1) ?? 1;
    onIntervalsChange([
      ...intervals,
      Math.min(REVIEW_INTERVAL_MAX_DAYS, Math.max(1, last + 1)),
    ]);
    setCustom(true);
  };

  const removeInterval = (index: number) => {
    onIntervalsChange(intervals.filter((_, itemIndex) => itemIndex !== index));
    setCustom(true);
  };

  return (
    <section className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm font-semibold">复习方案</Label>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            复习日期由首次学习日期和间隔计算；错过不会自动顺延。
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          <Sparkles className="mr-1 h-3 w-3" />
          {intervals.length} 次复习
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {REVIEW_PRESETS.map((preset) => {
          const active = !custom && matchesPreset(intervals, preset.intervals);
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => {
                setCustom(false);
                onIntervalsChange(normalizeReviewIntervals(preset.intervals));
              }}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                active
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/80 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              <span className="block text-xs font-semibold">{preset.name}</span>
              <span className="mt-0.5 block text-[10px] opacity-80">
                {preset.description}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          disabled={disabled}
          aria-pressed={custom}
          onClick={() => setCustom(true)}
          className={cn(
            "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
            custom
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border/80 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
          )}
        >
          自定义
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">间隔锚点</span>
        {(
          [
            ["initial", "从首次学习日累计"],
            ["previous", "从上次计划复习日累计"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            aria-pressed={anchor === value}
            onClick={() => onAnchorChange(value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              anchor === value
                ? "border-primary/45 bg-primary/10 text-primary"
                : "border-border/80 text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {custom ? (
        <div className="space-y-2 rounded-lg border border-border/70 bg-background/50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground">
              每个阶段的间隔天数
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              disabled={disabled || intervals.length >= REVIEW_INTERVALS_MAX}
              onClick={addInterval}
            >
              <Plus className="h-3 w-3" />
              添加阶段
            </Button>
          </div>
          <div className="space-y-2">
            {intervals.map((interval, index) => (
              <div key={`${index}-${intervals.length}`} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-[11px] text-muted-foreground">
                  第 {index + 1} 次
                </span>
                <span className="text-[11px] text-muted-foreground">+</span>
                <Input
                  type="number"
                  min={1}
                  max={REVIEW_INTERVAL_MAX_DAYS}
                  value={Number.isFinite(interval) ? interval : ""}
                  disabled={disabled}
                  onChange={(event) => updateInterval(index, event.target.value)}
                  className="h-8 w-24 text-xs"
                  aria-label={`第 ${index + 1} 次复习间隔天数`}
                />
                <span className="text-[11px] text-muted-foreground">天</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeInterval(index)}
                  className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`删除第 ${index + 1} 次复习`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {intervals.length === 0 ? (
            <p className="text-[11px] text-destructive">
              至少保留一个复习阶段。
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {preview.map((item) => (
          <span
            key={`${item.date}-${item.stage}`}
            className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2 py-1 text-[10px] text-muted-foreground"
            title={item.date}
          >
            {item.stage === 0 ? "首次" : `第${item.stage}次`}
            <span className="text-foreground">
              {shortDateLabel(item.date)} {weekdayShort(item.date)}
            </span>
          </span>
        ))}
        {reviewDatesFrom(taskDate, intervals, anchor).length > preview.length ? (
          <span className="px-1 py-1 text-[10px] text-muted-foreground">
            等 {reviewDatesFrom(taskDate, intervals, anchor).length} 个日期
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-[11px] leading-4 text-destructive">{error}</p>
      ) : null}
    </section>
  );
}
