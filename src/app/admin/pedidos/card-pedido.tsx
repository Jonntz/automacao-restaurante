"use client";

import { useTransition } from "react";
import { Bike, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { ResultadoAcao } from "@/lib/admin/cardapio";
import type { CardPedido as Pedido } from "@/lib/admin/painel";
import { tempoRelativo } from "@/lib/admin/tempo";
import { cn } from "@/lib/utils";
import { avancarPedidoAcao, cancelarPedidoAcao, simularPagamentoAcao, verificarPagamentoAcao } from "./acoes";

const nomeCliente = (p: Pedido) =>
  p.cliente.nome ?? (p.canal === "teste" ? "Cliente teste" : `…${p.cliente.telefone.slice(-4)}`);

export function CardPedido({
  pedido,
  agora,
  destacado,
  aoAbrir,
  aoAlterar,
}: {
  pedido: Pedido;
  agora: Date;
  destacado: boolean;
  aoAbrir: () => void;
  aoAlterar: () => void;
}) {
  const [executando, iniciar] = useTransition();
  const { acoes } = pedido;

  const executar = (acao: () => Promise<ResultadoAcao>) =>
    iniciar(async () => {
      const r = await acao();
      if (r.ok) toast.success(r.mensagem);
      else toast.error(r.erro);
      aoAlterar();
    });

  return (
    <Card
      className={cn(
        "gap-2 py-3 transition-shadow",
        destacado && "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20",
        pedido.status === "cancelado" && "opacity-70",
      )}
    >
      <CardHeader className="gap-1 px-3">
        <button type="button" onClick={aoAbrir} className="flex items-center justify-between text-left">
          <span className="font-semibold">{pedido.numero}</span>
          <span className="text-xs text-muted-foreground" title={new Date(pedido.criadoEm).toLocaleString("pt-BR")}>
            {tempoRelativo(new Date(pedido.criadoEm), agora)}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {pedido.tipoEntrega === "entrega" ? (
            <Bike className="size-4 text-muted-foreground" aria-label="Entrega" />
          ) : (
            <ShoppingBag className="size-4 text-muted-foreground" aria-label="Retirada" />
          )}
          <span className="truncate">{nomeCliente(pedido)}</span>
          {pedido.canal === "teste" && <Badge variant="outline">TESTE</Badge>}
          {pedido.status === "cancelado" && <Badge variant="secondary">Cancelado</Badge>}
        </div>
        {pedido.alerta === "PAGO_APOS_CANCELAMENTO" && (
          <Badge variant="destructive" className="w-fit">
            Pago após cancelamento — estornar manualmente
          </Badge>
        )}
      </CardHeader>

      <CardContent className="px-3 text-sm">
        <ul className="space-y-0.5 text-muted-foreground">
          {pedido.itens.map((i, n) => (
            <li key={n}>
              {i.quantidade}x {i.nome}
              {i.observacao && <span className="italic"> ({i.observacao})</span>}
            </li>
          ))}
        </ul>
        <p className="mt-1.5 font-medium">{pedido.total}</p>
      </CardContent>

      {(acoes.avancar || acoes.cancelar || acoes.simular || acoes.verificar) && (
        <CardFooter className="flex flex-wrap gap-1.5 px-3">
          {acoes.avancar && (
            <Button size="sm" disabled={executando} onClick={() => executar(() => avancarPedidoAcao(pedido.id, acoes.avancar!.para))}>
              {acoes.avancar.rotulo}
            </Button>
          )}
          {acoes.simular && (
            <Button size="sm" variant="secondary" disabled={executando} onClick={() => executar(() => simularPagamentoAcao(pedido.id))}>
              Simular pagamento
            </Button>
          )}
          {acoes.verificar && (
            <Button size="sm" variant="outline" disabled={executando} onClick={() => executar(() => verificarPagamentoAcao(pedido.id))}>
              Verificar
            </Button>
          )}
          {acoes.cancelar && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" disabled={executando} className="text-destructive">
                  Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar o pedido {pedido.numero}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O cliente será avisado pelo WhatsApp.
                    {pedido.status === "pago" && " Este pedido já foi pago: o estorno do Pix precisa ser feito manualmente."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => executar(() => cancelarPedidoAcao(pedido.id))}>
                    Cancelar pedido
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
