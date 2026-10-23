import {
  Archive,
  BookOpenCheck,
  CalendarDays,
  Repeat2,
  TimerReset,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTasks } from "@/data/queries";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { shortDateLabel, timestampToDateKey } from "@/lib/date";
import { describeRecurrence } from "@/lib/recurrence";
import { reviewPlanLabel } from "@/domain/review";
import type { Task } from "@/types/domain";

function ArchivedTaskRow({ task }: { task: Task }) {
  const archivedDate = task.archivedAt ? timestampToDateKey(task.archivedAt) : null;
  return (
    <article className="paper-panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {task.type === "recurring" ? (
            <Repeat2 className="h-3.5 w-3.5 text-muted-foreground" />
          ) : task.type === "review" ? (
            <BookOpenCheck className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <TimerReset className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <h3 className="truncate text-sm font-semibold">{task.title}</h3>
          <Badge variant="archived">已归档</Badge>
          {task.category ? (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: task.category.color }}
              />
              {task.category.name}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {task.type === "recurring"
            ? describeRecurrence(task.recurrenceRule)
            : task.type === "review"
              ? reviewPlanLabel(task)
              : `${shortDateLabel(task.taskDate)} · 一次性任务`}
          {archivedDate ? ` · 归档于 ${shortDateLabel(archivedDate)}` : ""}
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link to={`/day/${task.taskDate}`}>
          <CalendarDays className="h-3.5 w-3.5" />
          查看历史日期
        </Link>
      </Button>
    </article>
  );
}

export function ArchiveList() {
  const { data: tasks = [], isLoading } = useTasks(true);
  const archived = tasks
    .filter((task) => Boolean(task.archivedAt))
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Archive / Read only"
        title="归档任务"
        description="归档任务不会删除任何历史记录。V1 归档不可恢复；如需继续执行，请新建任务。"
      />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : archived.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="还没有归档任务"
          description="在任务卡片的菜单中选择归档，历史记录会保留在这里。"
        />
      ) : (
        <div className="stagger space-y-3">
          {archived.map((task) => (
            <ArchivedTaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
