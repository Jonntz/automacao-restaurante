import { describe, expect, it } from "vitest";
import { mensagemDeStatus } from "@/lib/notificacoes/mensagens";

const config = { tempoEstimado: "40–50 min", enderecoRetirada: "Rua Exemplo, 123 – Centro" };

describe("mensagemDeStatus (PED-RF-18)", () => {
  it.each(["pago", "em_preparo", "saiu_para_entrega", "pronto_para_retirada", "entregue", "cancelado"] as const)(
    "%s menciona o número do pedido",
    (status) => {
      const msg = mensagemDeStatus({ id: 12, tipoEntrega: "entrega" }, status, config);
      expect(msg).toContain("#0012");
    },
  );

  it("saiu para entrega inclui o tempo estimado", () => {
    expect(mensagemDeStatus({ id: 12, tipoEntrega: "entrega" }, "saiu_para_entrega", config)).toContain("40–50 min");
  });

  it("pronto para retirada inclui o endereço", () => {
    expect(mensagemDeStatus({ id: 12, tipoEntrega: "retirada" }, "pronto_para_retirada", config)).toContain(
      "Rua Exemplo, 123 – Centro",
    );
  });

  it("aguardando pagamento não gera mensagem", () => {
    expect(mensagemDeStatus({ id: 12, tipoEntrega: "entrega" }, "aguardando_pagamento", config)).toBeNull();
  });
});
