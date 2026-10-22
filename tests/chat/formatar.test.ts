import { describe, expect, it } from "vitest";
import { formatarMensagem } from "@/lib/chat/formatar";

const PIX = "00020101021226360014br.gov.bcb.pix0114mock@pix.invalid520400005303986540556.405802BR5917CONTAINER LANCHES6009SAO PAULO62100506MOCK16304A1B2";

describe("formatarMensagem (DEM-RF-10, CA-09)", () => {
  it("*negrito* e _itálico_ do WhatsApp viram trechos marcados", () => {
    expect(formatarMensagem("*Pizzas* de _hoje_ e *bordas*")).toEqual([
      {
        tipo: "linhas",
        linhas: [
          [
            { texto: "Pizzas", negrito: true },
            { texto: " de " },
            { texto: "hoje", italico: true },
            { texto: " e " },
            { texto: "bordas", negrito: true },
          ],
        ],
      },
    ]);
  });

  it("preserva as linhas (e as vazias) e normaliza a quebra dura do markdown", () => {
    const [bloco] = formatarMensagem("*Tradicionais*  \n• Mussarela — R$ 49,90  \n\n*Bebidas*\n• Água — R$ 4,00");
    expect(bloco).toEqual({
      tipo: "linhas",
      linhas: [
        [{ texto: "Tradicionais", negrito: true }],
        [{ texto: "• Mussarela — R$ 49,90" }],
        [],
        [{ texto: "Bebidas", negrito: true }],
        [{ texto: "• Água — R$ 4,00" }],
      ],
    });
  });

  it("asterisco solto e marcação sem fechar continuam texto", () => {
    expect(formatarMensagem("5 * 3 = 15 e *sem fim")).toEqual([
      { tipo: "linhas", linhas: [[{ texto: "5 * 3 = 15 e *sem fim" }]] },
    ]);
  });

  it("marcação não atravessa linhas", () => {
    expect(formatarMensagem("*a\nb*")).toEqual([{ tipo: "linhas", linhas: [[{ texto: "*a" }], [{ texto: "b*" }]] }]);
  });

  it("código Pix vira um bloco próprio, entre os textos", () => {
    expect(formatarMensagem(`Pedido *#0012* criado!\n\n${PIX}\n\nDepois é só me avisar.`)).toEqual([
      { tipo: "linhas", linhas: [[{ texto: "Pedido " }, { texto: "#0012", negrito: true }, { texto: " criado!" }]] },
      { tipo: "pix", codigo: PIX },
      { tipo: "linhas", linhas: [[{ texto: "Depois é só me avisar." }]] },
    ]);
  });

  it("só o código Pix → um único bloco pix", () => {
    expect(formatarMensagem(PIX)).toEqual([{ tipo: "pix", codigo: PIX }]);
  });

  it("HTML vindo do bot é texto literal", () => {
    expect(formatarMensagem("<b>oi</b><script>x</script>")).toEqual([
      { tipo: "linhas", linhas: [[{ texto: "<b>oi</b><script>x</script>" }]] },
    ]);
  });

  it("texto vazio → nenhum bloco", () => {
    expect(formatarMensagem("  \n ")).toEqual([]);
  });
});
