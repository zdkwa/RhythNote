import { Database, HardDrive, Info, ShieldCheck } from "lucide-react";
import { usingMemoryDatabase } from "@/data";
import { getDatabasePathLabel } from "@/data/db";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ThemeCard } from "@/features/settings/theme-card";

export function GeneralSettings() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Preferences / General"
        title="通用"
        description="外观与本地数据。RhythNote 不需要账号，也不会把任务发送到网络。"
      />
      <ThemeCard />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="paper-panel rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold">数据存储</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                SQLite 数据库保存在本机应用配置目录。所有任务、记录与设置只属于这台电脑。
              </p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-2">
              <dt className="text-muted-foreground">模式</dt>
              <dd>
                <Badge variant={usingMemoryDatabase ? "accent" : "done"}>
                  {usingMemoryDatabase ? "浏览器预览 · 内存数据" : "Tauri · 本地 SQLite"}
                </Badge>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-border/70 pt-2">
              <dt className="shrink-0 text-muted-foreground">路径</dt>
              <dd className="break-all text-right font-mono text-[11px] text-foreground">
                {usingMemoryDatabase
                  ? "浏览器预览不写 SQLite"
                  : getDatabasePathLabel()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="paper-panel rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold">离线与隐私</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                应用没有联网依赖，没有账号、遥测或云端同步。关闭网络也可以完整使用。
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-border/80 px-2 py-1">
              <HardDrive className="h-3 w-3" /> 本地优先
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/80 px-2 py-1">
              <ShieldCheck className="h-3 w-3" /> 无账号
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/80 px-2 py-1">
              <Info className="h-3 w-3" /> V1 无云同步
            </span>
          </div>
        </div>
      </section>

      <section className="paper-panel rounded-2xl p-5">
        <h2 className="font-display text-lg font-semibold">关于 RhythNote</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          用规则描述重复，用记录保存事实。当前版本 0.1.0；归档在 V1 中为单向操作，历史记录永久保留。
        </p>
      </section>
    </div>
  );
}
