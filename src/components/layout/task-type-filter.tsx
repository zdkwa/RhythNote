import { useSearchParams } from "react-router-dom";
import { Segmented } from "@/components/ui/segmented";
import type { TaskType } from "@/types/domain";

export type TaskTypeFilterValue = "all" | TaskType;

const TYPE_OPTIONS: Array<{ value: TaskTypeFilterValue; label: string }> = [
  { value: "all", label: "全部类型" },
  { value: "once", label: "临时任务" },
  { value: "recurring", label: "循环任务" },
  { value: "review", label: "记忆复习" },
];

export function TaskTypeFilter({
  value,
  onChange,
}: {
  value: TaskTypeFilterValue;
  onChange: (value: TaskTypeFilterValue) => void;
}) {
  return (
    <Segmented
      ariaLabel="任务类型筛选"
      value={value}
      options={TYPE_OPTIONS}
      onChange={onChange}
    />
  );
}

export function useTaskTypeFilter(): [
  TaskTypeFilterValue,
  (value: TaskTypeFilterValue) => void,
] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("type");
  const value: TaskTypeFilterValue =
    raw === "once" || raw === "recurring" || raw === "review" ? raw : "all";
  const setValue = (next: TaskTypeFilterValue) => {
    const updated = new URLSearchParams(params);
    if (next === "all") updated.delete("type");
    else updated.set("type", next);
    setParams(updated, { replace: true });
  };
  return [value, setValue];
}
