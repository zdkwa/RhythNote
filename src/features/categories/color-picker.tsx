import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const COLOR_PALETTE = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#0EA5E9",
  "#14B8A6",
  "#6366F1",
  "#EC4899",
  "#84CC16",
  "#F97316",
  "#64748B",
];

export function pickPaletteColor(index: number): string {
  return COLOR_PALETTE[index % COLOR_PALETTE.length] ?? COLOR_PALETTE[0];
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

/**
 * 分类 / 标签共用的颜色选择器：预设色板 + 系统取色器。
 * 仅允许 #RRGGBB，与 PRD 2.4.1 / 2.4.2 的 color 约束一致。
 */
export function ColorPicker({
  value,
  onChange,
  label = "颜色",
  className,
}: ColorPickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {COLOR_PALETTE.map((color) => {
          const active = color.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              aria-label={`选择颜色 ${color}`}
              aria-pressed={active}
              onClick={() => onChange(color)}
              className={cn(
                "relative flex h-7 w-7 items-center justify-center rounded-full border transition-transform",
                active
                  ? "border-foreground/60 ring-2 ring-ring/50"
                  : "border-black/10 hover:scale-105 dark:border-white/15",
              )}
              style={{ backgroundColor: color }}
            >
              {active ? (
                <Check className="h-3.5 w-3.5 text-white drop-shadow" />
              ) : null}
            </button>
          );
        })}
        <label
          className="flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-border/80 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          title="自定义颜色"
        >
          <span
            className="h-3.5 w-3.5 rounded-full border border-black/10 dark:border-white/20"
            style={{ backgroundColor: value }}
          />
          自定义
          <input
            type="color"
            aria-label={label}
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#3B82F6"}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="h-0 w-0 opacity-0"
          />
        </label>
      </div>
    </div>
  );
}
