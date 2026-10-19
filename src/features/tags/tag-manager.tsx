import { Check, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
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
  useCreateTag,
  useDeleteTag,
  useTags,
  useTasks,
  useUpdateTag,
} from "@/data/queries";
import {
  COLOR_PALETTE,
  ColorPicker,
  pickPaletteColor,
} from "@/features/categories/color-picker";
import type { Tag } from "@/types/domain";

const NAME_MAX = 20;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function TagManager() {
  const { data: tags = [], isLoading, isError, refetch } = useTags();
  const { data: tasks = [] } = useTasks(false);
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(COLOR_PALETTE[0]);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(COLOR_PALETTE[0]);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  const usage = new Map<string, number>();
  for (const task of tasks) {
    for (const tag of task.tags) {
      usage.set(tag.id, (usage.get(tag.id) ?? 0) + 1);
    }
  }

  const validateName = (value: string, excludeId?: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return "请输入标签名称";
    if (trimmed.length > NAME_MAX) return `标签名称不能超过 ${NAME_MAX} 个字符`;
    const duplicated = tags.some(
      (tag) =>
        tag.id !== excludeId &&
        tag.name.toLowerCase() === trimmed.toLowerCase(),
    );
    return duplicated ? "已存在同名标签，标签名不区分大小写" : null;
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateName(name);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    try {
      await createTag.mutateAsync({ name: name.trim(), color });
      toast.success("标签已创建");
      setName("");
      setColor(pickPaletteColor(tags.length + 1));
    } catch (cause) {
      const message = errorMessage(cause, "标签创建失败");
      setFormError(message);
      toast.error(`创建失败：${message}`);
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
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
      await updateTag.mutateAsync({
        id: editingId,
        input: { name: editName.trim(), color: editColor },
      });
      toast.success("标签已更新");
      setEditingId(null);
      setEditError(null);
    } catch (cause) {
      const message = errorMessage(cause, "标签更新失败");
      setEditError(message);
      toast.error(`更新失败：${message}`);
    }
  };

  const handleDelete = async (tag: Tag) => {
    try {
      await deleteTag.mutateAsync(tag.id);
      toast.success("标签已删除，关联任务保留");
    } catch (cause) {
      toast.error(`删除失败：${errorMessage(cause, "请稍后重试")}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings / Tags"
        title="标签管理"
        description="标签用于给任务补充自由维度。删除标签只会移除标签与任务的关联，不会删除任何任务或历史记录。"
      />

      <form
        onSubmit={handleCreate}
        className="paper-panel space-y-3 rounded-2xl p-4"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Plus className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">新建标签</h2>
            <p className="text-[11px] text-muted-foreground">
              名称 {NAME_MAX} 字以内；任务编辑器中也可以即时新建标签。
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-start">
          <div>
            <Label htmlFor="tag-name">标签名称</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="例如：晨间"
              maxLength={NAME_MAX}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>颜色</Label>
            <ColorPicker
              value={color}
              onChange={setColor}
              label="标签颜色"
              className="mt-1.5"
            />
          </div>
        </div>
        {formError ? (
          <p className="text-[11px] text-destructive">{formError}</p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            当前共 {tags.length} 个标签，列表按名称排序。
          </p>
          <Button type="submit" size="sm" disabled={createTag.isPending}>
            <Plus className="h-3.5 w-3.5" />
            {createTag.isPending ? "创建中…" : "创建标签"}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : isError ? (
        <div className="paper-panel rounded-2xl p-5">
          <p className="text-sm font-medium">标签加载失败</p>
          <p className="mt-1 text-xs text-muted-foreground">
            无法读取本地标签数据，请重试；任务数据不会因此丢失。
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
      ) : tags.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="还没有标签"
          description="标签完全自由创建，例如「深度」「晨间」「复盘」。也可以直接在任务编辑器中新建标签。"
        />
      ) : (
        <ul className="stagger space-y-2">
          {tags.map((tag) => {
            const count = usage.get(tag.id) ?? 0;
            return (
              <li key={tag.id} className="paper-panel rounded-xl px-4 py-3">
                {editingId === tag.id ? (
                  <form onSubmit={handleUpdate} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-start">
                      <div>
                        <Label htmlFor={`edit-tag-${tag.id}`}>标签名称</Label>
                        <Input
                          id={`edit-tag-${tag.id}`}
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
                          label={`${tag.name}的颜色`}
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
                        disabled={updateTag.isPending}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {updateTag.isPending ? "保存中…" : "保存"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full ring-2 ring-black/5 dark:ring-white/10"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{tag.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        标签不参与完成状态
                      </p>
                    </div>
                    <Badge variant="outline">{count} 个任务</Badge>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`编辑标签 ${tag.name}`}
                        title="编辑标签"
                        onClick={() => startEdit(tag)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`删除标签 ${tag.name}`}
                        title="删除标签"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(tag)}
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
        title={`删除标签「${deleteTarget?.name ?? ""}」？`}
        description={
          <span>
            该标签当前关联{" "}
            <strong className="text-foreground">
              {deleteTarget ? (usage.get(deleteTarget.id) ?? 0) : 0}
            </strong>{" "}
            个任务。删除只移除标签与任务之间的关联，任务、任务说明与历史记录都不会被删除。
          </span>
        }
        confirmLabel="删除标签"
        destructive
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}
