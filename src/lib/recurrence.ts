import { format, parse, set } from "date-fns";
import { zhCN } from "date-fns/locale";
import { RRule, type ByWeekday, type Options } from "rrule";
import type { Task } from "@/types/domain";
import { localDayBounds, parseDateKey, toDateKey } from "@/lib/date";

export type RuleFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type RuleEndType = "never" | "until" | "count";

export interface RuleBuilderState {
  freq: RuleFrequency;
  interval: number;
  byWeekday: string[];
  monthDay: number;
  endType: RuleEndType;
  untilDate: string;
  count: number;
}

export interface ParsedRuleSummary {
  freq: RuleFrequency;
  interval: number;
  byWeekday: string[];
  monthDay: number | null;
  month: number | null;
  endType: RuleEndType;
  until: Date | null;
  count: number | null;
}

const WEEKDAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
const WEEKDAY_LABELS: Record<string, string> = {
  MO: "周一",
  TU: "周二",
  WE: "周三",
  TH: "周四",
  FR: "周五",
  SA: "周六",
  SU: "周日",
};

export const WEEKDAY_OPTIONS = WEEKDAY_CODES.map((code, i) => ({
  code,
  label: WEEKDAY_LABELS[code],
  index: i,
}));

export const FREQUENCY_LABELS: Record<RuleFrequency, string> = {
  DAILY: "每天",
  WEEKLY: "每周",
  MONTHLY: "每月",
  YEARLY: "每年",
};

function weekdayCode(value: ByWeekday | number | string): string {
  if (typeof value === "string") {
    return value.slice(0, 2).toUpperCase();
  }
  if (typeof value === "number") {
    return WEEKDAY_CODES[value] ?? "MO";
  }
  return String(value).slice(0, 2).toUpperCase();
}

export function parseRule(rule: string): Options {
  if (!rule || !rule.trim()) {
    throw new Error("循环规则不能为空");
  }
  if (/DTSTART|RDATE|EXDATE|TZID/i.test(rule)) {
    throw new Error("循环规则不能包含 DTSTART、RDATE、EXDATE 或 TZID");
  }
  const normalized = rule.replace(/^RRULE:/i, "").trim();
  try {
    const options = RRule.parseString(normalized) as Options;
    if (!options.freq) throw new Error("缺少 FREQ");
    return options;
  } catch (error) {
    throw new Error(
      error instanceof Error ? `循环规则无法解析：${error.message}` : "循环规则无法解析",
    );
  }
}

export function canonicalizeRule(rule: string): string {
  const body = rule
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => /^RRULE:/i.test(line) || /^FREQ=/i.test(line));
  const source = (body ?? rule).replace(/^RRULE:/i, "");
  parseRule(source);
  return source
    .replace(/\s+/g, "")
    .replace(/;+$/, "")
    .toUpperCase();
}

export function buildDtstart(taskDate: string, startTime: string): Date {
  const base = parseDateKey(taskDate);
  const [hours, minutes] = startTime.split(":").map(Number);
  return set(base, {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });
}

export function taskDtstart(task: Pick<Task, "taskDate" | "startTime">): Date {
  return buildDtstart(task.taskDate, task.startTime ?? "09:00");
}

export function buildRecurrenceRule(state: RuleBuilderState): string {
  const parts: string[] = [`FREQ=${state.freq}`];
  const interval = Math.max(1, Math.min(99, Math.round(state.interval)));
  if (interval > 1) parts.push(`INTERVAL=${interval}`);

  if (state.freq === "WEEKLY") {
    const days = state.byWeekday
      .map((d) => d.toUpperCase())
      .filter((d) => (WEEKDAY_CODES as readonly string[]).includes(d));
    if (days.length) parts.push(`BYDAY=${days.join(",")}`);
    parts.push("WKST=MO");
  }

  if (state.freq === "MONTHLY") {
    const day = Math.max(1, Math.min(31, Math.round(state.monthDay)));
    parts.push(`BYMONTHDAY=${day}`);
  }

  if (state.freq === "YEARLY") {
    const base = parseDateKey(state.untilDate || format(new Date(), "yyyy-MM-dd"));
    parts.push(`BYMONTH=${base.getMonth() + 1}`);
    parts.push(`BYMONTHDAY=${base.getDate()}`);
  }

  if (state.endType === "count") {
    parts.push(`COUNT=${Math.max(1, Math.min(1000, Math.round(state.count)))}`);
  } else if (state.endType === "until" && state.untilDate) {
    const until = parse(state.untilDate, "yyyy-MM-dd", new Date());
    until.setHours(23, 59, 59, 999);
    parts.push(
      `UNTIL=${format(until, "yyyyMMdd'T'HHmmss'Z'", { locale: zhCN })}`,
    );
  }

  const rule = parts.join(";");
  parseRule(rule);
  return rule;
}

