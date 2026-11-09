import { useMutation, useQuery } from "@tanstack/react-query";
import { repository } from "@/data";
import { queryClient } from "@/app/queryClient";
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
  OccurrenceTimeOverride,
} from "@/types/domain";
import type { DailyRecordInput } from "@/data/repository";

export const keys = {
  categories: ["categories"] as const,
  tags: ["tags"] as const,
  plans: ["plans"] as const,
  tasks: (includeArchived: boolean) => ["tasks", { includeArchived }] as const,
  records: (start: string, end: string) => ["records", start, end] as const,
  pauses: (start: string, end: string) => ["pauses", start, end] as const,
  checkinDays: ["checkin-days"] as const,
  timeOverrides: (start: string, end: string) =>
    ["time-overrides", start, end] as const,
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

export function useCheckinDays() {
  return useQuery({
    queryKey: keys.checkinDays,
    queryFn: () => repository.listCheckinDays(),
  });
}

export function useTimeOverrides(
  start: string,
  end: string,
  enabled = true,
) {
  return useQuery({
    queryKey: keys.timeOverrides(start, end),
    queryFn: () => repository.listTimeOverrides(start, end),
    enabled: enabled && Boolean(start && end),
  });
}

export interface WorkspaceBundle {
  tasks: Task[];
  records: DailyRecord[];
  pauses: Array<{ taskId: string; pauseDate: string }>;
  timeOverrides: OccurrenceTimeOverride[];
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
  const timeOverridesQuery = useTimeOverrides(start, end);
  return {
    tasks: tasksQuery.data ?? [],
    records: recordsQuery.data ?? [],
    pauses: pausesQuery.data ?? [],
    timeOverrides: timeOverridesQuery.data ?? [],
    isLoading:
      tasksQuery.isLoading ||
      recordsQuery.isLoading ||
      pausesQuery.isLoading ||
      timeOverridesQuery.isLoading,
    isError:
      tasksQuery.isError ||
      recordsQuery.isError ||
      pausesQuery.isError ||
      timeOverridesQuery.isError,
    error:
      tasksQuery.error ??
      recordsQuery.error ??
      pausesQuery.error ??
      timeOverridesQuery.error,
    refetch: () => {
      void tasksQuery.refetch();
      void recordsQuery.refetch();
      void pausesQuery.refetch();
      void timeOverridesQuery.refetch();
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

export function useSetTimeOverride() {
  return useMutation({
    mutationFn: (override: OccurrenceTimeOverride) =>
      repository.setTimeOverride(override),
    onSuccess: invalidateRecordsAndCalendar,
  });
}

export function useUpdateTaskTimeFrom() {
  return useMutation({
    mutationFn: ({
      taskId,
      timeSemantic,
      startTime,
      endTime,
      fromDate,
    }: {
      taskId: string;
      timeSemantic: "planned" | "deadline";
      startTime: string | null;
      endTime: string | null;
      fromDate: string;
    }) =>
      repository.updateTaskTimeFrom(
        taskId,
        timeSemantic,
        startTime,
        endTime,
        fromDate,
      ),
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

export function usePlans() {
  return useQuery({
    queryKey: keys.plans,
    queryFn: () => repository.listPlans(),
  });
}

const invalidatePlans = () => {
  void queryClient.invalidateQueries({ queryKey: keys.plans });
};

export function useCreatePlan() {
  return useMutation({
    mutationFn: (content: string) => repository.createPlan(content),
    onSuccess: invalidatePlans,
  });
}

export function useUpdatePlan() {
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      repository.updatePlan(id, content),
    onSuccess: invalidatePlans,
  });
}

export function useDeletePlan() {
  return useMutation({
    mutationFn: (id: string) => repository.deletePlan(id),
    onSuccess: invalidatePlans,
  });
}

export function useCreatePlanItem() {
  return useMutation({
    mutationFn: ({ planId, content }: { planId: string; content: string }) =>
      repository.createPlanItem(planId, content),
    onSuccess: invalidatePlans,
  });
}

export function useUpdatePlanItem() {
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      repository.updatePlanItem(id, content),
    onSuccess: invalidatePlans,
  });
}

export function useSetPlanItemDone() {
  return useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) =>
      repository.setPlanItemDone(id, isDone),
    onSuccess: invalidatePlans,
  });
}

export function useDeletePlanItem() {
  return useMutation({
    mutationFn: (id: string) => repository.deletePlanItem(id),
    onSuccess: invalidatePlans,
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
