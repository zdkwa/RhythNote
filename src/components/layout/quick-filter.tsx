import { useSearchParams } from "react-router-dom";
import type { TaskScope } from "@/types/domain";
import { SCOPE_LABEL } from "@/types/domain";
import { Segmented } from "@/components/ui/segmented";

const SCOPES: TaskScope[] = ["all", "today", "week", "overdue"];

interface QuickFilterProps {
  value: TaskScope;
  onChange: (scope: TaskScope) => void;
}

export function QuickFilter({ value, onChange }: QuickFilterProps) {
  return (
    <Segmented
      ariaLabel="任务范围筛选"
      value={value}
      options={SCOPES.map((scope) => ({
        value: scope,
        label: SCOPE_LABEL[scope],
      }))}
      onChange={onChange}
    />
  );
}

export function useQuickFilter(): [TaskScope, (scope: TaskScope) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("scope");
  const scope: TaskScope = SCOPES.includes(raw as TaskScope)
    ? (raw as TaskScope)
    : "today";
  const setScope = (next: TaskScope) => {
    const updated = new URLSearchParams(params);
    // 默认范围是 today；选择“全部”必须显式写入 scope=all，
    // 否则删除参数后会再次回落到 today，导致“全部”无法选中。
    if (next === "today") updated.delete("scope");
    else updated.set("scope", next);
    setParams(updated, { replace: true });
  };
  return [scope, setScope];
}
