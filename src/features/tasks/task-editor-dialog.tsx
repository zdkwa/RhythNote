import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarClock,
  Check,
  FolderPlus,
  Info,
  Plus,
  Repeat2,
  Tag as TagIcon,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCategories,
  useCreateCategory,
  useCreateTag,
  useCreateTask,
  useTags,
  useUpdateTask,
} from "@/data/queries";
import { pickPaletteColor } from "@/features/categories/color-picker";
import { RecurrenceEditor } from "@/features/tasks/recurrence-editor";
import {
  createRuleValue,
  resolveRuleValue,
  validateRuleText,
  type RuleEditorValue,
} from "@/features/tasks/recurrence-rule";
import { isValidDateKey, todayKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
  PRIORITY_LABEL,
  TYPE_LABEL,
  type Priority,
  type Task,
  type TaskInput,
  type TaskType,
  type TimeSemantic,
} from "@/types/domain";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const NAME_MAX = 20;

const taskFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "请输入任务标题")
      .max(200, "标题不能超过 200 个字符"),
    description: z.string().max(2000, "说明不能超过 2000 个字符"),
    type: z.enum(["once", "recurring"]),
    priority: z.enum(["high", "medium", "low"]),
    timeSemantic: z.enum(["planned", "deadline"]),
    taskDate: z.string().refine(isValidDateKey, "请选择有效的日期"),
    hasTimeRange: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    categoryId: z.string().nullable(),
    tagIds: z.array(z.string()),
  })
  .superRefine((values, ctx) => {
    const addIssue = (path: keyof TaskFormValues, message: string) => {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    };
    if (values.type === "recurring") {
      if (values.timeSemantic !== "planned") {
        addIssue("timeSemantic", "循环任务固定使用计划语义");
      }
      if (!values.startTime) {
        addIssue("startTime", "循环任务必须填写开始时间");
      } else if (!TIME_PATTERN.test(values.startTime)) {
        addIssue("startTime", "开始时间格式应为 HH:mm");
      }
      if (!values.endTime) {
        addIssue("endTime", "循环任务必须填写结束时间");
      } else if (!TIME_PATTERN.test(values.endTime)) {
        addIssue("endTime", "结束时间格式应为 HH:mm");
      }
      if (
        TIME_PATTERN.test(values.startTime) &&
        TIME_PATTERN.test(values.endTime) &&
        values.startTime >= values.endTime
      ) {
        addIssue("endTime", "结束时间必须晚于开始时间，不支持跨午夜");
      }
      return;
    }

    if (values.timeSemantic === "deadline") {
      if (values.endTime && !TIME_PATTERN.test(values.endTime)) {
        addIssue("endTime", "截止时间格式应为 HH:mm");
      }
      return;
    }

    if (!values.hasTimeRange) return;
    if (!values.startTime) {
      addIssue("startTime", "请填写开始时间");
    } else if (!TIME_PATTERN.test(values.startTime)) {
      addIssue("startTime", "开始时间格式应为 HH:mm");
    }
    if (!values.endTime) {
      addIssue("endTime", "请填写结束时间");
    } else if (!TIME_PATTERN.test(values.endTime)) {
      addIssue("endTime", "结束时间格式应为 HH:mm");
    }
    if (
      TIME_PATTERN.test(values.startTime) &&
      TIME_PATTERN.test(values.endTime) &&
      values.startTime >= values.endTime
    ) {
      addIssue("endTime", "结束时间必须晚于开始时间，不支持跨午夜");
    }
  });

type TaskFormValues = z.infer<typeof taskFormSchema>;

export interface TaskEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultDate?: string;
  /** 从分类页新建时预选分类。 */
  defaultCategoryId?: string | null;
  /** 从 /tasks/once 或 /tasks/recurring 新建时预选类型。 */
  defaultType?: TaskType;
}

