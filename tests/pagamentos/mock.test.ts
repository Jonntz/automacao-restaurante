import { describe, expect, it } from "vitest";
import { crc16Ccitt, criarProvedorMock } from "@/lib/pagamentos/mock";
import { relogio } from "../helpers/fixtures";

const entrada = { pedidoId: 12, valorCentavos: 4990, descricao: "Pedido #0012 - Burger Demo", expiraEmSegundos: 1800 };

describe("crc16Ccitt", () => {
  it("bate com o vetor de teste padrão (123456789 → 29B1)", () => {
    expect(crc16Ccitt("123456789")).toBe("29B1");
  });
});

describe("provedor mock (PAG-RF-03)", () => {
  it("gera BR Code plausível com CRC válido, valor e nome com espaço", async () => {
    const rel = relogio();
    const p = criarProvedorMock({ agora: rel.agora });
    const c = await p.criarCobranca(entrada);

    expect(c.provedorId).toMatch(/^mock_[0-9a-f-]{36}$/);
    expect(c.status).toBe("pendente");
    expect(c.qrCodeBase64).toBeNull();
    expect(c.expiraEm.getTime() - rel.agora().getTime()).toBe(1800_000);
    expect(c.copiaECola.startsWith("000201")).toBe(true);
    expect(c.copiaECola).toContain("540549.90");
    expect(c.copiaECola).toContain("5917CONTAINER LANCHES");
    // chave Pix (campo 26, subcampo 01) num domínio reservado: nunca pode existir de verdade (PAG-RF-03)
    const chave = /0014br\.gov\.bcb\.pix01(\d{2})/.exec(c.copiaECola);
    expect(chave).not.toBeNull();
    const inicio = chave!.index + chave![0].length;
    expect(c.copiaECola.slice(inicio, inicio + Number(chave![1]))).toBe("mock@pix.invalid");
    expect(c.copiaECola).toMatch(/6304[0-9A-F]{4}$/);
    const semCrc = c.copiaECola.slice(0, -4);
    expect(crc16Ccitt(semCrc)).toBe(c.copiaECola.slice(-4));
  });

  it("começa pendente e vira pago ao simular", async () => {
    const p = criarProvedorMock();
    expect(p.permiteSimulacao).toBe(true);
    const c = await p.criarCobranca(entrada);
    expect(await p.consultarStatus(c.provedorId)).toBe("pendente");
    await p.simularPagamento!(c.provedorId);
    expect(await p.consultarStatus(c.provedorId)).toBe("pago");
  });

  it("instâncias diferentes não compartilham estado", async () => {
    const a = criarProvedorMock();
    const b = criarProvedorMock();
    const c = await a.criarCobranca(entrada);
    await a.simularPagamento!(c.provedorId);
    expect(await b.consultarStatus(c.provedorId)).toBe("pendente");
  });
});
