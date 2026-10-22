"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CardPedido as Pedido, EstadoPainel } from "@/lib/admin/painel";
import { CardPedido } from "./card-pedido";
import { DetalhesPedido } from "./detalhes-pedido";
import { useBipe } from "./use-bipe";

const INTERVALO_MS = 5000;
const DESTAQUE_MS = 30_000;

const idsPagos = (estado: EstadoPainel) =>
  new Set(estado.colunas.find((c) => c.id === "pagos")?.pedidos.map((p) => p.id) ?? []);

export function Kanban() {
  const [estado, setEstado] = useState<EstadoPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<number | null>(null);
  // Relógio só no cliente: `new Date()` no render quebraria o prerender (Cache Components).
  const [agora, setAgora] = useState<Date | null>(null);
  const [destaques, setDestaques] = useState<Map<number, number>>(new Map());
  const [aberto, setAberto] = useState<number | null>(null);
  const pagosAnteriores = useRef<Set<number> | null>(null);
  const bipe = useBipe();
  const router = useRouter();

  const recarregar = useCallback(async () => {
    try {
      const resposta = await fetch("/api/admin/pedidos", { cache: "no-store" });
      if (resposta.status === 401) {
        router.push("/login?de=/admin/pedidos");
        return;
      }
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const novo = (await resposta.json()) as EstadoPainel;

      const pagos = idsPagos(novo);
      if (pagosAnteriores.current) {
        const chegaram = [...pagos].filter((id) => !pagosAnteriores.current!.has(id));
        if (chegaram.length) {
          const ate = Date.now() + DESTAQUE_MS;
          setDestaques((d) => new Map([...d, ...chegaram.map((id) => [id, ate] as const)]));
          bipe.tocar();
        }
      }
      pagosAnteriores.current = pagos;

      setEstado(novo);
      setErro(null);
      setUltimaAtualizacao(Date.now());
    } catch (e) {
      setErro(`Falha ao atualizar (${(e as Error).message}). Tentando de novo…`);
    }
  }, [bipe, router]);

  // Polling a cada 5 s, pausado com a aba oculta (ADM-RF-07).
  useEffect(() => {
    void recarregar();
    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") void recarregar();
    }, INTERVALO_MS);
    const aoVoltar = () => document.visibilityState === "visible" && void recarregar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [recarregar]);

  // Relógio para "há X min" e expiração dos destaques.
  useEffect(() => {
    const tique = () => setAgora(new Date());
    tique();
    const t = setInterval(tique, 1000);
    return () => clearInterval(t);
  }, []);

  const pedidoAberto: Pedido | null =
    estado?.colunas.flatMap((c) => c.pedidos).find((p) => p.id === aberto) ?? null;
  const segundos =
    ultimaAtualizacao && agora ? Math.max(0, Math.round((agora.getTime() - ultimaAtualizacao) / 1000)) : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <h1 className="text-3xl uppercase">Pedidos</h1>
        <span className="text-xs text-muted-foreground">
          {segundos === null ? "Carregando…" : `Atualizado há ${segundos}s`}
        </span>
        {erro && <span className="text-xs text-destructive">{erro}</span>}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void recarregar()}>
            <RefreshCw /> Atualizar
          </Button>
          <Button variant={bipe.ativo ? "secondary" : "outline"} size="sm" onClick={bipe.alternar}>
            {bipe.ativo ? <Bell /> : <BellOff />} {bipe.ativo ? "Som ativado" : "Ativar som"}
          </Button>
        </div>
      </div>

      {/* 100% da tela (ADM-RF-06): ≥ 1280px as 5 colunas dividem a largura; abaixo, rolagem
          horizontal (no celular, ~88% por coluna com encaixe). Os cards rolam dentro de cada coluna. */}
      <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto pb-2 xl:grid xl:snap-none xl:grid-cols-5 xl:grid-rows-1 xl:overflow-x-visible">
        {agora &&
          (estado?.colunas ?? []).map((coluna) => (
            <section
              key={coluna.id}
              className="flex w-[88vw] shrink-0 snap-start flex-col gap-3 rounded-xl bg-muted/50 p-3 sm:w-72 xl:w-auto xl:min-w-0"
            >
              <header className="flex shrink-0 items-center justify-between">
                <h2 className="text-base uppercase">{coluna.titulo}</h2>
                <Badge variant="secondary">{coluna.pedidos.length}</Badge>
              </header>
              {/* *:shrink-0: os cards não encolhem (a lista rola); -m-1 p-1: folga para o anel de destaque */}
              <div className="-m-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-1 *:shrink-0">
                {coluna.pedidos.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">Nenhum pedido</p>
                )}
                {coluna.pedidos.map((pedido) => (
                  <CardPedido
                    key={pedido.id}
                    pedido={pedido}
                    agora={agora}
                    destacado={(destaques.get(pedido.id) ?? 0) > agora.getTime()}
                    aoAbrir={() => setAberto(pedido.id)}
                    aoAlterar={() => void recarregar()}
                  />
                ))}
              </div>
            </section>
          ))}
      </div>

      <DetalhesPedido pedido={pedidoAberto} aoFechar={() => setAberto(null)} />
    </div>
  );
}
