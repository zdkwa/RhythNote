import type { CalendarState } from "@/domain/day";
import { cn } from "@/lib/utils";

interface LegendItem {
  state: CalendarState;
  label: string;
  description: string;
  swatch: string;
}

/** 与 PRD 3.5.3 的四个分支一一对应，顺序固定。 */
const LEGEND_ITEMS: LegendItem[] = [
  {
    state: "green",
    label: "全部完成",
    description: "完成数 = 总数",
    swatch: "hsl(var(--cal-green) / 0.8)",
  },
  {
    state: "yellow",
    label: "部分完成",
    description: "0 < 完成数 < 总数",
    swatch: "hsl(var(--cal-yellow) / 0.85)",
  },
  {
    state: "red",
    label: "未完成",
    description: "完成数 = 0 且总数 > 0",
    swatch: "hsl(var(--cal-red) / 0.8)",
  },
  {
    state: "none",
    label: "无任务",
    description: "总数 = 0",
    swatch: "hsl(var(--cal-gray) / 0.72)",
  },
  {
    state: "upcoming",
    label: "未开始",
    description: "未来日期，只显示计划安排",
    swatch: "hsl(var(--cal-upcoming) / 0.5)",
  },
];

export function CalendarLegend({ className }: { className?: string }) {
  return (
    <div
      role="list"
      aria-label="日历颜色图例"
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1.5",
        className,
      )}
    >
      {LEGEND_ITEMS.map((item) => (
        <span
          key={item.state}
          role="listitem"
          title={item.description}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-[3px] ring-1 ring-inset ring-black/5 dark:ring-white/10"
            style={{ backgroundColor: item.swatch }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
