import type Database from "@tauri-apps/plugin-sql";
import { getDatabase } from "@/data/db";
import type { DailyRecordInput, Repository } from "@/data/repository";
import type {
  Category,
  CategoryInput,
  DailyRecord,
  RecordStatus,
  Tag,
  TagInput,
  Task,
  TaskInput,
  TaskPause,
  ThemeMode,
} from "@/types/domain";
import { uuid } from "@/lib/utils";
import { todayKey } from "@/lib/date";
import { expandOccurrences } from "@/lib/recurrence";

interface CategoryRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  is_preset: number;
  created_at: string;
  updated_at: string;
}

interface TagRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  type: "once" | "recurring";
  priority: "high" | "medium" | "low";
  time_semantic: "planned" | "deadline";
  task_date: string;
  start_time: string | null;
  end_time: string | null;
  recurrence_rule: string | null;
  category_id: string | null;
  completed_at: string | null;
  is_backfilled: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RecordRow {
  id: string;
  task_id: string;
  record_date: string;
  status: RecordStatus;
  note: string | null;
  is_backfilled: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PauseRow {
  task_id: string;
  pause_date: string;
  created_at: string;
}

interface TagLinkRow extends TagRow {
  task_id: string;
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    isPreset: row.is_preset === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecord(row: RecordRow): DailyRecord {
  return {
    id: row.id,
    taskId: row.task_id,
    recordDate: row.record_date,
    status: row.status,
    note: row.note,
    isBackfilled: row.is_backfilled === 1,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPause(row: PauseRow): TaskPause {
  return {
    taskId: row.task_id,
    pauseDate: row.pause_date,
    createdAt: row.created_at,
  };
}

function mapTask(
  row: TaskRow,
  tags: Tag[],
  category: Category | null,
): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    priority: row.priority,
    timeSemantic: row.time_semantic,
    taskDate: row.task_date,
    startTime: row.start_time,
    endTime: row.end_time,
    recurrenceRule: row.recurrence_rule,
    categoryId: row.category_id,
    completedAt: row.completed_at,
    isBackfilled: row.is_backfilled === 1,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
    category,
  };
}

async function getDb(): Promise<Database> {
  return getDatabase();
}

export class SqliteRepository implements Repository {
  async listCategories(): Promise<Category[]> {
    const db = await getDb();
    const rows = await db.select<CategoryRow[]>(
      "SELECT * FROM categories ORDER BY sort_order ASC, name ASC",
    );
    return rows.map(mapCategory);
  }

  async createCategory(input: CategoryInput): Promise<Category> {
    const db = await getDb();
    const now = new Date().toISOString();
    const category: Category = {
      id: uuid(),
      name: input.name.trim(),
      color: input.color,
      sortOrder: input.sortOrder ?? 100,
      isPreset: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.execute(
      "INSERT INTO categories (id, name, color, sort_order, is_preset, created_at, updated_at) VALUES ($1, $2, $3, $4, 0, $5, $5)",
      [
        category.id,
        category.name,
        category.color,
        category.sortOrder,
        now,
      ],
    );
    return category;
  }

  async updateCategory(id: string, input: CategoryInput): Promise<Category> {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.execute(
      "UPDATE categories SET name = $1, color = $2, sort_order = COALESCE($3, sort_order), updated_at = $4 WHERE id = $5",
      [input.name.trim(), input.color, input.sortOrder ?? null, now, id],
    );
    const all = await this.listCategories();
    const category = all.find((item) => item.id === id);
    if (!category) throw new Error("分类不存在");
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM categories WHERE id = $1", [id]);
  }

  async listTags(): Promise<Tag[]> {
    const db = await getDb();
    const rows = await db.select<TagRow[]>(
      "SELECT * FROM tags ORDER BY name COLLATE NOCASE ASC",
    );
    return rows.map(mapTag);
  }

  async createTag(input: TagInput): Promise<Tag> {
    const db = await getDb();
    const now = new Date().toISOString();
    const tag: Tag = {
      id: uuid(),
      name: input.name.trim(),
      color: input.color,
      createdAt: now,
      updatedAt: now,
    };
    await db.execute(
      "INSERT INTO tags (id, name, color, created_at, updated_at) VALUES ($1, $2, $3, $4, $4)",
      [tag.id, tag.name, tag.color, now],
    );
    return tag;
  }

  async updateTag(id: string, input: TagInput): Promise<Tag> {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.execute(
      "UPDATE tags SET name = $1, color = $2, updated_at = $3 WHERE id = $4",
      [input.name.trim(), input.color, now, id],
    );
    const tags = await this.listTags();
    const tag = tags.find((item) => item.id === id);
    if (!tag) throw new Error("标签不存在");
    return tag;
  }

  async deleteTag(id: string): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM tags WHERE id = $1", [id]);
  }

  private async loadTagMap(): Promise<Map<string, Tag[]>> {
    const db = await getDb();
    const rows = await db.select<TagLinkRow[]>(
      "SELECT tt.task_id, t.id, t.name, t.color, t.created_at, t.updated_at FROM task_tags tt JOIN tags t ON t.id = tt.tag_id ORDER BY t.name COLLATE NOCASE",
    );
    const map = new Map<string, Tag[]>();
    for (const row of rows) {
      const list = map.get(row.task_id) ?? [];
      list.push(mapTag(row));
      map.set(row.task_id, list);
    }
    return map;
  }

  async listTasks(options?: {
    includeArchived?: boolean;
  }): Promise<Task[]> {
    const db = await getDb();
    const where = options?.includeArchived ? "" : "WHERE archived_at IS NULL";
    const rows = await db.select<TaskRow[]>(
      `SELECT * FROM tasks ${where} ORDER BY created_at ASC`,
    );
    const [categories, tagMap] = await Promise.all([
      this.listCategories(),
      this.loadTagMap(),
    ]);
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    return rows.map((row) =>
      mapTask(
        row,
        tagMap.get(row.id) ?? [],
        row.category_id ? (categoryMap.get(row.category_id) ?? null) : null,
      ),
    );
  }

  async getTask(id: string): Promise<Task | null> {
    const db = await getDb();
    const rows = await db.select<TaskRow[]>(
      "SELECT * FROM tasks WHERE id = $1",
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    const [categories, tags] = await Promise.all([
      this.listCategories(),
      this.loadTagMap(),
    ]);
    const category = row.category_id
      ? (categories.find((item) => item.id === row.category_id) ?? null)
      : null;
    return mapTask(row, tags.get(id) ?? [], category);
  }

  private async requireActiveTask(taskId: string): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error("任务不存在");
    if (task.archivedAt) throw new Error("任务已归档，不能修改记录");
    return task;
  }

  private assertOccurrence(task: Task, date: string): void {
    if (task.type !== "recurring" || !task.recurrenceRule) {
      throw new Error("只有循环任务可以写入每日记录");
    }
    if (date < task.taskDate) {
      throw new Error("该日期早于循环任务开始日期");
    }
    let dates: string[] = [];
    try {
      dates = expandOccurrences(task, date, date);
    } catch {
      throw new Error("循环规则异常，无法写入该日期");
    }
    if (!dates.includes(date)) {
      throw new Error("该日期不是循环任务的发生日期");
    }
  }

  private async syncTags(taskId: string, tagIds: string[]): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM task_tags WHERE task_id = $1", [taskId]);
    const now = new Date().toISOString();
    for (const tagId of [...new Set(tagIds)]) {
      await db.execute(
        "INSERT OR IGNORE INTO task_tags (task_id, tag_id, created_at) VALUES ($1, $2, $3)",
        [taskId, tagId, now],
      );
    }
  }

  async createTask(input: TaskInput): Promise<Task> {
    const db = await getDb();
    const now = new Date().toISOString();
    const id = uuid();
    await db.execute(
      `INSERT INTO tasks (
        id, title, description, type, priority, time_semantic, task_date,
        start_time, end_time, recurrence_rule, category_id, completed_at,
        is_backfilled, archived_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, 0, NULL, $12, $12)`,
      [
        id,
        input.title.trim(),
        input.description?.trim() || null,
        input.type,
        input.priority,
        input.timeSemantic,
        input.taskDate,
        input.startTime || null,
        input.endTime || null,
        input.recurrenceRule || null,
        input.categoryId || null,
        now,
      ],
    );
    await this.syncTags(id, input.tagIds);
    const task = await this.getTask(id);
    if (!task) throw new Error("任务创建失败");
    return task;
  }

  async updateTask(id: string, input: TaskInput): Promise<Task> {
    const existing = await this.requireActiveTask(id);
    if (existing.type !== input.type) {
      throw new Error("任务类型不可修改");
    }
    if (
      existing.type === "once" &&
      existing.completedAt &&
      (existing.taskDate !== input.taskDate ||
        existing.startTime !== (input.startTime || null) ||
        existing.endTime !== (input.endTime || null) ||
        existing.timeSemantic !== input.timeSemantic)
    ) {
      throw new Error("已完成的一次性任务需先取消完成才能修改日期或时间");
    }
    const db = await getDb();
    const now = new Date().toISOString();
    await db.execute(
      `UPDATE tasks SET
        title = $1, description = $2, priority = $3, time_semantic = $4,
        task_date = $5, start_time = $6, end_time = $7, recurrence_rule = $8,
        category_id = $9, updated_at = $10
      WHERE id = $11 AND archived_at IS NULL`,
      [
        input.title.trim(),
        input.description?.trim() || null,
        input.priority,
        input.timeSemantic,
        input.taskDate,
        input.startTime || null,
        input.endTime || null,
        input.recurrenceRule || null,
        input.categoryId || null,
        now,
        id,
      ],
    );
    await this.syncTags(id, input.tagIds);
    const task = await this.getTask(id);
    if (!task) throw new Error("任务不存在或已归档");
    return task;
  }

  async archiveTask(id: string): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.execute(
      "UPDATE tasks SET archived_at = $1, updated_at = $1 WHERE id = $2 AND archived_at IS NULL",
      [now, id],
    );
  }

  async setOnceCompletion(
    id: string,
    completed: boolean,
    isBackfilled: boolean,
  ): Promise<void> {
    const task = await this.requireActiveTask(id);
    if (task.type !== "once") {
      throw new Error("循环任务请使用每日记录完成");
    }
    const today = todayKey();
    if (task.taskDate > today) {
      throw new Error("未来日期不可完成");
    }
    if (completed && isBackfilled !== task.taskDate < today) {
      throw new Error("补做标记与任务日期不一致");
    }
    const db = await getDb();
    const now = new Date().toISOString();
    await db.execute(
      "UPDATE tasks SET completed_at = $1, is_backfilled = $2, updated_at = $3 WHERE id = $4 AND archived_at IS NULL AND type = 'once'",
      [completed ? now : null, completed && task.taskDate < today ? 1 : 0, now, id],
    );
  }

  async listRecords(startDate: string, endDate: string): Promise<DailyRecord[]> {
    const db = await getDb();
    const rows = await db.select<RecordRow[]>(
      "SELECT * FROM daily_records WHERE record_date BETWEEN $1 AND $2 ORDER BY record_date ASC",
      [startDate, endDate],
    );
    return rows.map(mapRecord);
  }

  async listRecordsForTask(taskId: string): Promise<DailyRecord[]> {
    const db = await getDb();
    const rows = await db.select<RecordRow[]>(
      "SELECT * FROM daily_records WHERE task_id = $1 ORDER BY record_date DESC",
      [taskId],
    );
    return rows.map(mapRecord);
  }

  async getRecord(
    taskId: string,
    recordDate: string,
  ): Promise<DailyRecord | null> {
    const db = await getDb();
    const rows = await db.select<RecordRow[]>(
      "SELECT * FROM daily_records WHERE task_id = $1 AND record_date = $2",
      [taskId, recordDate],
    );
    return rows[0] ? mapRecord(rows[0]) : null;
  }

  async upsertRecord(input: DailyRecordInput): Promise<DailyRecord> {
    const task = await this.requireActiveTask(input.taskId);
    const today = todayKey();
    if (input.recordDate > today) {
      throw new Error("未来日期不可打卡或写备注");
    }
    this.assertOccurrence(task, input.recordDate);
    const db = await getDb();
    const paused = await db.select<Array<{ task_id: string }>>(
      "SELECT task_id FROM task_pauses WHERE task_id = $1 AND pause_date = $2",
      [input.taskId, input.recordDate],
    );
    if (paused.length > 0) {
      throw new Error("该日期已暂停，不能写入记录");
    }
    const now = new Date().toISOString();
    const note = input.note?.trim() || null;
    const isBackfilled =
      input.status === "done" && input.recordDate < today;
    const completedAt =
      input.status === "done" ? (input.completedAt ?? now) : null;
    await db.execute(
      `INSERT INTO daily_records (
        id, task_id, record_date, status, note, is_backfilled,
        completed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      ON CONFLICT(task_id, record_date) DO UPDATE SET
        status = excluded.status,
        note = excluded.note,
        is_backfilled = excluded.is_backfilled,
        completed_at = excluded.completed_at,
        updated_at = excluded.updated_at`,
      [
        uuid(),
        input.taskId,
        input.recordDate,
        input.status,
        note,
        isBackfilled ? 1 : 0,
        completedAt,
        now,
      ],
    );
    const record = await this.getRecord(input.taskId, input.recordDate);
    if (!record) throw new Error("记录保存失败");
    return record;
  }

  async deleteRecord(taskId: string, recordDate: string): Promise<void> {
    await this.requireActiveTask(taskId);
    if (recordDate > todayKey()) {
      throw new Error("未来日期没有可删除的记录");
    }
    const db = await getDb();
    await db.execute(
      "DELETE FROM daily_records WHERE task_id = $1 AND record_date = $2",
      [taskId, recordDate],
    );
  }

  async listPauses(startDate: string, endDate: string): Promise<TaskPause[]> {
    const db = await getDb();
    const rows = await db.select<PauseRow[]>(
      "SELECT * FROM task_pauses WHERE pause_date BETWEEN $1 AND $2 ORDER BY pause_date ASC",
      [startDate, endDate],
    );
    return rows.map(mapPause);
  }

  async addPause(taskId: string, pauseDate: string): Promise<void> {
    const task = await this.requireActiveTask(taskId);
    if (task.type !== "recurring") {
      throw new Error("只有循环任务可以暂停某一天");
    }
    if (pauseDate < todayKey()) {
      throw new Error("不能暂停过去的日期");
    }
    this.assertOccurrence(task, pauseDate);
    const existing = await this.getRecord(taskId, pauseDate);
    if (existing) {
      throw new Error("该日期已有记录，无法暂停");
    }
    const db = await getDb();
    await db.execute(
      "INSERT OR IGNORE INTO task_pauses (task_id, pause_date, created_at) VALUES ($1, $2, $3)",
      [taskId, pauseDate, new Date().toISOString()],
    );
  }

  async removePause(taskId: string, pauseDate: string): Promise<void> {
    await this.requireActiveTask(taskId);
    const db = await getDb();
    await db.execute(
      "DELETE FROM task_pauses WHERE task_id = $1 AND pause_date = $2",
      [taskId, pauseDate],
    );
  }

  async getTheme(): Promise<ThemeMode> {
    const db = await getDb();
    const rows = await db.select<Array<{ value: string }>>(
      "SELECT value FROM app_settings WHERE key = 'theme'",
    );
    const value = rows[0]?.value;
    return value === "light" || value === "dark" || value === "system"
      ? value
      : "system";
  }

  async setTheme(theme: ThemeMode): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ('theme', $1, $2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [theme, now],
    );
  }
}
