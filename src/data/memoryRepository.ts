import type { DailyRecordInput, Repository } from "@/data/repository";
import type {
  Category,
  CategoryInput,
  DailyRecord,
  Tag,
  TagInput,
  Task,
  TaskInput,
  TaskPause,
  ThemeMode,
} from "@/types/domain";
import { uuid } from "@/lib/utils";
import {
  addDaysKey,
  addMonthsKey,
  todayKey,
  toMonthKey,
} from "@/lib/date";
import { expandOccurrences } from "@/lib/recurrence";

const nowIso = () => new Date().toISOString();

function cloneTask(task: Task): Task {
  return {
    ...task,
    tags: task.tags.map((tag) => ({ ...tag })),
    category: task.category ? { ...task.category } : null,
  };
}

function cloneCategory(category: Category): Category {
  return { ...category };
}

function cloneTag(tag: Tag): Tag {
  return { ...tag };
}

function cloneRecord(record: DailyRecord): DailyRecord {
  return { ...record };
}

function clonePause(pause: TaskPause): TaskPause {
  return { ...pause };
}

export class MemoryRepository implements Repository {
  private categories: Category[] = [];
  private tags: Tag[] = [];
  private tasks: Task[] = [];
  private records: DailyRecord[] = [];
  private pauses: TaskPause[] = [];
  private theme: ThemeMode = "system";

  constructor(seed = true) {
    if (seed) this.seed();
  }

