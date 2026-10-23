import { QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { queryClient } from "@/app/queryClient";
import { ErrorBoundary } from "@/app/error-boundary";
import { ThemeProvider } from "@/hooks/useTheme";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/app-shell";
import { HomePage } from "@/pages/home-page";
import { DayRoute } from "@/pages/day-route";
import { TasksPage } from "@/pages/tasks-page";
import { SettingsPage } from "@/pages/settings-page";
import { NotFoundPage } from "@/pages/not-found-page";

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider delayDuration={180}>
            <HashRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<HomePage />} />
                  <Route path="day/:date" element={<DayRoute />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route
                    path="tasks/once"
                    element={<Navigate to="/tasks?type=once" replace />}
                  />
                  <Route
                    path="tasks/recurring"
                    element={<Navigate to="/tasks?type=recurring" replace />}
                  />
                  <Route
                    path="tasks/review"
                    element={<Navigate to="/tasks?type=review" replace />}
                  />
                  <Route
                    path="categories/:categoryId"
                    element={<TasksPage />}
                  />
                  <Route
                    path="settings"
                    element={<Navigate to="/settings/general" replace />}
                  />
                  <Route path="settings/:section" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </HashRouter>
          </TooltipProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              className:
                "!bg-card !text-card-foreground !border-border !shadow-lift",
            }}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
