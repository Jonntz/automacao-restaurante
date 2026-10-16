// Lista os IDs dos workflows que devem ser publicados: todos os que têm algum gatilho.
// No n8n 2.x isso inclui sub-workflows ("Execute Workflow Trigger"): o nó Execute Workflow
// só executa a versão publicada (INF-RF-04).
// Uso: node publicaveis.js /pasta/de/workflows  → imprime um ID por linha
const fs = require("node:fs");
const path = require("node:path");

const ehGatilho = (tipo) => /trigger$/i.test(tipo) || tipo === "n8n-nodes-base.webhook";

function idsParaPublicar(workflows) {
  return workflows.filter((wf) => (wf.nodes ?? []).some((n) => ehGatilho(n.type))).map((wf) => wf.id);
}

if (require.main === module) {
  const pasta = process.argv[2];
  const workflows = fs
    .readdirSync(pasta)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(pasta, f), "utf8")));
  console.log(idsParaPublicar(workflows).join("\n"));
}

module.exports = { idsParaPublicar };
