import path from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { Db } from "./client";

export const PASTA_MIGRATIONS = path.resolve(process.cwd(), "drizzle");

export async function migrar(db: Db, pasta = PASTA_MIGRATIONS): Promise<void> {
  await migrate(db, { migrationsFolder: pasta });
}
