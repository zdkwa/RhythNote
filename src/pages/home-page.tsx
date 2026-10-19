import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export function HomePage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Month / Rhythm"
        title="节律月历"
        description="每天完成多少、漏掉多少，一眼看清。点击日期进入当天安排。"
      />
      <EmptyState
        icon={CalendarDays}
        title="日历正在搭建"
        description="月历、进度颜色与日期详情会在这里出现。"
      />
    </div>
  );
}
