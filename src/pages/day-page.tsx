import { CalendarDays } from "lucide-react";
import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { isValidDateKey, dateWithWeekday } from "@/lib/date";

export function DayPage() {
  const { date } = useParams();
  const valid = isValidDateKey(date);
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Day / Detail"
        title={valid ? dateWithWeekday(date) : "日期不存在"}
        description="当天任务、每日备注与补做操作会出现在这里。"
      />
      <EmptyState
        icon={CalendarDays}
        title={valid ? "日期详情正在搭建" : "这个日期无法识别"}
        description={valid ? "任务清单、暂停区与历史记录会在这里出现。" : "请返回日历重新选择日期。"}
      />
    </div>
  );
}
