import { randomUUID } from "node:crypto";
import type { CobrancaCriada, EntradaCobranca, PagamentoProvedor, StatusPagamento } from "./tipos";

// Provedor sem conta externa (PAG-RF-03). Gera um BR Code plausível (com CRC16 válido)
// para exercitar a separação do Pix no n8n, mas que NÃO é pagável de verdade: a chave fica
// no TLD reservado ".invalid" (RFC 2606), que nunca pode ser registrado nem virar chave Pix.

/** CRC16-CCITT (poly 0x1021, init 0xFFFF), como exige o padrão EMV do Pix. */
export function crc16Ccitt(texto: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(texto, "utf8")) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, "0")}${valor}`;

function montarBrCode(valorCentavos: number, txid: string): string {
  const valor = `${Math.trunc(valorCentavos / 100)}.${String(valorCentavos % 100).padStart(2, "0")}`;
  const semCrc =
    campo("00", "01") +
    campo("01", "12") +
    campo("26", campo("00", "br.gov.bcb.pix") + campo("01", "mock@pix.invalid")) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", valor) +
    campo("58", "BR") +
    campo("59", "CONTAINER LANCHES") +
    campo("60", "SAO PAULO") +
    campo("62", campo("05", txid)) +
    "6304";
  return semCrc + crc16Ccitt(semCrc);
}

export function criarProvedorMock({ agora = () => new Date() }: { agora?: () => Date } = {}): PagamentoProvedor {
  const estados = new Map<string, StatusPagamento>();

  return {
    nome: "mock",
    permiteSimulacao: true,

    async criarCobranca({ pedidoId, valorCentavos, expiraEmSegundos }: EntradaCobranca): Promise<CobrancaCriada> {
      const provedorId = `mock_${randomUUID()}`;
      const txid = `MOCK${pedidoId}${provedorId.slice(5, 13)}`.replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
      estados.set(provedorId, "pendente");
      return {
        provedorId,
        copiaECola: montarBrCode(valorCentavos, txid),
        qrCodeBase64: null,
        expiraEm: new Date(agora().getTime() + expiraEmSegundos * 1000),
        status: "pendente",
      };
    },

    async consultarStatus(provedorId: string) {
      return estados.get(provedorId) ?? "pendente";
    },

    async simularPagamento(provedorId: string) {
      estados.set(provedorId, "pago");
    },
  };
}
