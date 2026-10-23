import Database from "@tauri-apps/plugin-sql";

let databasePromise: Promise<Database> | null = null;

export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

export function getDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = Database.load("sqlite:rhythnote.db")
      .then(async (db) => {
        try {
          // 避免并发写入时无限等待：SQLite 最多等待 5 秒后返回 busy 错误。
          await db.execute("PRAGMA busy_timeout = 5000");
        } catch {
          // busy_timeout 设置失败不应阻止应用启动。
        }
        return db;
      })
      .catch((error) => {
        databasePromise = null;
        throw error;
      });
  }
  return databasePromise;
}

export function resetDatabaseForTests(): void {
  databasePromise = null;
}

export function getDatabasePathLabel(): string {
  return "%APPDATA%\\com.rhythnote.desktop\\rhythnote.db";
}
