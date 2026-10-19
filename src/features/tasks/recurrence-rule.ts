import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { type ByWeekday, type Options, type Weekday } from "rrule";
import {
  buildRecurrenceRule,
  canonicalizeRule,
  describeRecurrence,
  expandOccurrences,
  nextOccurrence,
  parseRule,
  parseRuleSummary,
  validateRecurrence,
  WEEKDAY_OPTIONS,
  type ParsedRuleSummary,
  type RuleBuilderState,
  type RuleFrequency,
} from "@/lib/recurrence";
import {
  isValidDateKey,
  parseDateKey,
  toDateKey,
  weekdayIndexMondayFirst,
} from "@/lib/date";
import type { Task } from "@/types/domain";

/**
 * 任务域共用的 RRULE 编辑辅助：
 * - 规则字符串生成/校验/中文摘要全部走 src/lib/recurrence.ts（rrule 包）；
 * - 只补充“可视化构建器状态”“高级模式无损判断”“即时校验”等 UI 层能力。
 */

export const ALLOWED_RULE_KEYS = [
  "FREQ",
  "INTERVAL",
  "COUNT",
  "UNTIL",
  "BYDAY",
  "BYMONTHDAY",
  "BYMONTH",
  "BYSETPOS",
  "WKST",
];

export const WEEKDAY_TEXT: Record<string, string> = {
  MO: "周一",
  TU: "周二",
  WE: "周三",
  TH: "周四",
  FR: "周五",
  SA: "周六",
  SU: "周日",
};

export interface RuleEditorValue {
  state: RuleBuilderState;
  advanced: boolean;
  advancedRule: string;
}

const WEEKDAY_CODES: readonly string[] = WEEKDAY_OPTIONS.map((option) => option.code);

export function weekdayCodeForDate(dateKey: string): string {
  return WEEKDAY_OPTIONS[weekdayIndexMondayFirst(dateKey)]?.code ?? "MO";
}

export function defaultRuleState(taskDate: string): RuleBuilderState {
  const date = isValidDateKey(taskDate) ? taskDate : toDateKey(new Date());
  const base = parseDateKey(date);
  return {
    freq: "WEEKLY",
    interval: 1,
    byWeekday: [weekdayCodeForDate(date)],
    monthDay: base.getDate(),
    baseDate: date,
    endType: "never",
    untilDate: date,
    count: 10,
  };
}

function sortedWeekdays(codes: string[]): string[] {
  return [...new Set(codes)]
    .map((code) => code.toUpperCase())
    .filter((code) => WEEKDAY_CODES.includes(code))
    .sort((a, b) => WEEKDAY_CODES.indexOf(a) - WEEKDAY_CODES.indexOf(b));
}

/** 由构建器状态生成规范化 RRULE（只含 FREQ/INTERVAL/BY* /COUNT/UNTIL/WKST）。 */
export function buildRuleFromState(
  state: RuleBuilderState,
  taskDate: string,
): string {
  const withBase: RuleBuilderState = {
    ...state,
    baseDate: isValidDateKey(taskDate) ? taskDate : state.baseDate,
    byWeekday:
      state.freq === "WEEKLY" ? sortedWeekdays(state.byWeekday) : state.byWeekday,
  };
  return canonicalizeRule(buildRecurrenceRule(withBase));
}

function normalizeWeekdays(
  value: Options["byweekday"] | null | undefined,
): Array<{ code: string; nth: number | null }> {
  if (value == null) return [];
  const list: ByWeekday[] = Array.isArray(value) ? value : [value];
  return list
    .map((item) => {
      if (typeof item === "number") {
        return { code: WEEKDAY_CODES[item] ?? "MO", nth: null };
      }
      if (typeof item === "string") {
        return { code: item.slice(0, 2).toUpperCase(), nth: null };
      }
      const weekday = item as Weekday;
      return {
        code: WEEKDAY_CODES[weekday.weekday] ?? "MO",
        nth: typeof weekday.n === "number" ? weekday.n : null,
      };
    })
    .filter((item) => WEEKDAY_TEXT[item.code] !== undefined);
}

