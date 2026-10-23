import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export function invalidateAll(): void {
  void queryClient.invalidateQueries();
}

export function invalidateTasksAndCalendar(): void {
  void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  void queryClient.invalidateQueries({ queryKey: ["time-overrides"] });
  void queryClient.invalidateQueries({ queryKey: ["checkin-days"] });
  void queryClient.invalidateQueries({ queryKey: ["calendar"] });
  void queryClient.invalidateQueries({ queryKey: ["day"] });
  void queryClient.invalidateQueries({ queryKey: ["occurrences"] });
  void queryClient.invalidateQueries({ queryKey: ["archive"] });
}

export function invalidateRecordsAndCalendar(): void {
  void queryClient.invalidateQueries({ queryKey: ["records"] });
  void queryClient.invalidateQueries({ queryKey: ["pauses"] });
  void queryClient.invalidateQueries({ queryKey: ["time-overrides"] });
  void queryClient.invalidateQueries({ queryKey: ["checkin-days"] });
  void queryClient.invalidateQueries({ queryKey: ["calendar"] });
  void queryClient.invalidateQueries({ queryKey: ["day"] });
  void queryClient.invalidateQueries({ queryKey: ["occurrences"] });
  void queryClient.invalidateQueries({ queryKey: ["tasks"] });
}

export function invalidateTaxonomy(): void {
  void queryClient.invalidateQueries({ queryKey: ["categories"] });
  void queryClient.invalidateQueries({ queryKey: ["tags"] });
  void queryClient.invalidateQueries({ queryKey: ["tasks"] });
}
