import { ListTodo } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { QuickFilter, useQuickFilter } from "@/components/layout/quick-filter";
import { EmptyState } from "@/components/ui/empty-state";
import type { TaskType } from "@/types/domain";

export function TasksPage({ fixedType }: { fixedType?: TaskType }) {
  const [scope, setScope] = useQuickFilter();
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Tasks / Library"
        title={fixedType === "once" ? "临时任务" : fixedType === "recurring" ? "循环任务" : "全部任务"}
        description="按全部、今天、本周、逾期查看任务与发生实例。"
        actions={<QuickFilter value={scope} onChange={setScope} />}
      />
      <EmptyState
        icon={ListTodo}
        title="任务列表正在搭建"
        description="任务卡片、编辑弹窗与筛选结果会在这里出现。"
      />
    </div>
  );
}