function toNumberArray(
  value: number | number[] | null | undefined,
): number[] {
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value])
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

/** 判断规则能否被可视化构建器无损表达；不能时应保留在“高级 RRULE”模式。 */
export function builderCanRepresent(rule: string, taskDate: string): boolean {
  let options: Options;
  try {
    options = parseRule(rule);
  } catch {
    return false;
  }
  if (
    options.bysetpos ||
    options.byyearday ||
    options.byweekno ||
    options.byhour ||
    options.byminute ||
    options.bysecond ||
    options.byeaster
  ) {
    return false;
  }
  const weekdays = normalizeWeekdays(options.byweekday);
  if (weekdays.some((item) => item.nth != null)) return false;

  const freq = parseRuleSummary(rule)?.freq;
  const monthDays = toNumberArray(options.bymonthday);
  const months = toNumberArray(options.bymonth);
  if (!freq) return false;

  if (freq === "DAILY") {
    return weekdays.length === 0 && monthDays.length === 0 && months.length === 0;
  }
  if (freq === "WEEKLY") {
    return monthDays.length === 0 && months.length === 0;
  }
  if (freq === "MONTHLY") {
    return weekdays.length === 0 && months.length === 0;
  }
  const base = isValidDateKey(taskDate) ? parseDateKey(taskDate) : new Date();
  if (months.length && !months.includes(base.getMonth() + 1)) return false;
  if (monthDays.length && !monthDays.includes(base.getDate())) return false;
  return true;
}

export function stateFromRuleInfo(
  info: ParsedRuleSummary,
  taskDate: string,
): RuleBuilderState {
  const date = isValidDateKey(taskDate) ? taskDate : toDateKey(new Date());
  const base = parseDateKey(date);
  return {
    freq: info.freq,
    interval: info.interval,
    byWeekday: info.byWeekday,
    monthDay: info.monthDay ?? base.getDate(),
    baseDate: date,
    endType: info.endType,
    untilDate: info.until ? toDateKey(info.until) : date,
    count: info.count ?? 10,
  };
}

/** 编辑已有任务时把 RRULE 还原成编辑器状态；高级规则保持原始文本。 */
export function createRuleValue(
  taskDate: string,
  rule?: string | null,
): RuleEditorValue {
  const summary = rule ? parseRuleSummary(rule) : null;
  if (!rule || !summary || !builderCanRepresent(rule, taskDate)) {
    return {
      state: defaultRuleState(taskDate),
      advanced: Boolean(rule && rule.trim()),
      advancedRule: rule ?? "",
    };
  }
  return {
    state: {
      ...stateFromRuleInfo(summary, taskDate),
      // FREQ=WEEKLY 未写 BYDAY 时表示“按开始日期的星期”，构建器显式展示该星期。
      byWeekday:
        summary.freq === "WEEKLY" && summary.byWeekday.length === 0
          ? [weekdayCodeForDate(taskDate)]
          : summary.byWeekday,
    },
    advanced: false,
    advancedRule: "",
  };
}

/** 取当前编辑器值对应的规范化规则；非法时返回 null（用于摘要与即时校验）。 */
export function effectiveRule(
  value: RuleEditorValue,
  taskDate: string,
): string | null {
  try {
    if (value.advanced) {
      return value.advancedRule.trim()
        ? canonicalizeRule(value.advancedRule)
        : null;
    }
    return buildRuleFromState(value.state, taskDate);
  } catch {
    return null;
  }
}

/** 保存前取规则；非法时抛出中文错误。 */
export function resolveRuleValue(
  value: RuleEditorValue,
  taskDate: string,
): string {
  if (value.advanced) {
    const raw = value.advancedRule.trim();
    if (!raw) throw new Error("请输入循环规则");
    return canonicalizeRule(raw);
  }
  return buildRuleFromState(value.state, taskDate);
}

