import {
  CalendarDays,
  CircleDot,
  ListTodo,
  Moon,
  Plus,
  Repeat2,
  Settings,
  Sun,
  TimerReset,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useCategories, useTasks } from "@/data/queries";
import { usingMemoryDatabase } from "@/data";
import { useTheme } from "@/hooks/useTheme";
import { useToday } from "@/hooks/useToday";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TaskEditorDialog } from "@/features/tasks/task-editor-dialog";

function BrandMark() {
  return (
    <span className="flex h-9 w-9 items-end justify-center gap-[3px] rounded-xl bg-[hsl(var(--sidebar-accent))]/15 p-2 ring-1 ring-[hsl(var(--sidebar-accent))]/25">
      <span className="h-2.5 w-[3px] rounded-full bg-[hsl(var(--sidebar-accent))]" />
      <span className="h-4 w-[3px] rounded-full bg-[hsl(var(--sidebar-accent))]/85" />
      <span className="h-3 w-[3px] rounded-full bg-[hsl(var(--sidebar-accent))]/65" />
      <span className="h-5 w-[3px] rounded-full bg-[hsl(var(--sidebar-accent))]" />
    </span>
  );
}

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  end?: boolean;
  count?: number;
}

function NavItem({ to, label, icon: Icon, end, count }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
          isActive
            ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-foreground))] shadow-sm"
            : "text-[hsl(var(--sidebar-muted))] hover:bg-white/5 hover:text-[hsl(var(--sidebar-foreground))]",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className="ml-auto rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] tabular-nums text-[hsl(var(--sidebar-muted))]">
          {count}
        </span>
      ) : null}
    </NavLink>
  );
}

export function Sidebar() {
  const { data: categories = [] } = useCategories();
  const { data: tasks = [] } = useTasks(false);
  const { theme, resolved, setTheme } = useTheme();
  const today = useToday();
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname.startsWith("/day/");
  const [createOpen, setCreateOpen] = useState(false);
  const defaultType =
    location.pathname === "/tasks/recurring"
      ? "recurring"
      : location.pathname === "/tasks/once"
        ? "once"
        : undefined;
  const defaultCategoryId = location.pathname.startsWith("/categories/")
    ? (location.pathname.split("/")[2] ?? null)
    : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        if (document.querySelector('[role="dialog"], [role="alertdialog"]')) {
          return;
        }
        event.preventDefault();
        setCreateOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activeByCategory = new Map<string, number>();
  for (const task of tasks) {
    if (task.categoryId) {
      activeByCategory.set(
        task.categoryId,
        (activeByCategory.get(task.categoryId) ?? 0) + 1,
      );
    }
  }

  return (
    <aside className="app-sidebar hidden w-[248px] shrink-0 flex-col border-r border-black/10 px-4 py-5 md:flex">
      <div className="flex items-center gap-3 px-1">
        <BrandMark />
        <div className="min-w-0">
          <p className="font-display text-[1.35rem] font-semibold leading-none tracking-tight">
            RhythNote
          </p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--sidebar-muted))]">
            节律待办
          </p>
        </div>
      </div>

      <Button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="mt-6 w-full justify-start gap-2 border border-white/10 bg-white/[0.08] text-[hsl(var(--sidebar-foreground))] shadow-none hover:bg-white/[0.14]"
      >
        <Plus className="h-4 w-4" />
        新建任务
        <kbd className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[9px] font-normal text-[hsl(var(--sidebar-muted))]">
          Ctrl N
        </kbd>
      </Button>

      <nav className="mt-5 flex flex-1 flex-col gap-6 overflow-y-auto pr-1 scrollbar-thin">
        <div className="space-y-1">
          <NavLink
            to="/"
            end
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              isHome
                ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-foreground))] shadow-sm"
                : "text-[hsl(var(--sidebar-muted))] hover:bg-white/5 hover:text-[hsl(var(--sidebar-foreground))]",
            )}
          >
            <CalendarDays className="h-4 w-4" />
            首页
          </NavLink>
          <NavItem to="/tasks" label="全部任务" icon={ListTodo} end />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between px-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--sidebar-muted))]">
              分类
            </p>
            <NavLink
              to="/settings/categories"
              className="rounded p-1 text-[hsl(var(--sidebar-muted))] transition-colors hover:bg-white/8 hover:text-[hsl(var(--sidebar-foreground))]"
              aria-label="管理分类"
            >
              <Settings className="h-3 w-3" />
            </NavLink>
          </div>
          <div className="space-y-0.5">
            {categories.map((category) => (
              <NavLink
                key={category.id}
                to={`/categories/${category.id}`}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                    isActive
                      ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-foreground))]"
                      : "text-[hsl(var(--sidebar-muted))] hover:bg-white/5 hover:text-[hsl(var(--sidebar-foreground))]",
                  )
                }
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full ring-2 ring-white/5"
                  style={{ backgroundColor: category.color }}
                />
                <span className="truncate">{category.name}</span>
                <span className="ml-auto text-[10px] tabular-nums text-[hsl(var(--sidebar-muted))]">
                  {activeByCategory.get(category.id) ?? 0}
                </span>
              </NavLink>
            ))}
            {categories.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[hsl(var(--sidebar-muted))]">
                暂无分类
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--sidebar-muted))]">
            任务类型
          </p>
          <div className="space-y-1">
            <NavItem to="/tasks/once" label="临时任务" icon={TimerReset} />
            <NavItem to="/tasks/recurring" label="循环任务" icon={Repeat2} />
          </div>
        </div>
      </nav>

      <div className="mt-4 space-y-2 border-t border-white/8 pt-4">
        <NavLink
          to="/settings/general"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              isActive
                ? "bg-[hsl(var(--sidebar-active))] text-[hsl(var(--sidebar-foreground))]"
                : "text-[hsl(var(--sidebar-muted))] hover:bg-white/5 hover:text-[hsl(var(--sidebar-foreground))]",
            )
          }
        >
          <Settings className="h-4 w-4" />
          设置
        </NavLink>
        <div className="flex items-center justify-between px-2">
          <span
            className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--sidebar-muted))]"
            title={usingMemoryDatabase ? "浏览器预览使用内存数据" : "所有数据保存在本机"}
          >
            <CircleDot className="h-3 w-3" />
            {usingMemoryDatabase ? "预览数据" : "本地数据"}
          </span>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-md p-1.5 text-[hsl(var(--sidebar-muted))] transition-colors hover:bg-white/8 hover:text-[hsl(var(--sidebar-foreground))]"
            aria-label={resolved === "dark" ? "切换到浅色主题" : "切换到深色主题"}
            title={resolved === "dark" ? "切换到浅色主题" : "切换到深色主题"}
          >
            {resolved === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <TaskEditorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDate={today}
        defaultType={defaultType}
        defaultCategoryId={defaultCategoryId}
      />
    </aside>
  );
}
