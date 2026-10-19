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
    databasePromise = Database.load("sqlite:rhythnote.db").catch((error) => {
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
