export type TaskType = "once" | "recurring";
export type Priority = "high" | "medium" | "low";
export type TimeSemantic = "planned" | "deadline";
export type RecordStatus = "done" | "undone";
export type ThemeMode = "light" | "dark" | "system";
export type TaskScope = "all" | "today" | "week" | "overdue";

export interface Category {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  priority: Priority;
  timeSemantic: TimeSemantic;
  taskDate: string;
  startTime: string | null;
  endTime: string | null;
  recurrenceRule: string | null;
  categoryId: string | null;
  completedAt: string | null;
  isBackfilled: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  category: Category | null;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  type: TaskType;
  priority: Priority;
  timeSemantic: TimeSemantic;
  taskDate: string;
  startTime?: string | null;
  endTime?: string | null;
  recurrenceRule?: string | null;
  categoryId?: string | null;
  tagIds: string[];
}

export interface DailyRecord {
  id: string;
  taskId: string;
  recordDate: string;
  status: RecordStatus;
  note: string | null;
  isBackfilled: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskPause {
  taskId: string;
  pauseDate: string;
  createdAt: string;
}

export interface Occurrence {
  task: Task;
  date: string;
}

export interface DaySummary {
  date: string;
  total: number;
  done: number;
  unfinished: number;
  paused: number;
  items: DayItem[];
}

export type DayItemKind = "scheduled" | "orphan-done" | "orphan-note";

export interface DayItem {
  key: string;
  kind: DayItemKind;
  task: Task;
  date: string;
  record: DailyRecord | null;
  isPaused: boolean;
  isArchived: boolean;
  isBackfilled: boolean;
}

export interface CategoryInput {
  name: string;
  color: string;
  sortOrder?: number;
}

export interface TagInput {
  name: string;
  color: string;
}

export interface AppSettings {
  theme: ThemeMode;
}

export interface TaskFilters {
  scope: TaskScope;
  type?: TaskType;
  categoryId?: string;
  today: string;
}

export interface TaskWithStatus extends Task {
  todayRecord: DailyRecord | null;
  todayPaused: boolean;
  nextOccurrence: string | null;
}

export interface OccurrenceWithStatus {
  task: Task;
  date: string;
  record: DailyRecord | null;
  isBackfilled: boolean;
  isPaused: boolean;
  isArchived: boolean;
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const TYPE_LABEL: Record<TaskType, string> = {
  once: "临时",
  recurring: "循环",
};

export const TIME_SEMANTIC_LABEL: Record<TimeSemantic, string> = {
  planned: "计划",
  deadline: "截止",
};

export const SCOPE_LABEL: Record<TaskScope, string> = {
  all: "全部",
  today: "今天",
  week: "本周",
  overdue: "逾期",
};
