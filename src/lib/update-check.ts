export const UPDATE_REPO = "zdkwa/RhythNote";
export const RELEASES_URL = `https://github.com/${UPDATE_REPO}/releases`;
const LATEST_RELEASE_API = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`;

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl: string;
  publishedAt: string | null;
  notes: string;
}

interface GitHubRelease {
  tag_name?: string;
  html_url?: string;
  published_at?: string | null;
  body?: string | null;
}

export function normalizeVersionTag(tag: string): string {
  return tag.trim().replace(/^v/i, "");
}

/** 只比较数字段，足够覆盖 RhythNote 的 0.x.y 版本。 */
export function compareVersions(left: string, right: string): number {
  const a = normalizeVersionTag(left)
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10) || 0);
  const b = normalizeVersionTag(right)
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }
  return 0;
}

function errorMessageForStatus(status: number, hasToken: boolean): string {
  if (status === 404) {
    return hasToken
      ? "未找到 Release。请确认仓库已有正式版本，或 Token 是否有访问权限。"
      : "仓库为 Private 或尚无 Release。请在下方配置只读 GitHub Token 后重试。";
  }
  if (status === 401 || status === 403) {
    return "GitHub Token 无效或没有访问权限，请检查后重试。";
  }
  return `检查更新失败（HTTP ${status}），请稍后重试。`;
}

export async function checkForUpdate(
  currentVersion: string,
  token = "",
): Promise<UpdateCheckResult> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  let response: Response;
  try {
    response = await fetch(LATEST_RELEASE_API, { headers });
  } catch {
    throw new Error("无法连接 GitHub，请检查网络后重试。");
  }

  if (!response.ok) {
    throw new Error(errorMessageForStatus(response.status, Boolean(token.trim())));
  }

  const release = (await response.json()) as GitHubRelease;
  if (!release.tag_name) {
    throw new Error("GitHub 返回的 Release 信息不完整。");
  }

  const latestVersion = normalizeVersionTag(release.tag_name);
  return {
    currentVersion,
    latestVersion,
    hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
    releaseUrl: release.html_url ?? `${RELEASES_URL}/tag/${release.tag_name}`,
    publishedAt: release.published_at ?? null,
    notes: release.body ?? "",
  };
}
