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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreatePlan,
  useCreatePlanItem,
  useDeletePlan,
  useDeletePlanItem,
  usePlans,
  useSetPlanItemDone,
  useUpdatePlan,
  useUpdatePlanItem,
} from "@/data/queries";
import { withTimeout } from "@/lib/async";
import type { Plan, PlanItem } from "@/types/domain";

const MAX_PLAN_LENGTH = 5000;
const MAX_ITEM_LENGTH = 1000;

function timeLabel(timestamp: string): string {
  try {
    return `更新于 ${format(parseISO(timestamp), "M月d日 HH:mm")}`;
  } catch {
    return "已保存";
  }
}

function ItemRow({
  item,
  onToggle,
  onDelete,
  onSave,
}: {
  item: PlanItem;
  onToggle: () => Promise<void>;
  onDelete: () => Promise<void>;
  onSave: (content: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!draft.trim()) {
      setError("子任务内容不能为空。");
      return;
    }
    try {
      await onSave(draft);
      setEditing(false);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请重试。");
    }
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-primary/30 bg-background/60 p-2">
        <Input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(null);
          }}
          maxLength={MAX_ITEM_LENGTH}
          className="h-8 text-sm"
          aria-label="编辑子任务"
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void save();
            }
            if (event.key === "Escape") {
              setEditing(false);
              setError(null);
            }
          }}
        />
        {error ? (
          <p className="mt-1 text-[11px] text-destructive">{error}</p>
        ) : null}
        <div className="mt-1.5 flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
          >
            <X className="h-3 w-3" />
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => void save()}
          >
            <Save className="h-3 w-3" />
            保存
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 rounded-lg border border-transparent px-1.5 py-1.5 transition-colors hover:border-border/60 hover:bg-muted/25">
      <button
        type="button"
        aria-label={item.isDone ? `取消完成：${item.content}` : `完成：${item.content}`}
        aria-pressed={item.isDone}
        onClick={() => void onToggle()}
        className={
          item.isDone
            ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-emerald-600 bg-emerald-600 text-white"
            : "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background text-transparent transition-colors hover:border-primary/50 hover:text-primary/40"
        }
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <span
        className={
          item.isDone
            ? "min-w-0 flex-1 truncate text-xs text-muted-foreground line-through"
            : "min-w-0 flex-1 truncate text-xs text-foreground"
        }
        title={item.content}
      >
        {item.content}
      </span>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          aria-label={`编辑子任务：${item.content}`}
          onClick={() => {
            setDraft(item.content);
            setEditing(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          aria-label={`删除子任务：${item.content}`}
          onClick={() => void onDelete()}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const createItem = useCreatePlanItem();
  const updateItem = useUpdatePlanItem();
  const toggleItem = useSetPlanItemDone();
  const deleteItem = useDeletePlanItem();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(plan.content);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState("");
  const [itemError, setItemError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const doneCount = plan.items.filter((item) => item.isDone).length;
  const total = plan.items.length;

  const saveTitle = async () => {
    if (!titleDraft.trim()) {
      setTitleError("计划名称不能为空。");
      return;
    }
    try {
      await withTimeout(
        updatePlan.mutateAsync({ id: plan.id, content: titleDraft }),
        10_000,
        "保存超时，请重试。",
      );
      toast.success("计划已更新");
      setEditingTitle(false);
      setTitleError(null);
    } catch (cause) {
      updatePlan.reset();
      setTitleError(cause instanceof Error ? cause.message : "保存失败，请重试。");
    }
  };

  const addItem = async () => {
    if (!itemDraft.trim()) return;
    try {
      await withTimeout(
        createItem.mutateAsync({ planId: plan.id, content: itemDraft }),
        10_000,
        "添加超时，请重试。",
      );
      setItemDraft("");
      setItemError(null);
    } catch (cause) {
      createItem.reset();
      setItemError(cause instanceof Error ? cause.message : "添加失败，请重试。");
    }
  };

  const removePlan = async () => {
    try {
      await withTimeout(
        deletePlan.mutateAsync(plan.id),
        10_000,
        "删除超时，请重试。",
      );
      toast.success("计划已删除");
      setDeleteOpen(false);
    } catch (cause) {
      deletePlan.reset();
      toast.error(cause instanceof Error ? cause.message : "删除失败，请重试。");
    }
  };

  return (
    <article className="paper-panel rounded-2xl px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <NotebookPen className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <div>
              <Input
                value={titleDraft}
                onChange={(event) => {
                  setTitleDraft(event.target.value);
                  if (titleError) setTitleError(null);
                }}
                maxLength={MAX_PLAN_LENGTH}
                className="h-8 text-sm font-semibold"
                aria-label="计划名称"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveTitle();
                  }
                  if (event.key === "Escape") {
                    setEditingTitle(false);
                    setTitleError(null);
                  }
                }}
              />
              {titleError ? (
                <p className="mt-1 text-[11px] text-destructive">{titleError}</p>
              ) : null}
              <div className="mt-1.5 flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => {
                    setEditingTitle(false);
                    setTitleError(null);
                  }}
                >
                  <X className="h-3 w-3" />
                  取消
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => void saveTitle()}
                >
                  <Save className="h-3 w-3" />
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 break-words text-sm font-semibold">
                {plan.content}
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                {doneCount}/{total} 完成
              </span>
              <span className="text-[10px] text-muted-foreground">
                {timeLabel(plan.updatedAt)}
              </span>
            </div>
          )}
        </div>
        {!editingTitle ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              aria-label={`编辑计划：${plan.content}`}
              onClick={() => {
                setTitleDraft(plan.content);
                setEditingTitle(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              aria-label={`删除计划：${plan.content}`}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-3 pl-11">
        {plan.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
            还没有子任务，在下面添加。
          </p>
        ) : (
          <div className="space-y-0.5">
            {plan.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={async () => {
                  try {
                    await withTimeout(
                      toggleItem.mutateAsync({
                        id: item.id,
                        isDone: !item.isDone,
                      }),
                      10_000,
                      "更新超时，请重试。",
                    );
                  } catch (cause) {
                    toggleItem.reset();
                    toast.error(
                      cause instanceof Error
                        ? cause.message
                        : "更新失败，请重试。",
                    );
                  }
                }}
                onDelete={async () => {
                  try {
                    await withTimeout(
                      deleteItem.mutateAsync(item.id),
                      10_000,
                      "删除超时，请重试。",
                    );
                  } catch (cause) {
                    deleteItem.reset();
                    toast.error(
                      cause instanceof Error
                        ? cause.message
                        : "删除失败，请重试。",
                    );
                  }
                }}
                onSave={async (content) => {
                  await withTimeout(
                    updateItem.mutateAsync({ id: item.id, content }),
                    10_000,
                    "保存超时，请重试。",
                  );
                }}
              />
            ))}
          </div>
        )}

        <div className="mt-2">
          <div className="flex items-center gap-1.5">
            <Input
              value={itemDraft}
              onChange={(event) => {
                setItemDraft(event.target.value);
                if (itemError) setItemError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addItem();
                }
              }}
              maxLength={MAX_ITEM_LENGTH}
              placeholder="添加子任务，按 Enter 保存"
              className="h-8 flex-1 bg-background/50 text-xs"
              aria-label={`为${plan.content}添加子任务`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2 text-[11px]"
              disabled={createItem.isPending || !itemDraft.trim()}
              onClick={() => void addItem()}
            >
              <Plus className="h-3.5 w-3.5" />
              添加
            </Button>
          </div>
          {itemError ? (
            <p className="mt-1 text-[11px] text-destructive">{itemError}</p>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除这条计划？"
        description="计划及其所有子任务都会删除，且无法恢复；任务数据不受影响。"
        confirmLabel="删除"
        destructive
        onConfirm={() => void removePlan()}
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
        description="记录阶段计划，每条计划可以拆成多个可勾选的子任务；不需要设置日期或时间。"
      />

      <section className="paper-panel rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <NotebookPen className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">添加计划</p>
            <p className="text-[11px] text-muted-foreground">
              先写计划名称，再在计划卡片里添加子任务。
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void add();
              }
            }}
            placeholder="例如：第一周看网课"
            maxLength={MAX_PLAN_LENGTH}
            className="h-10 bg-background/60 text-sm"
            aria-label="计划名称"
          />
          <Button
            type="button"
            disabled={createPlan.isPending || !draft.trim()}
            onClick={() => void add()}
            className="h-10 shrink-0 gap-1.5"
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
              在上方添加第一条计划，例如「第一周看网课」。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
