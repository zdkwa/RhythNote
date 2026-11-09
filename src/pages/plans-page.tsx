import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Check,
  NotebookPen,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreatePlan,
  useDeletePlan,
  usePlans,
  useUpdatePlan,
} from "@/data/queries";
import { withTimeout } from "@/lib/async";
import type { Plan } from "@/types/domain";

const MAX_PLAN_LENGTH = 5000;

function planTimeLabel(timestamp: string): string {
  try {
    return `更新于 ${format(parseISO(timestamp), "M月d日 HH:mm")}`;
  } catch {
    return "已保存";
  }
}

function PlanCard({
  plan,
  onChanged,
}: {
  plan: Plan;
  onChanged: () => Promise<void>;
}) {
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(plan.content);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(plan.content);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (!draft.trim()) {
      setError("计划内容不能为空。");
      return;
    }
    setError(null);
    try {
      await withTimeout(
        updatePlan.mutateAsync({ id: plan.id, content: draft }),
        10_000,
        "保存超时，请重试。",
      );
      toast.success("计划已更新");
      setEditing(false);
      await onChanged();
    } catch (cause) {
      updatePlan.reset();
      setError(cause instanceof Error ? cause.message : "保存失败，请重试。");
    }
  };

  const remove = async () => {
    try {
      await withTimeout(
        deletePlan.mutateAsync(plan.id),
        10_000,
        "删除超时，请重试。",
      );
      toast.success("计划已删除");
      setDeleteOpen(false);
      await onChanged();
    } catch (cause) {
      deletePlan.reset();
      toast.error(cause instanceof Error ? cause.message : "删除失败，请重试。");
    }
  };

  return (
    <article className="paper-panel rounded-2xl px-4 py-3.5">
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError(null);
            }}
            maxLength={MAX_PLAN_LENGTH}
            rows={5}
            autoFocus
            className="min-h-[120px] resize-y bg-background/60 text-sm leading-6"
            aria-label="编辑计划内容"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              {draft.length}/{MAX_PLAN_LENGTH}
            </span>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={updatePlan.isPending}
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
              >
                <X className="h-3.5 w-3.5" />
                取消
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={updatePlan.isPending || !draft.trim()}
                onClick={() => void save()}
              >
                {updatePlan.isPending ? (
                  "保存中…"
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </div>
          {error ? (
            <p className="text-[11px] text-destructive">{error}</p>
          ) : null}
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
            {plan.content}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5">
            <span className="text-[10px] text-muted-foreground">
              {planTimeLabel(plan.updatedAt)}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
                onClick={startEditing}
              >
                <Pencil className="h-3 w-3" />
                编辑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3 w-3" />
                删除
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除这条计划？"
        description="删除后无法恢复；任务数据不受影响。"
        confirmLabel="删除"
        destructive
        onConfirm={() => void remove()}
      />
    </article>
  );
}

export function PlansPage() {
  const { data: plans = [], isLoading, isError, refetch } = usePlans();
  const createPlan = useCreatePlan();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!draft.trim()) return;
    setError(null);
    try {
      await withTimeout(
        createPlan.mutateAsync(draft),
        10_000,
        "保存超时，请重试。",
      );
      setDraft("");
      toast.success("计划已添加");
      await refetch();
    } catch (cause) {
      createPlan.reset();
      setError(cause instanceof Error ? cause.message : "保存失败，请重试。");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Plans / Notes"
        title="我的计划"
        description="像便签一样记录阶段计划，不需要设置日期或时间。"
      />

      <section className="paper-panel rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <NotebookPen className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">添加计划</p>
            <p className="text-[11px] text-muted-foreground">
              直接输入内容；支持多行，按 Ctrl + Enter 快速保存。
            </p>
          </div>
        </div>
        <Textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              void add();
            }
          }}
          placeholder={
            "例如：\n第一周看网课\n第二周写真题"
          }
          maxLength={MAX_PLAN_LENGTH}
          rows={4}
          className="min-h-[100px] resize-y bg-background/60 text-sm leading-6"
          aria-label="计划内容"
        />
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">
            {draft.length}/{MAX_PLAN_LENGTH}
          </span>
          <Button
            type="button"
            disabled={createPlan.isPending || !draft.trim()}
            onClick={() => void add()}
            className="gap-1.5"
          >
            {createPlan.isPending ? (
              "保存中…"
            ) : (
              <>
                <Plus className="h-4 w-4" />
                添加计划
              </>
            )}
          </Button>
        </div>
        {error ? (
          <p className="mt-2 text-[11px] text-destructive">{error}</p>
        ) : null}
      </section>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <p className="text-xs font-semibold text-muted-foreground">
            全部计划
          </p>
          <span className="text-[11px] text-muted-foreground">
            {plans.length} 条
          </span>
        </div>

        {isError ? (
          <div className="paper-panel rounded-2xl p-6 text-sm">
            <p className="font-medium">计划加载失败</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void refetch()}
            >
              重试
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : plans.length === 0 ? (
          <div className="paper-panel rounded-2xl border-dashed p-8 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <NotebookPen className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium">还没有计划</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              在上方写下第一条，例如「第一周看网课」。
            </p>
            <p className="mt-3 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Check className="h-3 w-3" />
              只保存内容，不绑定日期
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onChanged={async () => {
                  await refetch();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
