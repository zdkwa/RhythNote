import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemeMode } from "@/types/domain";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  hint: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "浅色", hint: "暖纸色，适合白天", icon: Sun },
  { value: "dark", label: "深色", hint: "深森林，适合夜间", icon: Moon },
  { value: "system", label: "跟随系统", hint: "随 Windows 主题切换", icon: Monitor },
];

export function ThemeCard() {
  const { theme, setTheme } = useTheme();
  return (
    <section className="paper-panel rounded-2xl p-5 md:p-6">
      <div className="mb-5 space-y-1">
        <h2 className="font-display text-xl font-semibold">外观</h2>
        <p className="text-sm text-muted-foreground">
          选择界面明暗。切换会立即生效，并记住你的选择。
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                "group rounded-xl border p-4 text-left transition-all",
                active
                  ? "border-primary/50 bg-primary/5 shadow-sm"
                  : "border-border/80 bg-card/40 hover:border-primary/25",
              )}
              aria-pressed={active}
            >
              <span
                className={cn(
                  "mb-3 flex h-9 w-9 items-center justify-center rounded-lg",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