function errorText(error: unknown, fallback = "操作失败，请稍后重试"): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function createDefaults(
  task: Task | null,
  defaultDate?: string,
  defaultType?: TaskType,
  defaultCategoryId?: string | null,
): TaskFormValues {
  const type: TaskType = task?.type ?? defaultType ?? "once";
  const today = todayKey();
  const taskDate =
    task?.taskDate ??
    (isValidDateKey(defaultDate) ? defaultDate : today);
  const startTime = task?.startTime ?? (type === "recurring" ? "09:00" : "");
  const endTime = task?.endTime ?? (type === "recurring" ? "10:00" : "");
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    type,
    priority: type === "recurring" ? "medium" : (task?.priority ?? "medium"),
    timeSemantic: type === "recurring" ? "planned" : (task?.timeSemantic ?? "planned"),
    taskDate,
    hasTimeRange:
      type === "recurring" ? true : Boolean(task?.startTime && task?.endTime),
    startTime,
    endTime,
    categoryId: task?.categoryId ?? defaultCategoryId ?? null,
    tagIds: task?.tags.map((tag) => tag.id) ?? [],
  };
}

function serializeRule(value: RuleEditorValue): string {
  return JSON.stringify(value);
}

function buildTaskInput(
  values: TaskFormValues,
  task: Task | null,
  ruleValue: RuleEditorValue,
): TaskInput {
  const scheduleLocked = Boolean(
    task && task.type === "once" && task.completedAt,
  );
  const taskDate = scheduleLocked && task ? task.taskDate : values.taskDate;
  const timeSemantic: TimeSemantic =
    values.type === "recurring"
      ? "planned"
      : scheduleLocked && task
        ? task.timeSemantic
        : values.timeSemantic;

  let startTime: string | null = null;
  let endTime: string | null = null;
  if (scheduleLocked && task) {
    startTime = task.startTime;
    endTime = task.endTime;
  } else if (values.type === "recurring") {
    startTime = values.startTime || null;
    endTime = values.endTime || null;
  } else if (timeSemantic === "deadline") {
    startTime = null;
    endTime = values.endTime || null;
  } else if (values.hasTimeRange) {
    startTime = values.startTime || null;
    endTime = values.endTime || null;
  }

  const recurrenceRule =
    values.type === "recurring"
      ? resolveRuleValue(ruleValue, taskDate)
      : null;

  return {
    title: values.title,
    description: values.description.trim() || null,
    type: values.type,
    priority: values.type === "recurring" ? "medium" : values.priority,
    timeSemantic,
    taskDate,
    startTime,
    endTime,
    recurrenceRule,
    categoryId: values.categoryId,
    tagIds: values.tagIds,
  };
}

function scheduleChangedBeforeSave(task: Task, input: TaskInput): boolean {
  return (
    task.taskDate !== input.taskDate ||
    task.startTime !== input.startTime ||
    task.endTime !== input.endTime ||
    task.timeSemantic !== input.timeSemantic ||
    (task.recurrenceRule ?? "") !== (input.recurrenceRule ?? "")
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] leading-4 text-destructive">{message}</p>;
}

const TYPE_OPTIONS: Array<{ value: TaskType; label: string }> = [
  { value: "once", label: "临时任务" },
  { value: "recurring", label: "循环任务" },
];

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = (
  ["high", "medium", "low"] as Priority[]
).map((value) => ({ value, label: `${PRIORITY_LABEL[value]}优先级` }));

const SEMANTIC_OPTIONS: Array<{ value: TimeSemantic; label: string }> = [
  { value: "planned", label: "计划" },
  { value: "deadline", label: "截止" },
];

