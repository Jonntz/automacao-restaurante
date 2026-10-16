// Gera as credenciais do n8n a partir das variáveis de ambiente (INF-RF-04).
// Roda dentro do container n8n-bootstrap (Node puro, sem dependências).
// Uso: node render-credentials.js /tmp/credenciais.json
const fs = require("node:fs");
const path = require("node:path");
const IDS = require(path.join(__dirname, "..", "ids.json"));

const PLACEHOLDER = "PREENCHA_NO_ENV";

function montarCredenciais(env) {
  const avisos = [];
  const valor = (nome) => {
    const v = String(env[nome] ?? "").trim();
    if (!v) {
      avisos.push(`${nome} vazio: credencial criada com placeholder (preencha o .env e rode pnpm n8n:import)`);
      return PLACEHOLDER;
    }
    return v;
  };
  const c = IDS.credenciais;
  return {
    avisos,
    credenciais: [
      {
        id: c.gemini,
        name: "Gemini (free tier)",
        type: "googlePalmApi",
        data: { host: "https://generativelanguage.googleapis.com", apiKey: valor("GEMINI_API_KEY") },
      },
      {
        id: c.whatsapp,
        name: "WhatsApp Cloud API",
        type: "whatsAppApi",
        data: { accessToken: valor("WHATSAPP_ACCESS_TOKEN"), businessAccountId: valor("WHATSAPP_BUSINESS_ACCOUNT_ID") },
      },
      {
        id: c.postgres,
        name: "Postgres (memória do chat)",
        type: "postgres",
        data: {
          host: env.DB_POSTGRESDB_HOST || "postgres",
          port: Number(env.DB_POSTGRESDB_PORT || 5432),
          database: valor("DB_POSTGRESDB_DATABASE"),
          user: valor("DB_POSTGRESDB_USER"),
          password: valor("DB_POSTGRESDB_PASSWORD"),
          ssl: "disable",
        },
      },
      {
        id: c.webhookInterno,
        name: "Webhook interno (x-webhook-secret)",
        type: "httpHeaderAuth",
        data: { name: "x-webhook-secret", value: valor("N8N_WEBHOOK_SECRET") },
      },
      {
        id: c.apiBot,
        name: "API do Bot (x-api-key)",
        type: "httpHeaderAuth",
        data: { name: "x-api-key", value: valor("BOT_API_KEY") },
      },
    ],
  };
}

if (require.main === module) {
  const destino = process.argv[2];
  if (!destino) {
    console.error("uso: node render-credentials.js <arquivo-de-saida>");
    process.exit(1);
  }
  const { credenciais, avisos } = montarCredenciais(process.env);
  for (const aviso of avisos) console.warn(`[bootstrap] aviso: ${aviso}`);
  fs.writeFileSync(destino, JSON.stringify(credenciais), { mode: 0o600 });
  console.log(`[bootstrap] ${credenciais.length} credenciais geradas`);
}

module.exports = { montarCredenciais, PLACEHOLDER };
