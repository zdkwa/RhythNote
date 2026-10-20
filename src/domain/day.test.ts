import { describe, expect, it } from "vitest";
import type { DailyRecord, Task, TaskPause } from "@/types/domain";
import {
  buildCalendarSummaries,
  calendarStateForDate,
  calendarStateFromSummary,
  countCheckinDays,
  isTaskOverdue,
  isTaskStartingSoon,
  minutesFromTimeBlock,
  sortDayItems,
} from "@/domain/day";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "测试循环",
    description: null,
    type: "recurring",
    priority: "medium",
    timeSemantic: "planned",
    taskDate: "2026-10-19",
    startTime: "09:00",
    endTime: "10:00",
    recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,WE,FR;WKST=MO",
    categoryId: null,
    completedAt: null,
    isBackfilled: false,
    archivedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    tags: [],
    category: null,
    ...overrides,
  };
}

function record(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: "record-1",
    taskId: "task-1",
    recordDate: "2026-10-19",
    status: "done",
    note: null,
    isBackfilled: false,
    completedAt: "2026-10-19T01:00:00.000Z",
    createdAt: "2026-10-19T01:00:00.000Z",
    updatedAt: "2026-10-19T01:00:00.000Z",
    ...overrides,
  };
}

function build(
  tasks: Task[],
  records: DailyRecord[] = [],
  pauses: TaskPause[] = [],
) {
  return buildCalendarSummaries({
    tasks,
    records,
    pauses,
    start: "2026-10-19",
    end: "2026-10-25",
  });
}

