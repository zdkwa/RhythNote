import { Skeleton } from "@/components/ui/skeleton";

/** 日期详情的加载态：与真实结构同形，避免出现假的完成数据。 */
export function DaySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="正在加载当天安排">
      <Skeleton className="h-[104px] w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