export function TaskEditorDialog({
  open,
  onOpenChange,
  task = null,
  defaultDate,
  defaultCategoryId = null,
  defaultType,
}: TaskEditorDialogProps) {
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const createTag = useCreateTag();
  const createCategory = useCreateCategory();

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: createDefaults(null),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const values = watch();
  const errors = formState.errors;

  const [ruleValue, setRuleValue] = useState<RuleEditorValue>(() =>
    createRuleValue(todayKey(), null),
  );
  const [ruleBaseline, setRuleBaseline] = useState(() =>
    serializeRule(createRuleValue(todayKey(), null)),
  );
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<TaskInput | null>(null);

  const [newTagName, setNewTagName] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [categoryCreating, setCategoryCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const suppressCloseConfirm = useRef(false);

  const readOnly = Boolean(task?.archivedAt);
  const scheduleLocked = Boolean(task && task.type === "once" && task.completedAt);
  const saving = createTask.isPending || updateTask.isPending;
  const isDirty = formState.isDirty || serializeRule(ruleValue) !== ruleBaseline;

  useEffect(() => {
    if (!open) return;
    const defaults = createDefaults(
      task,
      defaultDate,
      defaultType,
      defaultCategoryId,
    );
    reset(defaults);
    const nextRule = createRuleValue(
      defaults.taskDate,
      task?.recurrenceRule ?? null,
    );
    setRuleValue(nextRule);
    setRuleBaseline(serializeRule(nextRule));
    setRuleError(null);
    setGeneralError(null);
    setDiscardOpen(false);
    setPendingSave(null);
    setNewTagName("");
    setTagError(null);
    setCategoryCreating(false);
    setNewCategoryName("");
    setCategoryError(null);
    suppressCloseConfirm.current = false;
    // task 内容变化由调用方通过重新打开弹窗处理，这里只按任务标识初始化。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id, defaultDate, defaultType, defaultCategoryId, reset]);

  const handleDialogOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (suppressCloseConfirm.current) {
      suppressCloseConfirm.current = false;
      onOpenChange(false);
      return;
    }
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  };

  const handleTypeChange = (next: TaskType) => {
    setValue("type", next, { shouldDirty: true });
    if (next === "recurring") {
      setValue("timeSemantic", "planned", { shouldDirty: true });
      setValue("hasTimeRange", true, { shouldDirty: true });
      setValue("priority", "medium", { shouldDirty: true });
      const { startTime, endTime } = getValues();
      if (
        !TIME_PATTERN.test(startTime) ||
        !TIME_PATTERN.test(endTime) ||
        startTime >= endTime
      ) {
        setValue("startTime", "09:00", { shouldDirty: true });
        setValue("endTime", "10:00", { shouldDirty: true });
      }
    }
  };

  const handleRangeToggle = (checked: boolean) => {
    setValue("hasTimeRange", checked, { shouldDirty: true });
    if (!checked) return;
    const { startTime, endTime } = getValues();
    if (
      !TIME_PATTERN.test(startTime) ||
      !TIME_PATTERN.test(endTime) ||
      startTime >= endTime
    ) {
      setValue("startTime", "09:00", { shouldDirty: true });
      setValue("endTime", "10:00", { shouldDirty: true });
    }
  };

  const toggleTag = (tagId: string) => {
    const selected = getValues("tagIds");
    setValue(
      "tagIds",
      selected.includes(tagId)
        ? selected.filter((id) => id !== tagId)
        : [...selected, tagId],
      { shouldDirty: true },
    );
  };

  const handleCreateTagInline = async () => {
    const name = newTagName.trim();
    if (!name) {
      setTagError("请输入标签名称");
      return;
    }
    if (name.length > NAME_MAX) {
      setTagError(`标签名称不能超过 ${NAME_MAX} 个字符`);
      return;
    }
    if (tags.some((tag) => tag.name.toLowerCase() === name.toLowerCase())) {
      setTagError("已存在同名标签，标签名不区分大小写");
      return;
    }
    setTagError(null);
    try {
      const created = await createTag.mutateAsync({
        name,
        color: pickPaletteColor(tags.length),
      });
      setValue("tagIds", [...getValues("tagIds"), created.id], {
        shouldDirty: true,
      });
      setNewTagName("");
      toast.success("标签已创建并选中");
    } catch (cause) {
      setTagError(errorText(cause, "标签创建失败"));
    }
  };

  const handleCreateCategoryInline = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError("请输入分类名称");
      return;
    }
    if (name.length > NAME_MAX) {
      setCategoryError(`分类名称不能超过 ${NAME_MAX} 个字符`);
      return;
    }
    if (
      categories.some(
        (category) => category.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setCategoryError("已存在同名分类，分类名不区分大小写");
      return;
    }
    setCategoryError(null);
    try {
      const nextSortOrder =
        categories.length === 0
          ? 10
          : Math.max(...categories.map((category) => category.sortOrder)) + 10;
      const created = await createCategory.mutateAsync({
        name,
        color: pickPaletteColor(categories.length),
        sortOrder: nextSortOrder,
      });
      setValue("categoryId", created.id, { shouldDirty: true });
      setCategoryCreating(false);
      setNewCategoryName("");
      toast.success("分类已创建并选中");
    } catch (cause) {
      setCategoryError(errorText(cause, "分类创建失败"));
    }
  };

  const commitSave = async (input: TaskInput) => {
    setGeneralError(null);
    try {
      if (task) {
        await updateTask.mutateAsync({ id: task.id, input });
        toast.success("任务已保存");
      } else {
        await createTask.mutateAsync(input);
        toast.success("任务已创建");
      }
      setPendingSave(null);
      suppressCloseConfirm.current = true;
      onOpenChange(false);
    } catch (cause) {
      const message = errorText(cause, "保存失败，请重试");
      setPendingSave(null);
      setGeneralError(message);
      toast.error(`保存失败：${message}`);
    }
  };

  const onSubmit = handleSubmit(async (formValues) => {
    if (readOnly) {
      setGeneralError("归档任务只读，不能保存修改。");
      return;
    }
    let rule: string | null = null;
    if (formValues.type === "recurring") {
      try {
        rule = resolveRuleValue(ruleValue, formValues.taskDate);
      } catch (cause) {
        setRuleError(errorText(cause, "循环规则无效"));
        return;
      }
      if (rule.length > 500) {
        setRuleError("循环规则不能超过 500 个字符");
        return;
      }
      const ruleValidation = validateRuleText(
        rule,
        formValues.taskDate,
        formValues.startTime,
      );
      if (ruleValidation) {
        setRuleError(ruleValidation);
        return;
      }
    }
    setRuleError(null);

    let input: TaskInput;
    try {
      input = buildTaskInput(formValues, task, ruleValue);
    } catch (cause) {
      setRuleError(errorText(cause, "请检查循环规则"));
      return;
    }

    if (
      task &&
      task.type === "recurring" &&
      task.recurrenceRule &&
      scheduleChangedBeforeSave(task, input)
    ) {
      setPendingSave(input);
      return;
    }
    await commitSave(input);
  });

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[calc(100vh-2.5rem)] max-w-2xl overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>{task ? "编辑任务" : "新建任务"}</DialogTitle>
            <DialogDescription>
              {task
                ? `任务类型：${TYPE_LABEL[task.type]}。类型创建后不可修改；${
                    task.type === "recurring"
                      ? "保存后不会预生成任何每日记录。"
                      : "取消完成后才能修改日期与时间。"
                  }`
                : "填写标题、日期与时间即可；更多选项和循环规则按需展开。"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-5">
            {readOnly ? (
              <div className="flex items-start gap-2 rounded-lg border border-border/80 bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                归档任务只读：不能编辑、打卡或暂停，只能查看历史。
              </div>
            ) : null}
            {scheduleLocked ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                已完成的一次性任务只能修改标题、说明、分类、标签与优先级；如需改期，请先取消完成。
              </div>
            ) : null}

            <div
              className={cn(
                "grid gap-4",
                values.type === "once" && "sm:grid-cols-2",
              )}
            >
              <div className="space-y-1.5">
                <Label>任务类型</Label>
                {task ? (
                  <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm">
                    {task.type === "recurring" ? (
                      <Repeat2 className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span>{TYPE_LABEL[task.type]}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      创建后不可修改
                    </span>
                  </div>
                ) : (
                  <Segmented
                    ariaLabel="任务类型"
                    value={values.type}
                    options={TYPE_OPTIONS}
                    onChange={handleTypeChange}
                  />
                )}
              </div>
              {values.type === "once" ? (
                <div className="space-y-1.5">
                  <Label>优先级</Label>
                  <Controller
                    control={control}
                    name="priority"
                    render={({ field }) => (
                      <Segmented
                        ariaLabel="任务优先级"
                        value={field.value}
                        options={PRIORITY_OPTIONS}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-title">标题</Label>
              <Input
                id="task-title"
                autoFocus
                placeholder="例如：晨间快走 30 分钟"
                maxLength={200}
                disabled={readOnly}
                {...register("title")}
              />
              <div className="flex items-center justify-between">
                <FieldError message={errors.title?.message} />
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {values.title.length}/200
                </span>
              </div>
            </div>

            <div
              className={cn(
                "grid gap-4",
                values.type === "once" && "sm:grid-cols-2",
              )}
            >
              <div className="space-y-1.5">
                <Label htmlFor="task-date">
                  {values.type === "recurring" ? "开始日期" : "任务日期"}
                </Label>
                <Input
                  id="task-date"
                  type="date"
                  disabled={readOnly || scheduleLocked}
                  {...register("taskDate")}
                />
                <FieldError message={errors.taskDate?.message} />
                {values.type === "recurring" ? (
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    开始日期 + 时间段共同决定循环的第一次发生时间。
                  </p>
                ) : null}
              </div>
              {values.type === "once" ? (
                <div className="space-y-1.5">
                  <Label>时间语义</Label>
                  <Controller
                    control={control}
                    name="timeSemantic"
                    render={({ field }) => (
                      <Segmented
                        ariaLabel="时间语义"
                        value={field.value}
                        options={SEMANTIC_OPTIONS}
                        onChange={(next) => {
                          field.onChange(next);
                          setValue("hasTimeRange", false, {
                            shouldDirty: true,
                          });
                        }}
                      />
                    )}
                  />
                  <FieldError message={errors.timeSemantic?.message} />
                  <p className="text-[11px] leading-5 text-muted-foreground">
                    {values.timeSemantic === "deadline"
                      ? "留空表示当天 23:59 截止；填写后表示该时刻截止。"
                      : "不设置时间段 = 全天计划；设置后必须同时填写开始与结束。"}
                  </p>
                </div>
              ) : null}
            </div>

            {values.type === "recurring" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="task-start-time">开始时间</Label>
                  <Input
                    id="task-start-time"
                    type="time"
                    step={60}
                    disabled={readOnly}
                    {...register("startTime")}
                  />
                  <FieldError message={errors.startTime?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-end-time">结束时间</Label>
                  <Input
                    id="task-end-time"
                    type="time"
                    step={60}
                    disabled={readOnly}
                    {...register("endTime")}
                  />
                  <FieldError message={errors.endTime?.message} />
                </div>
              </div>
            ) : values.timeSemantic === "deadline" ? (
              <div className="space-y-1.5 sm:max-w-[240px]">
                <Label htmlFor="task-deadline">截止时间（可选）</Label>
                <Input
                  id="task-deadline"
                  type="time"
                  step={60}
                  disabled={readOnly || scheduleLocked}
                  {...register("endTime")}
                />
                <FieldError message={errors.endTime?.message} />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch
                    checked={values.hasTimeRange}
                    onCheckedChange={handleRangeToggle}
                    disabled={readOnly || scheduleLocked}
                    aria-label="设置计划时间段"
                  />
                  设置计划时间段
                </label>
                {values.hasTimeRange ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="task-start-time">开始时间</Label>
                      <Input
                        id="task-start-time"
                        type="time"
                        step={60}
                        disabled={readOnly || scheduleLocked}
                        {...register("startTime")}
                      />
                      <FieldError message={errors.startTime?.message} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="task-end-time">结束时间</Label>
                      <Input
                        id="task-end-time"
                        type="time"
                        step={60}
                        disabled={readOnly || scheduleLocked}
                        {...register("endTime")}
                      />
                      <FieldError message={errors.endTime?.message} />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    当前为全天计划任务，不设开始与结束时间。
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="task-category">分类</Label>
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryCreating((current) => !current);
                        setCategoryError(null);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <FolderPlus className="h-3 w-3" />
                      新建分类
                    </button>
                  ) : null}
                </div>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(next) =>
                        field.onChange(next === "none" ? null : next)
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger id="task-category" aria-label="任务分类">
                        <SelectValue placeholder="未分类" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未分类</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {categoryCreating ? (
                  <div className="space-y-1.5 rounded-lg border border-border/80 bg-muted/30 p-2">
                    <Input
                      value={newCategoryName}
                      onChange={(event) => {
                        setNewCategoryName(event.target.value);
                        if (categoryError) setCategoryError(null);
                      }}
                      placeholder="分类名称（1–20 字）"
                      maxLength={NAME_MAX}
                      aria-label="新分类名称"
                      className="h-8 text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCategoryCreating(false);
                          setNewCategoryName("");
                          setCategoryError(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                        取消
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={createCategory.isPending}
                        onClick={() => void handleCreateCategoryInline()}
                      >
                        <Plus className="h-3 w-3" />
                        创建并选中
                      </Button>
                    </div>
                    <FieldError message={categoryError ?? undefined} />
                  </div>
                ) : null}
              </div>
            </div>

            {values.type === "recurring" ? (
              <>
                <RecurrenceEditor
                  taskDate={values.taskDate}
                  startTime={values.startTime}
                  value={ruleValue}
                  onChange={setRuleValue}
                  error={ruleError}
                />
              </>
            ) : null}

            <details className="group rounded-xl border border-border/80 bg-muted/20 px-4 py-3">
              <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
                更多选项（说明、标签）
                {values.tagIds.length > 0 ? (
                  <span className="ml-2 font-normal text-primary">
                    已选 {values.tagIds.length} 个标签
                  </span>
                ) : null}
              </summary>
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="task-description">说明</Label>
                  <Textarea
                    id="task-description"
                    placeholder="补充任务背景或系列说明；循环任务的说明不是每日备注。"
                    maxLength={2000}
                    disabled={readOnly}
                    className="min-h-[72px]"
                    {...register("description")}
                  />
                  <div className="flex items-center justify-between">
                    <FieldError message={errors.description?.message} />
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {values.description.length}/2000
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label>
                      <TagIcon className="mr-1 inline h-3 w-3" />
                      标签
                    </Label>
                    {values.tagIds.length > 0 ? (
                      <span className="text-[10px] text-muted-foreground">
                        已选 {values.tagIds.length} 个
                      </span>
                    ) : null}
                  </div>
                  {tags.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      还没有标签，可在下方即时创建。
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => {
                        const active = values.tagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            aria-pressed={active}
                            disabled={readOnly}
                            onClick={() => toggleTag(tag.id)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
                              active
                                ? "border-primary/45 bg-primary/10 text-primary"
                                : "border-border/80 text-muted-foreground hover:border-primary/35 hover:text-foreground",
                            )}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            {tag.name}
                            {active ? <Check className="h-3 w-3" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!readOnly ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newTagName}
                        onChange={(event) => {
                          setNewTagName(event.target.value);
                          if (tagError) setTagError(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleCreateTagInline();
                          }
                        }}
                        placeholder="新标签名称"
                        maxLength={NAME_MAX}
                        aria-label="新标签名称"
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={createTag.isPending}
                        onClick={() => void handleCreateTagInline()}
                      >
                        <Plus className="h-3 w-3" />
                        添加
                      </Button>
                    </div>
                  ) : null}
                  <FieldError message={tagError ?? undefined} />
                </div>
              </div>
            </details>

            {generalError ? (
              <p className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {generalError}
              </p>
            ) : null}

            <DialogFooter className="border-t border-border/70 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={saving || readOnly}>
                {saving
                  ? "保存中…"
                  : task
                    ? "保存修改"
                    : "创建任务"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="放弃未保存的修改？"
        description="关闭后，本次填写的内容不会保存。"
        confirmLabel="放弃修改"
        cancelLabel="继续编辑"
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          suppressCloseConfirm.current = true;
          onOpenChange(false);
        }}
      />

      <ConfirmDialog
        open={pendingSave !== null}
        onOpenChange={(openNext) => {
          if (!openNext) setPendingSave(null);
        }}
        title="确认修改循环规则？"
        description="修改日期、时间或循环规则会重新计算历史日历中未记录的日期；已有打卡与备注不会被删除。确定保存吗？"
        confirmLabel="保存修改"
        cancelLabel="返回检查"
        onConfirm={() => {
          if (pendingSave) {
            const input = pendingSave;
            setPendingSave(null);
            void commitSave(input);
          }
        }}
      />
    </>
  );
}
