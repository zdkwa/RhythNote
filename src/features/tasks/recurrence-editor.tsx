import { Repeat2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  FREQUENCY_LABELS,
  parseRuleSummary,
  WEEKDAY_OPTIONS,
  type RuleBuilderState,
  type RuleEndType,
  type RuleFrequency,
} from "@/lib/recurrence";
import { isValidDateKey, parseDateKey } from "@/lib/date";
import {
  ALLOWED_RULE_KEYS,
  buildRuleFromState,
  builderCanRepresent,
  effectiveRule,
  formatRuleSummary,
  normalizeRule,
  stateFromRuleInfo,
  validateRuleText,
  weekdayCodeForDate,
  type RuleEditorValue,
} from "@/features/tasks/recurrence-rule";

interface RecurrenceEditorProps {
  taskDate: string;
  startTime: string;
  value: RuleEditorValue;
  onChange: (value: RuleEditorValue) => void;
  error?: string | null;
}

type PresetKind = "daily" | "weekdays" | "weekly" | "monthly" | "yearly";

const PRESETS: Array<{ kind: PresetKind; label: string }> = [
  { kind: "daily", label: "每天" },
  { kind: "weekdays", label: "每个工作日" },
  { kind: "weekly", label: "每周" },
  { kind: "monthly", label: "每月" },
  { kind: "yearly", label: "每年" },
];

const FREQ_UNIT: Record<RuleFrequency, string> = {
  DAILY: "天",
  WEEKLY: "周",
  MONTHLY: "个月",
  YEARLY: "年",
};

const END_OPTIONS: Array<{ value: RuleEndType; label: string }> = [
  { value: "never", label: "永不结束" },
  { value: "until", label: "到某日期" },
  { value: "count", label: "共 N 次" },
];

const FREQ_OPTIONS: Array<{ value: RuleFrequency; label: string }> = (
  ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as RuleFrequency[]
).map((freq) => ({ value: freq, label: FREQUENCY_LABELS[freq] }));

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function applyPreset(
  kind: PresetKind,
  state: RuleBuilderState,
  taskDate: string,
): RuleBuilderState {
  const base = isValidDateKey(taskDate) ? parseDateKey(taskDate) : new Date();
  switch (kind) {
    case "daily":
      return { ...state, freq: "DAILY", interval: 1, byWeekday: [] };
    case "weekdays":
      return {
        ...state,
        freq: "WEEKLY",
        interval: 1,
        byWeekday: ["MO", "TU", "WE", "TH", "FR"],
      };
    case "weekly":
      return {
        ...state,
        freq: "WEEKLY",
        interval: 1,
        byWeekday: [weekdayCodeForDate(taskDate)],
      };
    case "monthly":
      return {
        ...state,
        freq: "MONTHLY",
        interval: 1,
        monthDay: base.getDate(),
      };
    case "yearly":
      return { ...state, freq: "YEARLY", interval: 1 };
    default:
      return state;
  }
}

function activePreset(state: RuleBuilderState): PresetKind | "custom" {
  if (state.interval !== 1) return "custom";
  if (state.freq === "DAILY") {
    return state.byWeekday.length === 0 ? "daily" : "custom";
  }
  if (state.freq === "WEEKLY") {
    const days = [...state.byWeekday].sort();
    const workdays = ["FR", "MO", "TH", "TU", "WE"].join(",");
    if (days.join(",") === workdays) return "weekdays";
    return days.length === 1 ? "weekly" : "custom";
  }
  if (state.freq === "MONTHLY") return "monthly";
  return "yearly";
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] leading-4 text-destructive">{message}</p>;
}

