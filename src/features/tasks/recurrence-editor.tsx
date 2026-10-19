import { Repeat2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import {
  WEEKDAY_OPTIONS,
  type RuleBuilderState,
  type RuleEndType,
  type RuleFrequency,
} from "@/lib/recurrence";
import { isValidDateKey, parseDateKey } from "@/lib/date";
import {
  buildRuleFromState,
  effectiveRule,
  formatRuleSummary,
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
          ? value.advancedRule
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
    onChange({
      ...value,
      advanced: false,
      advancedRule: "",
      state: { ...state, ...patch },
    });
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
              选择常用节奏即可，后续可以修改
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-4">
          {value.advanced ? (
            <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
              当前任务使用了更复杂的自定义循环规则。保存时会保留原规则；选择下方常用节奏会替换它。
            </p>
          ) : null}
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

          <details className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
            <summary className="cursor-pointer list-none text-[11px] font-medium text-muted-foreground hover:text-foreground">
              更多循环设置（间隔、结束条件）
            </summary>
            <div className="mt-3 space-y-4">
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
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    结束
                  </p>
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
          </details>
        </div>

      <div className="rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          中文摘要
        </p>
        <p className="mt-0.5 text-sm font-medium">{summary}</p>
      </div>

      <FieldError message={displayError} />
    </section>
  );
}
