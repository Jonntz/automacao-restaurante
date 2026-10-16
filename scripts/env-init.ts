// Cria o .env a partir do .env.example com segredos aleatórios (ENT-RF-07).
// Uso: pnpm env:init   — nunca sobrescreve um .env existente.
import { randomBytes } from "node:crypto";
import fs from "node:fs";

/** Variáveis que o .env.example traz com placeholder "troque…" e que são geradas aqui. */
export const SEGREDOS_GERADOS = [
  "ADMIN_PASSWORD",
  "SESSION_SECRET",
  "BOT_API_KEY",
  "N8N_WEBHOOK_SECRET",
  "ABACATEPAY_WEBHOOK_SECRET",
  "WHATSAPP_VERIFY_TOKEN",
  "POSTGRES_PASSWORD",
  "N8N_ENCRYPTION_KEY",
] as const;

const BYTES: Record<(typeof SEGREDOS_GERADOS)[number], number> = {
  ADMIN_PASSWORD: 9,
  SESSION_SECRET: 32,
  BOT_API_KEY: 24,
  N8N_WEBHOOK_SECRET: 24,
  ABACATEPAY_WEBHOOK_SECRET: 24,
  WHATSAPP_VERIFY_TOKEN: 16,
  POSTGRES_PASSWORD: 16,
  N8N_ENCRYPTION_KEY: 32,
};

const hexAleatorio = (bytes: number) => randomBytes(bytes).toString("hex");

export function preencherEnv(exemplo: string, gerar: (bytes: number) => string = hexAleatorio) {
  const valores = Object.fromEntries(SEGREDOS_GERADOS.map((chave) => [chave, gerar(BYTES[chave])]));
  const conteudo = exemplo
    .split("\n")
    .map((linha) => {
      const chave = linha.slice(0, linha.indexOf("="));
      return chave in valores ? `${chave}=${valores[chave]}` : linha;
    })
    .join("\n");
  return { conteudo, senhaAdmin: valores.ADMIN_PASSWORD };
}

function main() {
  if (fs.existsSync(".env")) {
    console.error("✖ Já existe um .env — nada foi alterado. Apague-o antes se quiser gerar outro.");
    process.exit(1);
  }
  const { conteudo, senhaAdmin } = preencherEnv(fs.readFileSync(".env.example", "utf8"));
  fs.writeFileSync(".env", conteudo, { mode: 0o600 });
  const email = /^ADMIN_EMAIL=(.*)$/m.exec(conteudo)?.[1];
  console.log("✔ .env criado com segredos aleatórios.");
  console.log(`  Painel: http://localhost:3000/admin  →  ${email} / ${senhaAdmin}`);
  console.log("  Falta só: GEMINI_API_KEY (veja docs/setup-gemini.md).");
}

if (process.argv[1]?.endsWith("env-init.ts")) main();
