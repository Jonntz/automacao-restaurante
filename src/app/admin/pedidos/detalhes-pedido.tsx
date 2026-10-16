"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CardPedido } from "@/lib/admin/painel";

const dataHora = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR") : "—");
const STATUS_PAGAMENTO = { pendente: "Pendente", pago: "Pago", expirado: "Expirado", cancelado: "Cancelado" };

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export function DetalhesPedido({ pedido, aoFechar }: { pedido: CardPedido | null; aoFechar: () => void }) {
  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Código Pix copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <Sheet open={pedido !== null} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {pedido && (
          <>
            <SheetHeader>
              <SheetTitle>
                Pedido {pedido.numero} <Badge variant="outline">{pedido.statusTexto}</Badge>
              </SheetTitle>
              <SheetDescription>
                {pedido.tipoEntrega === "entrega" ? "Entrega" : "Retirada"} · {pedido.canal === "teste" ? "Chat de teste" : "WhatsApp"}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 pb-6">
              <section className="space-y-1.5">
                <h3 className="text-sm font-medium">Itens</h3>
                {pedido.itens.map((i, n) => (
                  <div key={n} className="flex justify-between gap-4 text-sm">
                    <span>
                      {i.quantidade}x {i.nome}
                      {i.observacao && <span className="block text-xs italic text-muted-foreground">{i.observacao}</span>}
                    </span>
                    <span>{i.subtotal}</span>
                  </div>
                ))}
                <Separator />
                <Linha rotulo="Subtotal">{pedido.subtotal}</Linha>
                <Linha rotulo="Taxa de entrega">{pedido.taxaEntrega}</Linha>
                <Linha rotulo="Total">
                  <strong>{pedido.total}</strong>
                </Linha>
              </section>

              {pedido.observacoes && (
                <section className="space-y-1">
                  <h3 className="text-sm font-medium">Observações</h3>
                  <p className="text-sm text-muted-foreground">{pedido.observacoes}</p>
                </section>
              )}

              <section className="space-y-1.5">
                <h3 className="text-sm font-medium">Cliente</h3>
                <Linha rotulo="Nome">{pedido.cliente.nome ?? "—"}</Linha>
                <Linha rotulo="Telefone">{pedido.cliente.telefone}</Linha>
                {pedido.enderecoEntrega && <Linha rotulo="Endereço">{pedido.enderecoEntrega}</Linha>}
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-medium">Pagamento (Pix)</h3>
                {pedido.pagamento ? (
                  <>
                    <Linha rotulo="Status">{STATUS_PAGAMENTO[pedido.pagamento.status]}</Linha>
                    <Linha rotulo="Provedor">{pedido.pagamento.provedor}</Linha>
                    <Linha rotulo="Expira em">{dataHora(pedido.pagamento.expiraEm)}</Linha>
                    <Linha rotulo="Pago em">{dataHora(pedido.pagamento.pagoEm)}</Linha>
                    <div className="flex items-start gap-2 rounded-md bg-muted p-2">
                      <code className="flex-1 break-all text-xs">{pedido.pagamento.copiaECola}</code>
                      <Button size="icon-sm" variant="ghost" aria-label="Copiar código Pix" onClick={() => copiar(pedido.pagamento!.copiaECola)}>
                        <Copy />
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma cobrança gerada.</p>
                )}
                {pedido.alerta === "PAGO_APOS_CANCELAMENTO" && (
                  <Badge variant="destructive">Pago após cancelamento — estornar manualmente</Badge>
                )}
              </section>

              <section className="space-y-1.5">
                <Linha rotulo="Criado em">{dataHora(pedido.criadoEm)}</Linha>
                <Linha rotulo="Atualizado em">{dataHora(pedido.atualizadoEm)}</Linha>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
