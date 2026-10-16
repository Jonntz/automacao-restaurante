// Traz para o git os workflows editados na UI do n8n, normalizados para diff limpo (INF-RF-07).
// Uso: pnpm n8n:export   (com `pnpm infra:up` rodando)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Workflow = Record<string, unknown> & { id?: string; meta?: Record<string, unknown> | null };
type Ids = { workflows: Record<string, string> };

/** Variáveis cujo valor nunca pode aparecer num workflow versionado. */
const VARIAVEIS_SECRETAS = [
  "BOT_API_KEY",
  "N8N_WEBHOOK_SECRET",
  "GEMINI_API_KEY",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_APP_SECRET",
  "POSTGRES_PASSWORD",
  "N8N_ENCRYPTION_KEY",
  "SESSION_SECRET",
  "ABACATEPAY_API_KEY",
];

export function normalizarWorkflow(
  exportado: Workflow,
  { ids, segredos }: { ids: Ids; segredos: string[] },
): { slug: string | null; workflow: Workflow } {
  const meta = exportado.meta ? { ...exportado.meta } : null;
  if (meta) delete meta.instanceId;
  const workflow: Workflow = {
    id: exportado.id,
    name: exportado.name,
    active: false,
    nodes: exportado.nodes,
    connections: exportado.connections,
    settings: exportado.settings,
    staticData: exportado.staticData ?? null,
    meta,
  };

  const texto = JSON.stringify(workflow);
  const vazado = segredos.find((s) => s.length >= 8 && texto.includes(s));
  if (vazado) throw new Error(`Workflow "${String(exportado.name)}" contém um segredo do .env. Use credenciais do n8n.`);

  const slug = Object.entries(ids.workflows).find(([, id]) => id === exportado.id)?.[0] ?? null;
  return { slug, workflow };
}

function main() {
  if (fs.existsSync(".env")) process.loadEnvFile(".env");
  const ids = JSON.parse(fs.readFileSync("n8n/ids.json", "utf8")) as Ids;
  const segredos = VARIAVEIS_SECRETAS.map((v) => process.env[v] ?? "").filter(Boolean);
  const temporario = path.resolve(".n8n-export");
  fs.rmSync(temporario, { recursive: true, force: true });

  const compose = (...args: string[]) => execFileSync("docker", ["compose", ...args], { stdio: "inherit" });
  compose("exec", "-T", "n8n", "rm", "-rf", "/tmp/export");
  compose("exec", "-T", "n8n", "n8n", "export:workflow", "--all", "--separate", "--pretty", "--output=/tmp/export");
  compose("cp", "n8n:/tmp/export", temporario);

  for (const arquivo of fs.readdirSync(temporario).filter((f) => f.endsWith(".json"))) {
    const exportado = JSON.parse(fs.readFileSync(path.join(temporario, arquivo), "utf8")) as Workflow;
    const { slug, workflow } = normalizarWorkflow(exportado, { ids, segredos });
    if (!slug) {
      console.warn(`⚠️  "${String(exportado.name)}" (${exportado.id}) não está em n8n/ids.json — ignorado`);
      continue;
    }
    fs.writeFileSync(path.join("n8n/workflows", `${slug}.json`), JSON.stringify(workflow, null, 2) + "\n");
    console.log(`✔ n8n/workflows/${slug}.json`);
  }
  fs.rmSync(temporario, { recursive: true, force: true });
}

if (process.argv[1]?.endsWith("n8n-export.ts")) main();
