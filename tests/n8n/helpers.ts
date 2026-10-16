import fs from "node:fs";
import path from "node:path";

export type No = {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
  onError?: string;
  retryOnFail?: boolean;
  webhookId?: string;
};
type Conexao = { node: string; type: string; index: number };
export type Workflow = {
  id: string;
  name: string;
  nodes: No[];
  connections: Record<string, Record<string, Conexao[][]>>;
};

const RAIZ = path.resolve(__dirname, "../..");
export const ids = JSON.parse(fs.readFileSync(path.join(RAIZ, "n8n/ids.json"), "utf8"));

export function carregarWorkflow(slug: string): Workflow {
  return JSON.parse(fs.readFileSync(path.join(RAIZ, "n8n/workflows", `${slug}.json`), "utf8"));
}

export function lerArquivo(relativo: string): string {
  return fs.readFileSync(path.join(RAIZ, relativo), "utf8");
}

export function acharNo(wf: Workflow, nome: string): No {
  const no = wf.nodes.find((n) => n.name === nome);
  if (!no) throw new Error(`nó "${nome}" não existe em ${wf.name}`);
  return no;
}

/** Destinos de cada saída de um nó: [[destinos da saída 0], [destinos da saída 1], …]. */
export function destinos(wf: Workflow, origem: string, tipo = "main"): string[][] {
  return (wf.connections[origem]?.[tipo] ?? []).map((saida) => saida.map((c) => c.node));
}

/** Executa o jsCode de um nó Code com um $input falso (o código só pode usar $input e JS puro). */
export function executarCode(jsCode: string, itens: { json: unknown }[]) {
  const $input = { first: () => itens[0], all: () => itens };
  return new Function("$input", jsCode)($input) as { json: Record<string, unknown> }[];
}
