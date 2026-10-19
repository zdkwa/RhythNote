import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { getVersion } from "@tauri-apps/api/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  checkForUpdate,
  type UpdateCheckResult,
} from "@/lib/update-check";

const TOKEN_STORAGE_KEY = "rhythnote.github-update-token";
const FALLBACK_VERSION = "0.1.1";

function readStoredToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function UpdateCard() {
  const [currentVersion, setCurrentVersion] = useState(FALLBACK_VERSION);
  const [token, setToken] = useState(readStoredToken);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getVersion()
      .then((version) => {
        if (!cancelled) setCurrentVersion(version);
      })
      .catch(() => {
        // 浏览器预览没有 Tauri 运行时，使用打包版本作为兜底。
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveToken = (nextToken: string) => {
    setToken(nextToken);
    try {
      if (nextToken.trim()) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken.trim());
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // 隐私模式下可能无法写入 localStorage，不影响本次检查。
    }
    toast.success(nextToken.trim() ? "Token 已保存在本机" : "已清除本机 Token");
  };

  const handleCheck = async () => {
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const next = await checkForUpdate(currentVersion, token);
      setResult(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "检查更新失败，请重试。");
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="paper-panel rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RefreshCw className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold">检查更新</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              仅在你点击时访问 GitHub Releases API，不会上传任何任务数据。
            </p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          当前 v{currentVersion}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => void handleCheck()}
          disabled={checking}
          className="gap-1.5"
        >
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {checking ? "检查中…" : "检查更新"}
        </Button>

        {result && !result.hasUpdate ? (
          <Badge variant="done" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            已是最新版本
          </Badge>
        ) : null}

        {result?.hasUpdate ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">发现 v{result.latestVersion}</Badge>
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <a href={result.releaseUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                打开发布页
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      {result?.hasUpdate ? (
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          最新版本 v{result.latestVersion}
          {result.publishedAt
            ? ` · 发布于 ${new Date(result.publishedAt).toLocaleDateString("zh-CN")}`
            : ""}
          。下载安装包后覆盖安装即可，本地数据库会保留。
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-destructive/25 bg-destructive/[0.05] px-3 py-2 text-[11px] leading-5 text-destructive">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <details className="mt-4 rounded-lg border border-border/75 bg-muted/25 px-3 py-2">
        <summary className="cursor-pointer list-none text-[11px] font-medium text-muted-foreground hover:text-foreground">
          <KeyRound className="mr-1 inline h-3 w-3" />
          私有仓库访问 Token（可选）
        </summary>
        <div className="mt-3 space-y-2">
          <Input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="ghp_… 或 github_pat_…"
            autoComplete="off"
            className="h-9 text-xs"
            aria-label="GitHub 只读 Token"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => saveToken(token)}
            >
              保存到本机
            </Button>
            {token ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => saveToken("")}
              >
                清除
              </Button>
            ) : null}
          </div>
          <p className="text-[10px] leading-4 text-muted-foreground">
            仓库为 Private 时需要只读 Token。Token 仅保存在本机浏览器存储，只会发送给
            api.github.com，不会写入项目或上传。
          </p>
        </div>
      </details>
    </section>
  );
}
