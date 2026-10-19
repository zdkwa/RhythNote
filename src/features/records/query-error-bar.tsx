import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface QueryErrorBarProps {
  message?: string;
  onRetry: () => void;
  className?: string;
}

/** 查询失败时的错误条：保留页面主结构，只提供重试入口。 */
export function QueryErrorBar({
  message = "数据加载失败，请重试。",
  onRetry,
  className,
}: QueryErrorBarProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/[0.08] px-4 py-3",
        className,
      )}
    >
      <p className="flex items-center gap-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {message}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="gap-1.5"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        重试
      </Button>
    </div>
  );
}
