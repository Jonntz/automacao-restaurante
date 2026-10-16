import fs from "node:fs";
import path from "node:path";
import { criarDb } from "@/lib/db/client";
import { migrar } from "@/lib/db/migrar";
import { seedDemo } from "@/lib/db/seed";
import { lerEnvBanco } from "@/lib/env";

async function main() {
  const { DATABASE_URL, DATABASE_AUTH_TOKEN } = lerEnvBanco();
  if (!DATABASE_URL.startsWith("file:")) {
    console.error("✖ db:reset só apaga bancos locais (DATABASE_URL começando com file:). Abortado.");
    process.exit(1);
  }
  const arquivo = path.resolve(DATABASE_URL.slice("file:".length));
  for (const sufixo of ["", "-wal", "-shm", "-journal"]) fs.rmSync(arquivo + sufixo, { force: true });

  const { db, client } = await criarDb(DATABASE_URL, DATABASE_AUTH_TOKEN);
  await migrar(db);
  await seedDemo(db);
  client.close();
  console.log(`✔ Banco recriado em ${arquivo} com o seed demo`);
}

main().catch((erro) => {
  console.error("✖", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
