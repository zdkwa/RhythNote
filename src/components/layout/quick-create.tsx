import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToday } from "@/hooks/useToday";
import { TaskEditorDialog } from "@/features/tasks/task-editor-dialog";

export function QuickCreate() {
  const today = useToday();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const showButton =
    !location.pathname.startsWith("/tasks") &&
    !location.pathname.startsWith("/day");
  const defaultType =
    location.pathname === "/tasks/recurring"
      ? "recurring"
      : location.pathname === "/tasks/once"
        ? "once"
        : undefined;
  const defaultCategoryId = location.pathname.startsWith("/categories/")
    ? (location.pathname.split("/")[2] ?? null)
    : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        if (
          document.querySelector('[role="dialog"], [role="alertdialog"]')
        ) {
          return;
        }
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      {showButton ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 h-11 rounded-full px-4 shadow-lift"
          aria-label="新建任务"
        >
          <Plus className="h-4 w-4" />
          新建任务
        </Button>
      ) : null}
      <TaskEditorDialog
        open={open}
        onOpenChange={setOpen}
        defaultDate={today}
        defaultType={defaultType}
        defaultCategoryId={defaultCategoryId}
      />
    </>
  );
}