describe("day summaries", () => {
  it("creates one item per recurring occurrence", () => {
    const summaries = build([task()]);
    expect(summaries.get("2026-10-19")?.total).toBe(1);
    expect(summaries.get("2026-10-21")?.total).toBe(1);
    expect(summaries.get("2026-10-20")?.total).toBe(0);
  });

  it("does not judge recurring dates before the task was created", () => {
    const summaries = buildCalendarSummaries({
      tasks: [
        task({
          taskDate: "2026-10-15",
          createdAt: "2026-10-19T12:00:00.000Z",
          recurrenceRule: "FREQ=DAILY;INTERVAL=1",
        }),
      ],
      records: [],
      pauses: [],
      start: "2026-10-15",
      end: "2026-10-21",
    });
    expect(summaries.get("2026-10-15")?.total).toBe(0);
    expect(summaries.get("2026-10-18")?.total).toBe(0);
    expect(summaries.get("2026-10-19")?.total).toBe(1);
    expect(summaries.get("2026-10-20")?.total).toBe(1);
  });

  it("only marks a task overdue 30 minutes after its end time", () => {
    const target = task({ endTime: "10:00" });
    expect(isTaskOverdue(target, "2026-10-19", false, "2026-10-19", "10:01")).toBe(false);
    expect(isTaskOverdue(target, "2026-10-19", false, "2026-10-19", "10:29")).toBe(false);
    expect(isTaskOverdue(target, "2026-10-19", false, "2026-10-19", "10:30")).toBe(true);
    expect(isTaskOverdue(target, "2026-10-19", true, "2026-10-19", "10:30")).toBe(false);
    expect(isTaskOverdue(target, "2026-10-20", false, "2026-10-19", "10:01")).toBe(false);
  });

  it("counts a check-in day only once no matter how many tasks were done", () => {
    const records = [
      record({ recordDate: "2026-10-19", completedAt: "2026-10-19T10:00:00.000Z" }),
      record({ recordDate: "2026-10-19", completedAt: "2026-10-19T11:00:00.000Z" }),
      record({ recordDate: "2026-10-18", completedAt: "2026-10-18T10:00:00.000Z" }),
    ];
    const once = task({
      type: "once",
      completedAt: "2026-10-19T12:00:00.000Z",
      recurrenceRule: null,
    });
    expect(countCheckinDays([once], records)).toBe(2);
  });

  it("measures distance to the nearest edge of a task time block", () => {
    expect(
      minutesFromTimeBlock(
        task({ startTime: "22:00", endTime: "23:00" }),
        "2026-10-19",
        "2026-10-19",
        "21:50",
      ),
    ).toBe(10);
    expect(
      minutesFromTimeBlock(
        task({ startTime: "20:00", endTime: "21:00" }),
        "2026-10-19",
        "2026-10-19",
        "21:50",
      ),
    ).toBe(50);
    expect(
      minutesFromTimeBlock(
        task({ startTime: "22:00", endTime: "23:00" }),
        "2026-10-19",
        "2026-10-19",
        "22:30",
      ),
    ).toBe(0);
    expect(
      minutesFromTimeBlock(
        task({ startTime: null, endTime: null }),
        "2026-10-19",
        "2026-10-19",
        "21:50",
      ),
    ).toBe(Number.POSITIVE_INFINITY);
  });

  it("marks tasks starting within 20 minutes as starting soon", () => {
    const target = task({ startTime: "22:00", endTime: "23:00" });
    expect(isTaskStartingSoon(target, "2026-10-19", "2026-10-19", "21:41")).toBe(true);
    expect(isTaskStartingSoon(target, "2026-10-19", "2026-10-19", "21:39")).toBe(false);
    expect(isTaskStartingSoon(target, "2026-10-19", "2026-10-19", "21:59")).toBe(true);
    expect(isTaskStartingSoon(target, "2026-10-19", "2026-10-19", "22:00")).toBe(false);
  });

  it("treats a task without a time as overdue only on the next day", () => {
    const target = task({ endTime: null });
    expect(isTaskOverdue(target, "2026-10-19", false, "2026-10-19", "23:59")).toBe(false);
    expect(isTaskOverdue(target, "2026-10-18", false, "2026-10-19", "10:00")).toBe(true);
  });

  it("merges records and computes green/yellow/red", () => {
    const summaries = build([task()], [record()]);
    expect(summaries.get("2026-10-19")?.done).toBe(1);
    expect(
      calendarStateFromSummary(summaries.get("2026-10-19")!),
    ).toBe("green");
    expect(
      calendarStateFromSummary(summaries.get("2026-10-21")!),
    ).toBe("red");
    expect(
      calendarStateFromSummary(summaries.get("2026-10-20")!),
    ).toBe("none");
  });

  it("marks future dates with tasks as upcoming instead of unfinished", () => {
    const summaries = build([task()]);
    expect(
      calendarStateForDate(
        summaries.get("2026-10-21")!,
        "2026-10-21",
        "2026-10-19",
      ),
    ).toBe("upcoming");
    expect(
      calendarStateForDate(
        summaries.get("2026-10-19")!,
        "2026-10-19",
        "2026-10-19",
      ),
    ).toBe("red");
  });

  it("excludes paused dates from totals", () => {
    const summaries = build(
      [task()],
      [],
      [{ taskId: "task-1", pauseDate: "2026-10-21", createdAt: "" }],
    );
    const summary = summaries.get("2026-10-21")!;
    expect(summary.total).toBe(0);
    expect(summary.paused).toBe(1);
    expect(
      calendarStateFromSummary(summary),
    ).toBe("none");
  });

  it("suppresses occurrences after archive date but keeps earlier history", () => {
    const archived = task({
      archivedAt: "2026-10-20T12:00:00.000Z",
    });
    const summaries = build([archived]);
    expect(summaries.get("2026-10-19")?.total).toBe(1);
    expect(summaries.get("2026-10-21")?.total).toBe(0);
    expect(summaries.get("2026-10-23")?.total).toBe(0);
  });

  it("retains archived task occurrence on archive day only when a record exists", () => {
    const archived = task({ archivedAt: "2026-10-19T12:00:00.000Z" });
    const withoutRecord = build([archived]);
    expect(withoutRecord.get("2026-10-19")?.total).toBe(0);

    const withRecord = build([archived], [record()]);
    expect(withRecord.get("2026-10-19")?.total).toBe(1);
    expect(withRecord.get("2026-10-19")?.done).toBe(1);
  });

  it("counts a done orphan record but not an undone orphan note", () => {
    const done = build(
      [task()],
      [record({ recordDate: "2026-10-20", status: "done" })],
    );
    expect(done.get("2026-10-20")?.total).toBe(1);
    expect(done.get("2026-10-20")?.done).toBe(1);

    const note = build(
      [task()],
      [record({ recordDate: "2026-10-20", status: "undone", completedAt: null })],
    );
    expect(note.get("2026-10-20")?.total).toBe(0);
    expect(note.get("2026-10-20")?.items[0]?.kind).toBe("orphan-note");
  });

  it("keeps a completed once task on its archive date", () => {
    const once = task({
      id: "task-once-archived",
      type: "once",
      recurrenceRule: null,
      taskDate: "2026-10-19",
      completedAt: "2026-10-19T01:00:00.000Z",
      archivedAt: "2026-10-19T12:00:00.000Z",
    });
    const summaries = build([once]);
    expect(summaries.get("2026-10-19")?.done).toBe(1);
    expect(summaries.get("2026-10-19")?.total).toBe(1);
  });

  it("counts completed once tasks and keeps them on their task date", () => {
    const once = task({
      id: "task-once",
      type: "once",
      recurrenceRule: null,
      taskDate: "2026-10-20",
      completedAt: "2026-10-22T01:00:00.000Z",
      isBackfilled: true,
    });
    const summaries = build([once]);
    expect(summaries.get("2026-10-20")?.done).toBe(1);
    expect(summaries.get("2026-10-20")?.total).toBe(1);
  });

  it("puts the current time block before higher priority later tasks", () => {
    const current = task({
      id: "a",
      priority: "low",
      startTime: "09:00",
      endTime: "10:00",
    });
    const later = task({
      id: "b",
      priority: "high",
      startTime: "18:00",
      endTime: "19:00",
    });
    const summaries = build([current, later]);
    const items = summaries.get("2026-10-19")!.items;
    const sorted = sortDayItems(items, "2026-10-19", "09:30");
    expect(sorted[0]?.task.id).toBe("a");
  });
});
