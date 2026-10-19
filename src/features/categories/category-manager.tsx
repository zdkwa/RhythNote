import { Check, FolderKanban, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useTasks,
  useUpdateCategory,
} from "@/data/queries";
import {
  COLOR_PALETTE,
  ColorPicker,
  pickPaletteColor,
} from "@/features/categories/color-picker";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/domain";

const NAME_MAX = 20;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function CategoryManager() {
  const { data: categories = [], isLoading, isError, refetch } = useCategories();
  const { data: tasks = [] } = useTasks(false);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(COLOR_PALETTE[0]);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(COLOR_PALETTE[0]);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const usage = new Map<string, number>();
  for (const task of tasks) {
    if (!task.categoryId) continue;
    usage.set(task.categoryId, (usage.get(task.categoryId) ?? 0) + 1);
  }

  const validateName = (value: string, excludeId?: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return "请输入分类名称";
    if (trimmed.length > NAME_MAX) return `分类名称不能超过 ${NAME_MAX} 个字符`;
    const duplicated = categories.some(
      (category) =>
        category.id !== excludeId &&
        category.name.toLowerCase() === trimmed.toLowerCase(),
    );
    return duplicated ? "已存在同名分类，分类名不区分大小写" : null;
  };

  const nextSortOrder =
    categories.length === 0
      ? 10
      : Math.max(...categories.map((category) => category.sortOrder)) + 10;

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateName(name);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    try {
      await createCategory.mutateAsync({
        name: name.trim(),
        color,
        sortOrder: nextSortOrder,
      });
      toast.success("分类已创建");
      setName("");
      setColor(pickPaletteColor(categories.length + 1));
    } catch (cause) {
      const message = errorMessage(cause, "分类创建失败");
      setFormError(message);
      toast.error(`创建失败：${message}`);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
    setEditError(null);
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) return;
    const error = validateName(editName, editingId);
    if (error) {
      setEditError(error);
      return;
    }
    try {
      await updateCategory.mutateAsync({
        id: editingId,
        input: { name: editName.trim(), color: editColor },
      });
      toast.success("分类已更新");
      setEditingId(null);
      setEditError(null);
    } catch (cause) {
      const message = errorMessage(cause, "分类更新失败");
      setEditError(message);
      toast.error(`更新失败：${message}`);
    }
  };

  const handleDelete = async (category: Category) => {
    try {
      await deleteCategory.mutateAsync(category.id);
      toast.success("分类已删除，相关任务已变为未分类");
    } catch (cause) {
      toast.error(`删除失败：${errorMessage(cause, "请稍后重试")}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings / Categories"
        title="分类管理"
        description="分类用于侧边栏和任务卡片上的颜色标记。删除分类后，任务会变为「未分类」，任务与历史记录不会被删除。"
      />

      <form
        onSubmit={handleCreate}
        className="paper-panel space-y-3 rounded-2xl p-4"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plus className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">新建分类</h2>
            <p className="text-[11px] text-muted-foreground">
              名称 {NAME_MAX} 字以内，颜色用于侧边栏圆点与任务卡片。
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-start">
          <div>
            <Label htmlFor="category-name">分类名称</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="例如：阅读"
              maxLength={NAME_MAX}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>颜色</Label>
            <ColorPicker
              value={color}
              onChange={setColor}
              label="分类颜色"
              className="mt-1.5"
            />
          </div>
        </div>
        {formError ? (
          <p className="text-[11px] text-destructive">{formError}</p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            当前共 {categories.length} 个分类，新建分类排在列表末尾。
          </p>
          <Button type="submit" size="sm" disabled={createCategory.isPending}>
            <Plus className="h-3.5 w-3.5" />
            {createCategory.isPending ? "创建中…" : "创建分类"}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError ? (
        <div className="paper-panel rounded-2xl p-5">
          <p className="text-sm font-medium">分类加载失败</p>
          <p className="mt-1 text-xs text-muted-foreground">
            无法读取本地分类数据，请重试；任务数据不会因此丢失。
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void refetch()}
          >
            重新加载
          </Button>
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="还没有分类"
          description="在上方创建第一个分类，例如「工作」「学习」「健康」；预置分类被删除后不会自动恢复。"
        />
      ) : (
        <ul className="stagger space-y-2">
          {categories.map((category) => {
            const count = usage.get(category.id) ?? 0;
            return (
              <li
                key={category.id}
                className="paper-panel rounded-xl px-4 py-3"
              >
                {editingId === category.id ? (
                  <form onSubmit={handleUpdate} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-start">
                      <div>
                        <Label htmlFor={`edit-category-${category.id}`}>
                          分类名称
                        </Label>
                        <Input
                          id={`edit-category-${category.id}`}
                          value={editName}
                          onChange={(event) => {
                            setEditName(event.target.value);
                            if (editError) setEditError(null);
                          }}
                          maxLength={NAME_MAX}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>颜色</Label>
                        <ColorPicker
                          value={editColor}
                          onChange={setEditColor}
                          label={`${category.name}的颜色`}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    {editError ? (
                      <p className="text-[11px] text-destructive">{editError}</p>
                    ) : null}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                        取消
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={updateCategory.isPending}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {updateCategory.isPending ? "保存中…" : "保存"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full ring-2 ring-black/5 dark:ring-white/10"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {category.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        排序值 {category.sortOrder}
                      </p>
                    </div>
                    {category.isPreset ? (
                      <Badge variant="secondary">预置</Badge>
                    ) : null}
                    <Badge variant="outline">{count} 个任务</Badge>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`编辑分类 ${category.name}`}
                        title="编辑分类"
                        onClick={() => startEdit(category)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`删除分类 ${category.name}`}
                        title="删除分类"
                        className={cn(
                          "text-muted-foreground hover:text-destructive",
                        )}
                        onClick={() => setDeleteTarget(category)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`删除分类「${deleteTarget?.name ?? ""}」？`}
        description={
          <span>
            该分类下的{" "}
            <strong className="text-foreground">
              {deleteTarget ? (usage.get(deleteTarget.id) ?? 0) : 0}
            </strong>{" "}
            个任务会变为「未分类」，任务、标签与历史记录都不会被删除。删除后不可撤销。
          </span>
        }
        confirmLabel="删除分类"
        destructive
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}
