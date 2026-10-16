import { criarDb } from "@/lib/db/client";
import { migrar } from "@/lib/db/migrar";
import { lerEnvBanco } from "@/lib/env";

async function main() {
  const { DATABASE_URL, DATABASE_AUTH_TOKEN } = lerEnvBanco();
  const { db, client } = await criarDb(DATABASE_URL, DATABASE_AUTH_TOKEN);
  await migrar(db);
  client.close();
  console.log(`✔ Migrations aplicadas em ${DATABASE_URL.split("?")[0]}`);
}

main().catch((erro) => {
  console.error("✖", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
