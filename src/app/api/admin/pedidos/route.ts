import { listarPedidosPainel } from "@/lib/admin/painel";
import { permiteSimulacao } from "@/lib/admin/deps";
import { obterSessao } from "@/lib/auth/exigir-sessao";
import { getDb } from "@/lib/db/client";

// Estado do kanban para o polling do painel (ADM-RF-05, ADM-RF-07).
export async function GET() {
  if (!(await obterSessao())) {
    return Response.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
  }
  const estado = await listarPedidosPainel(await getDb(), { agora: new Date(), permiteSimulacao: permiteSimulacao() });
  return Response.json(estado, { headers: { "cache-control": "no-store" } });
}
