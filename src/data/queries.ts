import { useMutation, useQuery } from "@tanstack/react-query";
import { repository } from "@/data";
import {
  invalidateAll,
  invalidateRecordsAndCalendar,
  invalidateTasksAndCalendar,
  invalidateTaxonomy,
} from "@/app/queryClient";
import type {
  CategoryInput,
  DailyRecord,
  TagInput,
  Task,
  TaskInput,
  ThemeMode,
} from "@/types/domain";
import type { DailyRecordInput } from "@/data/repository";

export const keys = {
  categories: ["categories"] as const,
  tags: ["tags"] as const,
  tasks: (includeArchived: boolean) => ["tasks", { includeArchived }] as const,
  records: (start: string, end: string) => ["records", start, end] as const,
  pauses: (start: string, end: string) => ["pauses", start, end] as const,
  archive: ["archive"] as const,
  calendar: (month: string) => ["calendar", month] as const,
  day: (date: string) => ["day", date] as const,
  occurrences: (scope: string, date: string) =>
    ["occurrences", scope, date] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: () => repository.listCategories(),
  });
}

export function useTags() {
  return useQuery({
    queryKey: keys.tags,
    queryFn: () => repository.listTags(),
  });
}

export function useTasks(includeArchived = false) {
  return useQuery({
    queryKey: keys.tasks(includeArchived),
    queryFn: () => repository.listTasks({ includeArchived }),
  });
}

export function useRecords(start: string, end: string, enabled = true) {
  return useQuery({
    queryKey: keys.records(start, end),
    queryFn: () => repository.listRecords(start, end),
    enabled: enabled && Boolean(start && end),
  });
}

export function usePauses(start: string, end: string, enabled = true) {
  return useQuery({
    queryKey: keys.pauses(start, end),
    queryFn: () => repository.listPauses(start, end),
    enabled: enabled && Boolean(start && end),
  });
}

export interface WorkspaceBundle {
  tasks: Task[];
  records: DailyRecord[];
  pauses: Array<{ taskId: string; pauseDate: string }>;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

export function useWorkspaceBundle(
  start: string,
  end: string,
  includeArchived: boolean,
): WorkspaceBundle {
  const tasksQuery = useTasks(includeArchived);
  const recordsQuery = useRecords(start, end);
  const pausesQuery = usePauses(start, end);
  return {
    tasks: tasksQuery.data ?? [],
    records: recordsQuery.data ?? [],
    pauses: pausesQuery.data ?? [],
    isLoading:
      tasksQuery.isLoading || recordsQuery.isLoading || pausesQuery.isLoading,
    isError: tasksQuery.isError || recordsQuery.isError || pausesQuery.isError,
    error: tasksQuery.error ?? recordsQuery.error ?? pausesQuery.error,
    refetch: () => {
      void tasksQuery.refetch();
      void recordsQuery.refetch();
      void pausesQuery.refetch();
    },
  };
}

export function useCreateTask() {
  return useMutation({
    mutationFn: (input: TaskInput) => repository.createTask(input),
    onSuccess: invalidateTasksAndCalendar,
  });
}

export function useUpdateTask() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskInput }) =>
      repository.updateTask(id, input),
    onSuccess: invalidateTasksAndCalendar,
  });
}

export function useArchiveTask() {
  return useMutation({
    mutationFn: (id: string) => repository.archiveTask(id),
    onSuccess: invalidateTasksAndCalendar,
  });
}

export function useSetOnceCompletion() {
  return useMutation({
    mutationFn: ({
      id,
      completed,
      isBackfilled,
    }: {
      id: string;
      completed: boolean;
      isBackfilled: boolean;
    }) => repository.setOnceCompletion(id, completed, isBackfilled),
    onSuccess: invalidateRecordsAndCalendar,
  });
}

export function useUpsertRecord() {
  return useMutation({
    mutationFn: (input: DailyRecordInput) => repository.upsertRecord(input),
    onSuccess: invalidateRecordsAndCalendar,
  });
}

export function useDeleteRecord() {
  return useMutation({
    mutationFn: ({
      taskId,
      recordDate,
    }: {
      taskId: string;
      recordDate: string;
    }) => repository.deleteRecord(taskId, recordDate),
    onSuccess: invalidateRecordsAndCalendar,
  });
}

export function useAddPause() {
  return useMutation({
    mutationFn: ({
      taskId,
      pauseDate,
    }: {
      taskId: string;
      pauseDate: string;
    }) => repository.addPause(taskId, pauseDate),
    onSuccess: invalidateRecordsAndCalendar,
  });
}

export function useRemovePause() {
  return useMutation({
    mutationFn: ({
      taskId,
      pauseDate,
    }: {
      taskId: string;
      pauseDate: string;
    }) => repository.removePause(taskId, pauseDate),
    onSuccess: invalidateRecordsAndCalendar,
  });
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: (input: CategoryInput) => repository.createCategory(input),
    onSuccess: invalidateTaxonomy,
  });
}

export function useUpdateCategory() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      repository.updateCategory(id, input),
    onSuccess: invalidateTaxonomy,
  });
}

export function useDeleteCategory() {
  return useMutation({
    mutationFn: (id: string) => repository.deleteCategory(id),
    onSuccess: invalidateAll,
  });
}

export function useCreateTag() {
  return useMutation({
    mutationFn: (input: TagInput) => repository.createTag(input),
    onSuccess: invalidateTaxonomy,
  });
}

export function useUpdateTag() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TagInput }) =>
      repository.updateTag(id, input),
    onSuccess: invalidateTaxonomy,
  });
}

export function useDeleteTag() {
  return useMutation({
    mutationFn: (id: string) => repository.deleteTag(id),
    onSuccess: invalidateAll,
  });
}

export function useThemeSetting() {
  return useQuery({
    queryKey: ["settings", "theme"],
    queryFn: () => repository.getTheme(),
  });
}

export function useSetTheme() {
  return useMutation({
    mutationFn: (theme: ThemeMode) => repository.setTheme(theme),
  });
}
