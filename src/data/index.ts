import { MemoryRepository } from "@/data/memoryRepository";
import { SqliteRepository } from "@/data/sqliteRepository";
import { isTauriRuntime } from "@/data/db";
import type { Repository } from "@/data/repository";

export const usingMemoryDatabase = !isTauriRuntime();

export const repository: Repository = usingMemoryDatabase
  ? new MemoryRepository()
  : new SqliteRepository();

export type { Repository } from "@/data/repository";
