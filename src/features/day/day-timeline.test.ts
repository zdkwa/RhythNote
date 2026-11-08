import { describe, expect, it } from "vitest";
import { formatDuration } from "@/features/day/day-timeline";

describe("timeline duration labels", () => {
  it("将分钟转换为小时和分钟", () => {
    expect(formatDuration(30)).toBe("30分钟");
    expect(formatDuration(60)).toBe("1小时");
    expect(formatDuration(90)).toBe("1小时30分");
    expect(formatDuration(130)).toBe("2小时10分");
  });
});
