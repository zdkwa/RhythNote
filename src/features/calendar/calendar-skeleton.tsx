import { Skeleton } from "@/components/ui/skeleton";
import { WEEKDAY_HEADERS } from "@/features/calendar/calendar-utils";

/** 加载态：保留固定 6×7 结构与表头，不渲染任何假的 0/0 数据。 */
export function CalendarSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="正在加载月历"
      className="paper-panel rounded-2xl p-3 sm:p-4"
    >
      <div className="mb-2 grid grid-cols-7 gap-1.5 px-1">
        {WEEKDAY_HEADERS.map((label) => (
          <span
            key={label}
            className="py-1 text-center text-[11px] font-semibold tracking-wide text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 42 }, (_, index) => (
          <Skeleton
            key={index}
            className="min-h-[72px] rounded-lg sm:min-h-[80px]"
          />
        ))}
      </div>
    </div>
  );
}