export function parseRuleSummary(rule: string): ParsedRuleSummary | null {
  try {
    const options = parseRule(rule);
    const freq = options.freq as unknown as RuleFrequency;
    const interval = options.interval ?? 1;
    const byWeekday = Array.isArray(options.byweekday)
      ? options.byweekday.map((d) => weekdayCode(d))
      : [];
    const byMonthDay = options.bymonthday;
    const monthDay = Array.isArray(byMonthDay)
      ? Number(byMonthDay[0])
      : typeof byMonthDay === "number"
        ? byMonthDay
        : null;
    const byMonth = options.bymonth;
    const month = Array.isArray(byMonth)
      ? Number(byMonth[0])
      : typeof byMonth === "number"
        ? byMonth
        : null;
    return {
      freq,
      interval,
      byWeekday,
      monthDay,
      month,
      endType: options.count ? "count" : options.until ? "until" : "never",
      until: options.until ?? null,
      count: options.count ?? null,
    };
  } catch {
    return null;
  }
}

export function describeRecurrence(rule: string | null): string {
  if (!rule) return "未设置循环";
  const summary = parseRuleSummary(rule);
  if (!summary) return "循环规则异常";
  const { freq, interval, byWeekday, monthDay, month } = summary;
  const every = interval > 1 ? `每 ${interval} ` : "每";
  let text = "";

  if (freq === "DAILY") {
    text = interval > 1 ? `${every}天` : "每天";
  } else if (freq === "WEEKLY") {
    const days = byWeekday
      .map((d) => WEEKDAY_LABELS[d] ?? d)
      .join("、");
    text = days
      ? `${interval > 1 ? `每 ${interval} 周` : "每周"}${days}`
      : `${interval > 1 ? `每 ${interval} 周` : "每周"}`;
  } else if (freq === "MONTHLY") {
    text = `${interval > 1 ? `每 ${interval} 个月` : "每月"}${monthDay ?? ""} 日`;
  } else {
    text = `${interval > 1 ? `每 ${interval} 年` : "每年"}${month ?? ""} 月 ${monthDay ?? ""} 日`;
  }

  if (summary.endType === "count" && summary.count) {
    text += `，共 ${summary.count} 次`;
  } else if (summary.endType === "until" && summary.until) {
    text += `，至 ${format(summary.until, "yyyy 年 M 月 d 日", { locale: zhCN })}`;
  }
  return text;
}

export function validateRecurrence(
  rule: string,
  taskDate: string,
  startTime: string,
): string | null {
  try {
    const canonical = canonicalizeRule(rule);
    const options = parseRule(canonical);
    const interval = options.interval ?? 1;
    if (interval < 1 || interval > 99) return "循环间隔必须在 1–99 之间";
    if (options.count != null && options.until) {
      return "COUNT 与 UNTIL 不能同时存在";
    }
    if (options.count != null && (options.count < 1 || options.count > 1000)) {
      return "循环次数必须在 1–1000 之间";
    }
    const ruleObject = new RRule({
      ...options,
      dtstart: buildDtstart(taskDate, startTime),
    });
    const next = ruleObject.all((_date, index) => index < 5);
    if (!next.length) return "循环规则不会产生任何发生日期";
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "循环规则无效";
  }
}

export function expandOccurrences(
  task: Task,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  if (!task.recurrenceRule) return [];
  const options = parseRule(task.recurrenceRule);
  const rule = new RRule({ ...options, dtstart: taskDtstart(task) });
  const { start } = localDayBounds(rangeStart);
  const { end: rangeEndBound } = localDayBounds(rangeEnd);
  const dates = rule.between(start, rangeEndBound, true);
  const unique = new Set<string>();
  for (const date of dates) {
    const key = toDateKey(date);
    if (key >= task.taskDate) unique.add(key);
  }
  return [...unique].sort();
}

export function nextOccurrence(
  task: Task,
  fromDate: string,
  includeFrom = true,
): string | null {
  if (!task.recurrenceRule) return null;
  const rule = new RRule({
    ...parseRule(task.recurrenceRule),
    dtstart: taskDtstart(task),
  });
  const from = includeFrom
    ? new Date(`${fromDate}T00:00:00`)
    : new Date(`${fromDate}T23:59:59.999`);
  const next = rule.after(from, includeFrom);
  if (!next) return null;
  const key = toDateKey(next);
  return key >= task.taskDate ? key : null;
}

export function ruleFrequencyLabel(rule: string | null): string {
  const summary = rule ? parseRuleSummary(rule) : null;
  return summary ? FREQUENCY_LABELS[summary.freq] : "自定义";
}

export function isRuleEnded(task: Task, today: string): boolean {
  if (!task.recurrenceRule) return false;
  const summary = parseRuleSummary(task.recurrenceRule);
  if (!summary) return false;
  if (summary.endType === "until" && summary.until) {
    return toDateKey(summary.until) < today;
  }
  if (summary.endType === "count" && summary.count) {
    const dates = expandOccurrences(task, task.taskDate, "2100-12-31");
    return dates.length >= summary.count && (dates.at(-1) ?? "") < today;
  }
  return false;
}
