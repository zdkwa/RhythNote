import { describe, expect, it } from "vitest";
import {
  normalizeReviewIntervals,
  reviewDatesFrom,
  reviewPlanLabel,
  reviewStageForDate,
  reviewStageLabel,
} from "@/domain/review";
import type { Task } from "@/types/domain";

function reviewTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "review-1",
    title: "背英语单词",
    description: null,
    type: "review",
    priority: "medium",
    timeSemantic: "planned",
    taskDate: "2026-10-23",
    startTime: null,
    endTime: null,
    recurrenceRule: null,
    reviewIntervals: [1, 2, 4],
    reviewAnchor: "initial",
    categoryId: null,
    completedAt: null,
    isBackfilled: false,
    archivedAt: null,
    createdAt: "2026-10-23T08:00:00.000Z",
    updatedAt: "2026-10-23T08:00:00.000Z",
    tags: [],
    category: null,
    ...overrides,
  };
}

describe("review schedule", () => {
  it("从首次学习日按偏移计算复习日期", () => {
    expect(reviewDatesFrom("2026-10-23", [1, 2, 4])).toEqual([
      { date: "2026-10-23", stage: 0 },
      { date: "2026-10-24", stage: 1 },
      { date: "2026-10-25", stage: 2 },
      { date: "2026-10-27", stage: 3 },
    ]);
  });

  it("按上次计划复习日累计间隔", () => {
    expect(reviewDatesFrom("2026-10-23", [1, 2, 4], "previous")).toEqual([
      { date: "2026-10-23", stage: 0 },
      { date: "2026-10-24", stage: 1 },
      { date: "2026-10-26", stage: 2 },
      { date: "2026-10-30", stage: 3 },
    ]);
  });

  it("阶段判断与标签", () => {
    const task = reviewTask();
    expect(reviewStageForDate(task, "2026-10-23")).toBe(0);
    expect(reviewStageForDate(task, "2026-10-25")).toBe(2);
    expect(reviewStageForDate(task, "2026-10-26")).toBeNull();
    expect(reviewStageLabel(0, 3)).toBe("首次学习");
    expect(reviewStageLabel(2, 3)).toBe("第 2/3 次复习");
  });

  it("间隔规范化会过滤非法值并排序去重", () => {
    expect(normalizeReviewIntervals([7, 1, 1, 0, -1, 2, 5000])).toEqual([
      1, 2, 7,
    ]);
  });

  it("计划摘要显示锚点和次数", () => {
    expect(reviewPlanLabel(reviewTask())).toBe(
      "首次学习后 1、2、4 天 · 共 3 次",
    );
    expect(
      reviewPlanLabel(reviewTask({ reviewAnchor: "previous" })),
    ).toBe("上次复习后 1、2、4 天 · 共 3 次");
  });
});
