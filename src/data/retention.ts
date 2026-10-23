import { repository } from "@/data";
import { addYearsKey, todayKey } from "@/lib/date";

export const DAILY_RECORD_RETENTION_YEARS = 2;

/**
 * 启动时执行：只保留最近两年的每日记录和暂停日期。
 * 已打卡天数已汇总到 checkin_days，不会因清理明细而丢失。
 */
export async function pruneOldDailyData(): Promise<void> {
  const cutoff = addYearsKey(todayKey(), -DAILY_RECORD_RETENTION_YEARS);
  await repository.pruneDailyData(cutoff);
}
