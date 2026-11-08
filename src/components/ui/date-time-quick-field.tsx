import { useRef } from "react";
import { CalendarDays, Check, Clock3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addDaysKey,
  dateWithWeekday,
  todayKey,
} from "@/lib/date";
import { cn } from "@/lib/utils";

const DATE_SHORTCUTS = [
  { label: "今天", offset: 0 },
  { label: "明天", offset: 1 },
  { label: "后天", offset: 2 },
  { label: "一周后", offset: 7 },
];

const TIME_SHORTCUTS = ["08:00", "09:00", "12:00", "18:00", "20:00", "22:00"];

export function DateQuickField({
  id,
  value,
  onChange,
  disabled,
  label = "任务日期",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const today = todayKey();

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // fall through to focus
      }
    }
    input.focus();
    input.click();
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-muted/20 p-3",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Label htmlFor={id}>{label}</Label>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="truncate">{dateWithWeekday(value)}</span>
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border/80 bg-background px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:pointer-events-none"
        >
          <CalendarDays className="h-3 w-3" />
          选择日期
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {DATE_SHORTCUTS.map((shortcut) => {
          const date = addDaysKey(today, shortcut.offset);
          const active = value === date;
          return (
            <button
              key={shortcut.offset}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(date)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "border-primary/45 bg-primary/10 text-primary"
                  : "border-border/80 text-muted-foreground hover:border-primary/35 hover:text-foreground",
                disabled && "pointer-events-none",
              )}
            >
              {shortcut.label}
              <span className="text-[10px] opacity-70">
                {date.slice(5).replace("-", "/")}
              </span>
              {active ? <Check className="h-3 w-3" /> : null}
            </button>
          );
        })}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        className="sr-only"
        aria-label={label}
        tabIndex={-1}
      />
    </div>
  );
}

export function TimeQuickField({
  id,
  value,
  onChange,
  disabled,
  label,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-1.5">
        <Clock3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Input
          id={id}
          type="time"
          step={60}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-[7.25rem] bg-card font-mono text-sm tabular-nums"
        />
        <div className="flex flex-wrap gap-1">
          {TIME_SHORTCUTS.map((time) => (
            <button
              key={time}
              type="button"
              disabled={disabled}
              onClick={() => onChange(time)}
              className={cn(
                "rounded-md border px-1.5 py-1 text-[10px] tabular-nums transition-colors",
                value === time
                  ? "border-primary/45 bg-primary/10 text-primary"
                  : "border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {time}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