  private seed(): void {
    const now = nowIso();
    const today = todayKey();
    const monthKey = toMonthKey(new Date());

    const categories: Category[] = [
      {
        id: "cat-work",
        name: "工作",
        color: "#3B82F6",
        sortOrder: 10,
        isPreset: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "cat-study",
        name: "学习",
        color: "#8B5CF6",
        sortOrder: 20,
        isPreset: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "cat-life",
        name: "生活",
        color: "#10B981",
        sortOrder: 30,
        isPreset: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "cat-health",
        name: "健康",
        color: "#F59E0B",
        sortOrder: 40,
        isPreset: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    this.categories = categories;

    const tags: Tag[] = [
      {
        id: "tag-deep",
        name: "深度",
        color: "#0F766E",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "tag-morning",
        name: "晨间",
        color: "#D97706",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "tag-review",
        name: "复盘",
        color: "#7C3AED",
        createdAt: now,
        updatedAt: now,
      },
    ];
    this.tags = tags;

    const categoryOf = (id: string): Category => categories.find((c) => c.id === id)!;
    const tagsOf = (...ids: string[]): Tag[] => tags.filter((t) => ids.includes(t.id));

    const base = (overrides: Partial<Task> & Pick<Task, "id" | "title" | "type">): Task => ({
      id: overrides.id,
      title: overrides.title,
      description: overrides.description ?? null,
      type: overrides.type,
      priority: overrides.priority ?? "medium",
      timeSemantic: overrides.timeSemantic ?? "planned",
      taskDate: overrides.taskDate ?? today,
      startTime: overrides.startTime ?? null,
      endTime: overrides.endTime ?? null,
      recurrenceRule: overrides.recurrenceRule ?? null,
      categoryId: overrides.categoryId ?? null,
      completedAt: overrides.completedAt ?? null,
      isBackfilled: overrides.isBackfilled ?? false,
      archivedAt: overrides.archivedAt ?? null,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
      tags: overrides.tags ?? [],
      category: overrides.category ?? (overrides.categoryId ? categoryOf(overrides.categoryId) : null),
    });

    this.tasks = [
      base({
        id: "task-study",
        title: "英语精读",
        description: "每周一、三、五早上精读一篇文章，记下三个表达。",
        type: "recurring",
        priority: "high",
        taskDate: addDaysKey(today, -35),
        startTime: "09:00",
        endTime: "10:00",
        recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR;WKST=MO",
        categoryId: "cat-study",
        tags: tagsOf("tag-deep"),
      }),
      base({
        id: "task-walk",
        title: "晨间快走",
        description: "绕小区两圈，回来拉伸五分钟。",
        type: "recurring",
        priority: "medium",
        taskDate: addDaysKey(today, -60),
        startTime: "07:30",
        endTime: "08:00",
        recurrenceRule: "FREQ=DAILY;INTERVAL=1",
        categoryId: "cat-health",
        tags: tagsOf("tag-morning"),
      }),
      base({
        id: "task-review",
        title: "月度复盘",
        description: "回看本月完成情况，写下下个月的一件重要事。",
        type: "recurring",
        priority: "high",
        taskDate: `${addMonthsKey(monthKey, -2)}-01`,
        startTime: "20:00",
        endTime: "21:00",
        recurrenceRule: "FREQ=MONTHLY;BYMONTHDAY=1",
        categoryId: "cat-study",
        tags: tagsOf("tag-review"),
      }),
      base({
        id: "task-report",
        title: "提交季度报告",
        description: "把 Q3 的数据和结论发到项目群。",
        type: "once",
        priority: "high",
        taskDate: today,
        startTime: null,
        endTime: "18:00",
        timeSemantic: "deadline",
        categoryId: "cat-work",
      }),
      base({
        id: "task-dentist",
        title: "预约牙医",
        description: "确认周六上午是否还有号。",
        type: "once",
        priority: "medium",
        taskDate: addDaysKey(today, 1),
        startTime: "10:00",
        endTime: "10:30",
        categoryId: "cat-life",
      }),
      base({
        id: "task-renew",
        title: "续签借阅卡",
        description: "带身份证去图书馆一楼。",
        type: "once",
        priority: "low",
        taskDate: addDaysKey(today, -3),
        startTime: "15:00",
        endTime: "16:00",
        categoryId: "cat-life",
      }),
      base({
        id: "task-done-once",
        title: "整理书桌",
        description: null,
        type: "once",
        priority: "low",
        taskDate: addDaysKey(today, -1),
        startTime: "12:00",
        endTime: "12:30",
        completedAt: now,
        isBackfilled: true,
        categoryId: "cat-life",
      }),
      base({
        id: "task-deep-read",
        title: "读《置身事内》第三章",
        description: null,
        type: "once",
        priority: "medium",
        taskDate: today,
        startTime: "20:00",
        endTime: "21:00",
        categoryId: "cat-study",
        tags: tagsOf("tag-deep"),
      }),
      // 首页演示数据：1 个当前时间段循环任务 + 9 个未完成临时任务。
      base({
        id: "task-demo-current",
        title: "整理今日纪要",
        description: "把今天的决定和待跟进事项整理成一页。",
        type: "recurring",
        priority: "medium",
        taskDate: today,
        startTime: "22:00",
        endTime: "23:59",
        recurrenceRule: "FREQ=DAILY;INTERVAL=1",
        categoryId: "cat-study",
      }),
      base({
        id: "task-demo-01",
        title: "确认项目排期",
        description: null,
        type: "once",
        priority: "high",
        taskDate: today,
        startTime: "08:30",
        endTime: "09:00",
        categoryId: "cat-work",
      }),
      base({
        id: "task-demo-02",
        title: "回复客户邮件",
        description: null,
        type: "once",
        priority: "high",
        taskDate: today,
        startTime: "10:00",
        endTime: "10:30",
        categoryId: "cat-work",
      }),
      base({
        id: "task-demo-03",
        title: "预约体检",
        description: null,
        type: "once",
        priority: "medium",
        taskDate: today,
        startTime: "11:30",
        endTime: "12:00",
        categoryId: "cat-life",
      }),
      base({
        id: "task-demo-04",
        title: "整理读书笔记",
        description: null,
        type: "once",
        priority: "medium",
        taskDate: today,
        startTime: "13:00",
        endTime: "13:30",
        categoryId: "cat-study",
      }),
      base({
        id: "task-demo-05",
        title: "给植物浇水",
        description: null,
        type: "once",
        priority: "low",
        taskDate: today,
        startTime: "14:30",
        endTime: "15:00",
        categoryId: "cat-life",
      }),
      base({
        id: "task-demo-06",
        title: "复盘本周开销",
        description: null,
        type: "once",
        priority: "medium",
        taskDate: today,
        startTime: "16:00",
        endTime: "16:30",
        categoryId: "cat-life",
      }),
      base({
        id: "task-demo-07",
        title: "准备明天午餐",
        description: null,
        type: "once",
        priority: "low",
        taskDate: today,
        startTime: "17:30",
        endTime: "18:00",
        categoryId: "cat-life",
      }),
      base({
        id: "task-demo-08",
        title: "背 20 个单词",
        description: null,
        type: "once",
        priority: "medium",
        taskDate: today,
        startTime: "19:00",
        endTime: "19:30",
        categoryId: "cat-study",
      }),
      base({
        id: "task-demo-09",
        title: "拉伸放松",
        description: null,
        type: "once",
        priority: "low",
        taskDate: today,
        startTime: "22:30",
        endTime: "23:30",
        categoryId: "cat-health",
      }),
    ];

    this.records = [
      {
        id: "rec-walk-today",
        taskId: "task-walk",
        recordDate: today,
        status: "done",
        note: null,
        isBackfilled: false,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "rec-study-yesterday",
        taskId: "task-study",
        recordDate: addDaysKey(today, -7),
        status: "done",
        note: "完成第二章，整理了 3 个表达。",
        isBackfilled: false,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "rec-walk-yesterday",
        taskId: "task-walk",
        recordDate: addDaysKey(today, -1),
        status: "undone",
        note: "下雨，改室内拉伸。",
        isBackfilled: false,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ];

    this.pauses = [
      {
        taskId: "task-walk",
        pauseDate: addDaysKey(today, 1),
        createdAt: now,
      },
    ];
  }

  async listCategories(): Promise<Category[]> {
    return this.categories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map(cloneCategory);
  }

  async createCategory(input: CategoryInput): Promise<Category> {
    const name = input.name.trim();
    if (this.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("分类名称已存在");
    }
    const now = nowIso();
    const category: Category = {
      id: uuid(),
      name,
      color: input.color,
      sortOrder: input.sortOrder ?? 100,
      isPreset: false,
      createdAt: now,
      updatedAt: now,
    };
    this.categories.push(category);
    return cloneCategory(category);
  }

  async updateCategory(id: string, input: CategoryInput): Promise<Category> {
    const category = this.categories.find((c) => c.id === id);
    if (!category) throw new Error("分类不存在");
    const name = input.name.trim();
    if (
      this.categories.some(
        (c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new Error("分类名称已存在");
    }
    category.name = name;
    category.color = input.color;
    if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder;
    category.updatedAt = nowIso();
    for (const task of this.tasks) {
      if (task.categoryId === id) {
        task.category = cloneCategory(category);
      }
    }
    return cloneCategory(category);
  }

  async deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter((c) => c.id !== id);
    for (const task of this.tasks) {
      if (task.categoryId === id) {
        task.categoryId = null;
        task.category = null;
      }
    }
  }

  async listTags(): Promise<Tag[]> {
    return this.tags
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(cloneTag);
  }

  async createTag(input: TagInput): Promise<Tag> {
    const name = input.name.trim();
    if (this.tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("标签名称已存在");
    }
    const now = nowIso();
    const tag: Tag = {
      id: uuid(),
      name,
      color: input.color,
      createdAt: now,
      updatedAt: now,
    };
    this.tags.push(tag);
    return cloneTag(tag);
  }

  async updateTag(id: string, input: TagInput): Promise<Tag> {
    const tag = this.tags.find((t) => t.id === id);
    if (!tag) throw new Error("标签不存在");
    const name = input.name.trim();
    if (
      this.tags.some(
        (t) => t.id !== id && t.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new Error("标签名称已存在");
    }
    tag.name = name;
    tag.color = input.color;
    tag.updatedAt = nowIso();
    for (const task of this.tasks) {
      task.tags = task.tags.map((item) =>
        item.id === id ? cloneTag(tag) : item,
      );
    }
    return cloneTag(tag);
  }

  async deleteTag(id: string): Promise<void> {
    this.tags = this.tags.filter((t) => t.id !== id);
    for (const task of this.tasks) {
      task.tags = task.tags.filter((tag) => tag.id !== id);
    }
  }

  async listTasks(options?: { includeArchived?: boolean }): Promise<Task[]> {
    return this.tasks
      .filter((task) => options?.includeArchived || !task.archivedAt)
      .map(cloneTask);
  }

  async getTask(id: string): Promise<Task | null> {
    const task = this.tasks.find((item) => item.id === id);
    return task ? cloneTask(task) : null;
  }

  async createTask(input: TaskInput): Promise<Task> {
    const now = nowIso();
    const category = this.categories.find((c) => c.id === input.categoryId) ?? null;
    const task: Task = {
      id: uuid(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      priority: input.priority,
      timeSemantic: input.timeSemantic,
      taskDate: input.taskDate,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      recurrenceRule: input.recurrenceRule || null,
      categoryId: category?.id ?? null,
      completedAt: null,
      isBackfilled: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      tags: this.tags
        .filter((tag) => input.tagIds.includes(tag.id))
        .map(cloneTag),
      category: category ? cloneCategory(category) : null,
    };
    this.tasks.push(task);
    return cloneTask(task);
  }

  async updateTask(id: string, input: TaskInput): Promise<Task> {
    const task = this.tasks.find((item) => item.id === id && !item.archivedAt);
    if (!task) throw new Error("任务不存在或已归档");
    if (task.type !== input.type) throw new Error("任务类型不可修改");
    if (
      task.type === "once" &&
      task.completedAt &&
      (task.taskDate !== input.taskDate ||
        task.startTime !== (input.startTime || null) ||
        task.endTime !== (input.endTime || null) ||
        task.timeSemantic !== input.timeSemantic)
    ) {
      throw new Error("已完成的一次性任务需先取消完成才能修改日期或时间");
    }
    const category = this.categories.find((c) => c.id === input.categoryId) ?? null;
    task.title = input.title.trim();
    task.description = input.description?.trim() || null;
    task.priority = input.priority;
    task.timeSemantic = input.timeSemantic;
    task.taskDate = input.taskDate;
    task.startTime = input.startTime || null;
    task.endTime = input.endTime || null;
    task.recurrenceRule = input.recurrenceRule || null;
    task.categoryId = category?.id ?? null;
    task.category = category ? cloneCategory(category) : null;
    task.tags = this.tags
      .filter((tag) => input.tagIds.includes(tag.id))
      .map(cloneTag);
    task.updatedAt = nowIso();
    return cloneTask(task);
  }

  async archiveTask(id: string): Promise<void> {
    const task = this.tasks.find((item) => item.id === id && !item.archivedAt);
    if (!task) return;
    task.archivedAt = nowIso();
    task.updatedAt = task.archivedAt;
  }

  async setOnceCompletion(
    id: string,
    completed: boolean,
    isBackfilled: boolean,
  ): Promise<void> {
    const task = this.tasks.find(
      (item) => item.id === id && !item.archivedAt && item.type === "once",
    );
    if (!task) throw new Error("任务不存在、已归档或不是一次性任务");
    const today = todayKey();
    if (task.taskDate > today) throw new Error("未来日期不可完成");
    if (completed && isBackfilled !== task.taskDate < today) {
      throw new Error("补做标记与任务日期不一致");
    }
    task.completedAt = completed ? nowIso() : null;
    task.isBackfilled = completed && task.taskDate < today;
    task.updatedAt = nowIso();
  }

  async listRecords(startDate: string, endDate: string): Promise<DailyRecord[]> {
    return this.records
      .filter((record) => record.recordDate >= startDate && record.recordDate <= endDate)
      .sort((a, b) => a.recordDate.localeCompare(b.recordDate))
      .map(cloneRecord);
  }

  async listRecordsForTask(taskId: string): Promise<DailyRecord[]> {
    return this.records
      .filter((record) => record.taskId === taskId)
      .sort((a, b) => b.recordDate.localeCompare(a.recordDate))
      .map(cloneRecord);
  }

  async getRecord(
    taskId: string,
    recordDate: string,
  ): Promise<DailyRecord | null> {
    const record = this.records.find(
      (item) => item.taskId === taskId && item.recordDate === recordDate,
    );
    return record ? cloneRecord(record) : null;
  }

  async upsertRecord(input: DailyRecordInput): Promise<DailyRecord> {
    const task = this.tasks.find(
      (item) => item.id === input.taskId && !item.archivedAt,
    );
    if (!task) throw new Error("任务不存在或已归档");
    if (task.type !== "recurring") throw new Error("只有循环任务可以写每日记录");
    const today = todayKey();
    if (input.recordDate > today) throw new Error("未来日期不可打卡或写备注");
    if (input.recordDate < task.taskDate) {
      throw new Error("该日期早于循环任务开始日期");
    }
    let dates: string[] = [];
    try {
      dates = expandOccurrences(task, input.recordDate, input.recordDate);
    } catch {
      throw new Error("循环规则异常，无法写入该日期");
    }
    if (!dates.includes(input.recordDate)) {
      throw new Error("该日期不是循环任务的发生日期");
    }
    if (
      this.pauses.some(
        (pause) =>
          pause.taskId === input.taskId && pause.pauseDate === input.recordDate,
      )
    ) {
      throw new Error("该日期已暂停，不能写入记录");
    }
    const now = nowIso();
    const isBackfilled = input.status === "done" && input.recordDate < today;
    const existing = this.records.find(
      (item) =>
        item.taskId === input.taskId && item.recordDate === input.recordDate,
    );
    if (existing) {
      existing.status = input.status;
      existing.note = input.note?.trim() || null;
      existing.isBackfilled = isBackfilled;
      existing.completedAt =
        input.status === "done" ? input.completedAt ?? now : null;
      existing.updatedAt = now;
      return cloneRecord(existing);
    }
    const record: DailyRecord = {
      id: uuid(),
      taskId: input.taskId,
      recordDate: input.recordDate,
      status: input.status,
      note: input.note?.trim() || null,
      isBackfilled,
      completedAt: input.status === "done" ? input.completedAt ?? now : null,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    return cloneRecord(record);
  }

  async deleteRecord(taskId: string, recordDate: string): Promise<void> {
    const task = this.tasks.find(
      (item) => item.id === taskId && !item.archivedAt,
    );
    if (!task) throw new Error("任务不存在或已归档");
    if (recordDate > todayKey()) throw new Error("未来日期没有可删除的记录");
    this.records = this.records.filter(
      (record) => !(record.taskId === taskId && record.recordDate === recordDate),
    );
  }

  async listPauses(startDate: string, endDate: string): Promise<TaskPause[]> {
    return this.pauses
      .filter((pause) => pause.pauseDate >= startDate && pause.pauseDate <= endDate)
      .map(clonePause);
  }

  async addPause(taskId: string, pauseDate: string): Promise<void> {
    const task = this.tasks.find(
      (item) => item.id === taskId && !item.archivedAt,
    );
    if (!task) throw new Error("任务不存在或已归档");
    if (task.type !== "recurring") throw new Error("只有循环任务可以暂停某一天");
    if (pauseDate < todayKey()) throw new Error("不能暂停过去的日期");
    let dates: string[] = [];
    try {
      dates = expandOccurrences(task, pauseDate, pauseDate);
    } catch {
      throw new Error("循环规则异常，无法暂停该日期");
    }
    if (!dates.includes(pauseDate)) {
      throw new Error("该日期不是循环任务的发生日期");
    }
    if (
      this.records.some(
        (record) => record.taskId === taskId && record.recordDate === pauseDate,
      )
    ) {
      throw new Error("该日期已有记录，无法暂停");
    }
    if (
      !this.pauses.some(
        (pause) => pause.taskId === taskId && pause.pauseDate === pauseDate,
      )
    ) {
      this.pauses.push({ taskId, pauseDate, createdAt: nowIso() });
    }
  }

  async removePause(taskId: string, pauseDate: string): Promise<void> {
    this.pauses = this.pauses.filter(
      (pause) => !(pause.taskId === taskId && pause.pauseDate === pauseDate),
    );
  }

  async getTheme(): Promise<ThemeMode> {
    return this.theme;
  }

  async setTheme(theme: ThemeMode): Promise<void> {
    this.theme = theme;
  }
}
