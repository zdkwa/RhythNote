import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";

export const DATE_KEY_FORMAT = "yyyy-MM-dd";
export const MONTH_KEY_FORMAT = "yyyy-MM";
export const WEEK_STARTS_ON = 1 as const;

export function toDateKey(date: Date): string {
  return format(date, DATE_KEY_FORMAT);
}

export function toMonthKey(date: Date): string {
  return format(date, MONTH_KEY_FORMAT);
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export function nowTimeKey(now: Date = new Date()): string {
  return format(now, "HH:mm");
}

export function parseDateKey(key: string): Date {
  const parsed = parse(key, DATE_KEY_FORMAT, new Date());
  if (!isValid(parsed)) {
    throw new Error(`非法日期：${key}`);
  }
  return parsed;
}

export function isValidDateKey(key: string | undefined | null): key is string {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return isValid(parse(key, DATE_KEY_FORMAT, new Date()));
}

export function isValidMonthKey(key: string | undefined | null): key is string {
  if (!key || !/^\d{4}-\d{2}$/.test(key)) return false;
  const parsed = parse(key, MONTH_KEY_FORMAT, new Date());
  return isValid(parsed);
}

export function parseMonthKey(key: string): Date {
  return parse(key, MONTH_KEY_FORMAT, new Date());
}

export function addDaysKey(key: string, amount: number): string {
  return toDateKey(addDays(parseDateKey(key), amount));
}

export function addMonthsKey(key: string, amount: number): string {
  return toMonthKey(addMonths(parseMonthKey(key), amount));
}

export function addYearsKey(key: string, amount: number): string {
  return toDateKey(addYears(parseDateKey(key), amount));
}

export function dateRange(startKey: string, endKey: string): string[] {
  return eachDayOfInterval({
    start: parseDateKey(startKey),
    end: parseDateKey(endKey),
  }).map(toDateKey);
}

export function weekRange(dateKey: string): { start: string; end: string } {
  const date = parseDateKey(dateKey);
  return {
    start: toDateKey(startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON })),
    end: toDateKey(endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON })),
  };
}

export function monthGridRange(monthKey: string): {
  start: string;
  end: string;
  days: string[];
} {
  const first = startOfMonth(parseMonthKey(monthKey));
  const gridStart = startOfWeek(first, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = addDays(gridStart, 41);
  return {
    start: toDateKey(gridStart),
    end: toDateKey(gridEnd),
    days: dateRange(toDateKey(gridStart), toDateKey(gridEnd)),
  };
}

export function monthLabel(monthKey: string): string {
  return format(parseMonthKey(monthKey), "yyyy 年 M 月", { locale: zhCN });
}

export function dateLabel(dateKey: string): string {
  return format(parseDateKey(dateKey), "yyyy 年 M 月 d 日", { locale: zhCN });
}

export function dateWithWeekday(dateKey: string): string {
  return format(parseDateKey(dateKey), "yyyy 年 M 月 d 日 · EEEE", {
    locale: zhCN,
  });
}

export function shortDateLabel(dateKey: string): string {
  return format(parseDateKey(dateKey), "M 月 d 日", { locale: zhCN });
}

export function weekdayShort(dateKey: string): string {
  return format(parseDateKey(dateKey), "EEE", { locale: zhCN });
}

export function weekdayIndexMondayFirst(dateKey: string): number {
  return (parseDateKey(dateKey).getDay() + 6) % 7;
}

export function isTodayKey(dateKey: string): boolean {
  return dateKey === todayKey();
}

export function isPastDate(dateKey: string): boolean {
  return dateKey < todayKey();
}

export function isFutureDate(dateKey: string): boolean {
  return dateKey > todayKey();
}

export function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

export function compareTimeKeys(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  return (a ?? "24:00").localeCompare(b ?? "24:00");
}

export function timeRangeLabel(
  startTime: string | null,
  endTime: string | null,
  semantic: "planned" | "deadline",
): string {
  if (semantic === "deadline") {
    return endTime ? `截止 ${endTime}` : "当天截止";
  }
  if (startTime && endTime) return `${startTime} – ${endTime}`;
  if (startTime) return `${startTime} 开始`;
  return "全天";
}

export function daysBetween(startKey: string, endKey: string): number {
  return differenceInCalendarDays(parseDateKey(endKey), parseDateKey(startKey));
}

export function localDayBounds(dateKey: string): { start: Date; end: Date } {
  const date = parseDateKey(dateKey);
  return {
    start: startOfDay(date),
    end: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    ),
  };
}

export function timestampToDateKey(timestamp: string): string {
  return toDateKey(parseISO(timestamp));
}

export function isTimeKey(value: string | null | undefined): value is string {
  return !!value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function monthEndKey(monthKey: string): string {
  return toDateKey(endOfMonth(parseMonthKey(monthKey)));
}