/** 校验 RRULE 文本（长度限制 + 规范化 + 字段范围 + 至少 1 个发生日期）。 */
export function validateRuleText(
  rule: string,
  taskDate: string,
  startTime: string,
): string | null {
  if (rule.length > 500) return "循环规则不能超过 500 个字符";
  return validateRecurrence(rule, taskDate, startTime);
}

const WEEKDAY_FULL: Record<string, string> = {
  MO: "周一",
  TU: "周二",
  WE: "周三",
  TH: "周四",
  FR: "周五",
  SA: "周六",
  SU: "周日",
};

function positionText(position: number): string {
  return position < 0 ? "最后一个" : `第${position}个`;
}

/**
 * 中文规则摘要统一入口：
 * - 常规规则完全交给 lib/recurrence 的 describeRecurrence；
 * - 高级模式里 lib 尚未覆盖的 BYSETPOS / 每月指定星期组合，在这里补齐中文。
 */
export function formatRuleSummary(rule: string | null | undefined): string {
  if (!rule) return "未设置循环";
  const summary = parseRuleSummary(rule);
  if (!summary) return "循环规则异常";

  const weekdayText = [...new Set(summary.byWeekday)]
    .map((code) => WEEKDAY_FULL[code] ?? code)
    .join("、");

  if (
    summary.bySetPos != null &&
    weekdayText &&
    (summary.freq === "MONTHLY" || summary.freq === "YEARLY")
  ) {
    const interval = summary.interval;
    const base =
      summary.freq === "MONTHLY"
        ? interval > 1
          ? `每 ${interval} 个月`
          : "每月"
        : interval > 1
          ? `每 ${interval} 年`
          : "每年";
    const monthPart =
      summary.freq === "YEARLY" && summary.month ? ` ${summary.month} 月` : "";
    const connector = summary.freq === "YEARLY" ? "的" : "";
    let text = `${base}${monthPart}${connector}${positionText(summary.bySetPos)}${weekdayText}`;
    if (summary.endType === "count" && summary.count) {
      text += `，共 ${summary.count} 次`;
    } else if (summary.endType === "until" && summary.until) {
      text += `，至 ${format(summary.until, "yyyy 年 M 月 d 日", { locale: zhCN })}`;
    }
    return text;
  }

  if (summary.freq === "MONTHLY" && weekdayText && summary.monthDay == null) {
    const interval = summary.interval;
    const base = interval > 1 ? `每 ${interval} 个月` : "每月";
    let text = `${base}${weekdayText}`;
    if (summary.endType === "count" && summary.count) {
      text += `，共 ${summary.count} 次`;
    } else if (summary.endType === "until" && summary.until) {
      text += `，至 ${format(summary.until, "yyyy 年 M 月 d 日", { locale: zhCN })}`;
    }
    return text;
  }

  return describeRecurrence(rule);
}

/** 规范化 RRULE 文本（用于高级输入框失焦与即时校验）。 */
export function normalizeRule(rule: string): string {
  return canonicalizeRule(rule);
}

/** 规则在该日期是否发生；规则异常时 broken=true（不抛出，避免单卡崩溃）。 */
export function probeTaskOccurrence(
  task: Task,
  date: string,
): { occurs: boolean; broken: boolean } {
  if (task.type !== "recurring" || !task.recurrenceRule) {
    return { occurs: false, broken: false };
  }
  try {
    return { occurs: expandOccurrences(task, date, date).length > 0, broken: false };
  } catch {
    return { occurs: false, broken: true };
  }
}

/** 下一次发生日期（含 fromDate 当天）；规则异常或已结束时返回 null。 */
export function nextTaskOccurrence(
  task: Task,
  fromDate: string,
): string | null {
  try {
    return nextOccurrence(task, fromDate);
  } catch {
    return null;
  }
}

export type { RuleFrequency };
