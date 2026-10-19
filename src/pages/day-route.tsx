import { useState } from "react";
import type { Task } from "@/types/domain";
import { DayPage } from "@/pages/day-page";
import { TaskEditorDialog } from "@/features/tasks/task-editor-dialog";

export function DayRoute() {
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  const openCreate = (date: string) => {
    setEditingTask(null);
    setDefaultDate(date);
    setOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setDefaultDate(task.taskDate);
    setOpen(true);
  };

  return (
    <>
      <DayPage onCreateTask={openCreate} onEditTask={openEdit} />
      <TaskEditorDialog
        open={open}
        onOpenChange={setOpen}
        task={editingTask}
        defaultDate={defaultDate}
      />
    </>
  );
}
