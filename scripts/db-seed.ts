import { criarDb } from "@/lib/db/client";
import { seedDemo } from "@/lib/db/seed";
import { lerEnvBanco } from "@/lib/env";

async function main() {
  const { DATABASE_URL, DATABASE_AUTH_TOKEN } = lerEnvBanco();
  const { db, client } = await criarDb(DATABASE_URL, DATABASE_AUTH_TOKEN);
  await seedDemo(db);
  client.close();
  console.log("✔ Seed demo da Container Lanches aplicado (idempotente)");
}

main().catch((erro) => {
  console.error("✖", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
