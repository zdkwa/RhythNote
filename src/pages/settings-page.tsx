import { Archive, FolderKanban, Palette, Tags } from "lucide-react";
import { NavLink, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { GeneralSettings } from "@/features/settings/general-settings";
import { ArchiveList } from "@/features/settings/archive-list";

const SECTIONS = [
  { id: "general", label: "通用", icon: Palette },
  { id: "tags", label: "标签管理", icon: Tags },
  { id: "categories", label: "分类管理", icon: FolderKanban },
  { id: "archive", label: "归档任务", icon: Archive },
] as const;

function SectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="paper-panel rounded-2xl p-8">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function SettingsPage() {
  const { section = "general" } = useParams();

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="h-fit lg:sticky lg:top-2">
        <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Settings
        </p>
        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card/50 p-1 lg:flex-col">
          {SECTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={`/settings/${item.id}`}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors lg:w-full",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        {section === "general" ? <GeneralSettings /> : null}
        {section === "tags" ? (
          <SectionPlaceholder
            title="标签管理"
            description="标签 CRUD 面板将由任务域成员接入。这里会支持新建、改名、改色与删除。"
          />
        ) : null}
        {section === "categories" ? (
          <SectionPlaceholder
            title="分类管理"
            description="分类 CRUD 面板将由任务域成员接入。删除分类只会让任务变为未分类。"
          />
        ) : null}
        {section === "archive" ? <ArchiveList /> : null}
      </div>
    </div>
  );
}
