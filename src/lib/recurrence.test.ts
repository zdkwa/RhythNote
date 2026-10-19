import { describe, expect, it } from "vitest";
import type { Task } from "@/types/domain";
import {
  buildRecurrenceRule,
  canonicalizeRule,
  describeRecurrence,
  expandOccurrences,
  nextOccurrence,
  parseRule,
  parseRuleSummary,
  validateRecurrence,
} from "@/lib/recurrence";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-test",
    title: "测试任务",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    tags: [],
    category: null,
    ...overrides,
  };
}

describe("recurrence", () => {
  it("parses YEARLY even though freq is numeric zero", () => {
    const options = parseRule("FREQ=YEARLY;BYMONTH=10;BYMONTHDAY=19");
    expect(options.freq).toBe(0);
  });

  it("describes weekly rules in Chinese", () => {
    expect(describeRecurrence("FREQ=WEEKLY;BYDAY=MO,WE,FR;WKST=MO")).toBe(
      "每周一、三、五",
    );
  });

  it("describes yearly rules instead of falling into yearly by accident", () => {
    expect(
      describeRecurrence("FREQ=YEARLY;BYMONTH=10;BYMONTHDAY=19"),
    ).toBe("每年 10 月 19 日");
  });

  it("describes monthly ordinal weekday rules", () => {
    expect(describeRecurrence("FREQ=MONTHLY;BYDAY=2TU")).toBe(
      "每月第 2 个周二",
    );
  });

  it("expands a weekly rule", () => {
    const dates = expandOccurrences(
      task(),
      "2026-10-19",
      "2026-10-31",
    );
    expect(dates).toEqual([
      "2026-10-19",
      "2026-10-21",
      "2026-10-23",
      "2026-10-26",
      "2026-10-28",
      "2026-10-30",
    ]);
  });

  it("returns the next occurrence without losing the current day", () => {
    expect(nextOccurrence(task(), "2026-10-20")).toBe("2026-10-21");
  });

  it("builds UNTIL as a real UTC instant", () => {
    const rule = buildRecurrenceRule({
      freq: "WEEKLY",
      interval: 1,
      byWeekday: ["MO"],
      monthDay: 19,
      baseDate: "2026-10-19",
      endType: "until",
      untilDate: "2026-12-31",
      count: 10,
    });
    expect(rule).toContain("UNTIL=20261231T155959Z");
    expect(rule).not.toContain("DTSTART");
    expect(validateRecurrence(rule, "2026-10-19", "09:00")).toBeNull();
  });

  it("canonicalizes and rejects DTSTART", () => {
    expect(canonicalizeRule("rrule:FREQ=DAILY;INTERVAL=1")).toBe(
      "FREQ=DAILY;INTERVAL=1",
    );
    expect(() =>
      canonicalizeRule("DTSTART:20261019T090000Z\nRRULE:FREQ=DAILY"),
    ).toThrow();
  });

  it("parses ordinal weekdays without losing the ordinal", () => {
    const summary = parseRuleSummary("FREQ=MONTHLY;BYDAY=2TU");
    expect(summary?.byWeekdayOrdinals[0]).toEqual({ code: "TU", n: 2 });
  });
});
