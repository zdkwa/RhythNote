import Database from "@tauri-apps/plugin-sql";

let databasePromise: Promise<Database> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

/**
 * SQLite 同时只允许一个写事务。前端可能同时触发完成、暂停、新建等写操作，
 * 在这里串行化 execute，避免多个写请求互相争锁导致界面长时间等待。
 */
function serializeWrites(db: Database): Database {
  return new Proxy(db, {
    get(target, property) {
      if (property === "execute") {
        return (...args: Parameters<Database["execute"]>) => {
          const run = writeQueue.then(
            () => target.execute(...args),
            () => target.execute(...args),
          );
          writeQueue = run.then(
            () => undefined,
            () => undefined,
          );
          return run;
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as Database;
}

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
        return serializeWrites(db);
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
