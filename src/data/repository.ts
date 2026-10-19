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

export interface DailyRecordInput {
  taskId: string;
  recordDate: string;
  status: RecordStatus;
  note?: string | null;
  isBackfilled: boolean;
  completedAt?: string | null;
}

export interface Repository {
  listCategories(): Promise<Category[]>;
  createCategory(input: CategoryInput): Promise<Category>;
  updateCategory(id: string, input: CategoryInput): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  listTags(): Promise<Tag[]>;
  createTag(input: TagInput): Promise<Tag>;
  updateTag(id: string, input: TagInput): Promise<Tag>;
  deleteTag(id: string): Promise<void>;

  listTasks(options?: { includeArchived?: boolean }): Promise<Task[]>;
  getTask(id: string): Promise<Task | null>;
  createTask(input: TaskInput): Promise<Task>;
  updateTask(id: string, input: TaskInput): Promise<Task>;
  archiveTask(id: string): Promise<void>;
  setOnceCompletion(
    id: string,
    completed: boolean,
    isBackfilled: boolean,
  ): Promise<void>;

  listRecords(startDate: string, endDate: string): Promise<DailyRecord[]>;
  listRecordsForTask(taskId: string): Promise<DailyRecord[]>;
  getRecord(taskId: string, recordDate: string): Promise<DailyRecord | null>;
  upsertRecord(input: DailyRecordInput): Promise<DailyRecord>;
  deleteRecord(taskId: string, recordDate: string): Promise<void>;

  listPauses(startDate: string, endDate: string): Promise<TaskPause[]>;
  addPause(taskId: string, pauseDate: string): Promise<void>;
  removePause(taskId: string, pauseDate: string): Promise<void>;

  getTheme(): Promise<ThemeMode>;
  setTheme(theme: ThemeMode): Promise<void>;
}