export function RecurrenceEditor({
  taskDate,
  startTime,
  value,
  onChange,
  error,
}: RecurrenceEditorProps) {
  const state = value.state;
  const rule = effectiveRule(value, taskDate);
  const summary = rule ? formatRuleSummary(rule) : "请补全循环规则";
  const startTimeValid = TIME_PATTERN.test(startTime);

  const liveError = (() => {
    let candidate: string | null = null;
    try {
      candidate = value.advanced
        ? value.advancedRule.trim()
          ? normalizeRule(value.advancedRule)
          : null
        : buildRuleFromState(state, taskDate);
    } catch (cause) {
      return cause instanceof Error ? cause.message : "循环规则无效";
    }
    if (!candidate) return null;
    return startTimeValid ? validateRuleText(candidate, taskDate, startTime) : null;
  })();

  const displayError = error ?? liveError;

  const updateState = (patch: Partial<RuleBuilderState>) => {
    onChange({ ...value, state: { ...state, ...patch } });
  };

  const toggleWeekday = (code: string) => {
    const selected = state.byWeekday.includes(code);
    if (selected && state.byWeekday.length <= 1) return;
    updateState({
      byWeekday: selected
        ? state.byWeekday.filter((item) => item !== code)
        : [...state.byWeekday, code],
    });
  };

  const handleAdvancedToggle = (next: boolean) => {
    if (next) {
      onChange({
        ...value,
        advanced: true,
        advancedRule: effectiveRule(value, taskDate) ?? "",
      });
      return;
    }
    if (!builderCanRepresent(value.advancedRule, taskDate)) return;
    const info = parseRuleSummary(value.advancedRule);
    if (!info) return;
    onChange({
      state: stateFromRuleInfo(info, taskDate),
      advanced: false,
      advancedRule: "",
    });
  };

  const preset = activePreset(state);
  const month = isValidDateKey(taskDate) ? parseDateKey(taskDate).getMonth() + 1 : 1;
  const day = isValidDateKey(taskDate) ? parseDateKey(taskDate).getDate() : 1;

  return (
    <section className="space-y-4 rounded-xl border border-border/80 bg-card/55 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Repeat2 className="h-3.5 w-3.5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">循环规则</h3>
            <p className="text-[11px] text-muted-foreground">
              周一开始，不显示英文 RRULE 文案
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          高级 RRULE
          <Switch
            checked={value.advanced}
            onCheckedChange={handleAdvancedToggle}
            aria-label="切换高级 RRULE 模式"
          />
        </label>
      </header>

      {value.advanced ? (
        <div className="space-y-2">
          <Input
            value={value.advancedRule}
            onChange={(event) =>
              onChange({ ...value, advancedRule: event.target.value })
            }
            onBlur={() => {
              try {
                onChange({
                  ...value,
                  advancedRule: normalizeRule(value.advancedRule),
                });
              } catch {
                // 保留原文，错误在下方即时展示，保存时会被拦截。
              }
            }}
            placeholder="FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR;WKST=MO"
            aria-label="高级 RRULE 字符串"
            className="font-mono text-xs"
          />
          <p className="text-[11px] leading-5 text-muted-foreground">
            允许字段：{ALLOWED_RULE_KEYS.join("、")}；不能包含 DTSTART、RDATE、EXDATE、TZID；
            COUNT 与 UNTIL 互斥，COUNT 最大 1,000，INTERVAL 最大 99。
          </p>
          <p className="text-[11px] leading-5 text-muted-foreground">
            例如 FREQ=MONTHLY;BYDAY=TU;BYSETPOS=2 表示每月第二个周二。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((item) => (
              <button
                key={item.kind}
                type="button"
                aria-pressed={preset === item.kind}
                onClick={() =>
                  updateState(applyPreset(item.kind, state, taskDate))
                }
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  preset === item.kind
                    ? "border-primary/50 bg-primary/12 text-primary"
                    : "border-border/80 text-muted-foreground hover:border-primary/35 hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">频率</p>
              <Segmented
                ariaLabel="循环频率"
                value={state.freq}
                options={FREQ_OPTIONS}
                onChange={(freq) => {
                  if (freq === "WEEKLY" && state.byWeekday.length === 0) {
                    updateState({
                      freq,
                      byWeekday: [weekdayCodeForDate(taskDate)],
                    });
                    return;
                  }
                  updateState({ freq });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                间隔（1–99）
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">每</span>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={state.interval}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    updateState({
                      interval: Number.isFinite(next)
                        ? Math.min(99, Math.max(1, Math.round(next)))
                        : 1,
                    });
                  }}
                  aria-label="循环间隔"
                  className="h-9 w-20"
                />
                <span className="text-xs text-muted-foreground">
                  {FREQ_UNIT[state.freq]}
                </span>
              </div>
            </div>
          </div>

          {state.freq === "WEEKLY" ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                星期（可多选）
              </p>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_OPTIONS.map((option) => {
                  const selected = state.byWeekday.includes(option.code);
                  return (
                    <button
                      key={option.code}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleWeekday(option.code)}
                      className={cn(
                        "h-8 min-w-[52px] rounded-md border px-2 text-xs font-medium transition-colors",
                        selected
                          ? "border-primary/50 bg-primary/12 text-primary"
                          : "border-border/80 text-muted-foreground hover:border-primary/35 hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {state.freq === "MONTHLY" ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                每月几号（1–31）
              </p>
              <Input
                type="number"
                min={1}
                max={31}
                value={state.monthDay}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  updateState({
                    monthDay: Number.isFinite(next)
                      ? Math.min(31, Math.max(1, Math.round(next)))
                      : 1,
                  });
                }}
                aria-label="每月几号"
                className="h-9 w-24"
              />
              <p className="text-[11px] leading-5 text-muted-foreground">
                没有该日期的月份会跳过（例如每月 31 日在 2 月不发生），不会自动改成月末。
              </p>
            </div>
          ) : null}

          {state.freq === "YEARLY" ? (
            <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
              每年按开始日期的 {month} 月 {day} 日重复；闰年 2 月 29 日只在闰年发生。
            </p>
          ) : null}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium text-muted-foreground">结束</p>
              <Segmented
                ariaLabel="循环结束方式"
                value={state.endType}
                options={END_OPTIONS}
                onChange={(endType) => updateState({ endType })}
              />
            </div>
            {state.endType === "until" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={state.untilDate}
                  onChange={(event) =>
                    updateState({ untilDate: event.target.value })
                  }
                  aria-label="循环结束日期"
                  className="h-9 w-44"
                />
                <span className="text-[11px] text-muted-foreground">
                  结束日当天仍会发生；必须晚于开始日期。
                </span>
              </div>
            ) : null}
            {state.endType === "count" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={state.count}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    updateState({
                      count: Number.isFinite(next)
                        ? Math.min(1000, Math.max(1, Math.round(next)))
                        : 1,
                    });
                  }}
                  aria-label="循环次数"
                  className="h-9 w-24"
                />
                <span className="text-[11px] text-muted-foreground">
                  次（1–1,000，从开始日期算起）
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          中文摘要
        </p>
        <p className="mt-0.5 text-sm font-medium">{summary}</p>
        {rule ? (
          <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
            {rule}
          </p>
        ) : null}
      </div>

      <FieldError message={displayError} />
    </section>
  );
}
