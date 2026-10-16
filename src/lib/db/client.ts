import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { lerEnvBanco } from "@/lib/env";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/** Cria uma conexão nova. Aceita `file:`, `libsql://` e `:memory:` (FUN-RF-03). */
export async function criarDb(url: string, authToken?: string): Promise<{ db: Db; client: Client }> {
  const client = createClient({ url, authToken: authToken || undefined });
  // SQLite só aplica foreign keys com o pragma ligado por conexão.
  await client.execute("PRAGMA foreign_keys = ON");
  return { db: drizzle(client, { schema }), client };
}

const global = globalThis as unknown as { __dbApp?: Promise<Db> };

/** Conexão compartilhada da aplicação, criada sob demanda (não quebra o build sem .env). */
export function getDb(): Promise<Db> {
  if (!global.__dbApp) {
    const { DATABASE_URL, DATABASE_AUTH_TOKEN } = lerEnvBanco();
    global.__dbApp = criarDb(DATABASE_URL, DATABASE_AUTH_TOKEN).then((r) => r.db);
  }
  return global.__dbApp;
}
