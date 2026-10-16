// Dinheiro é sempre centavos inteiros (Constituição II). Formatação só na borda.

const milhares = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function formatarCentavos(centavos: number): string {
  if (!Number.isInteger(centavos)) {
    throw new Error(`Valor monetário deve ser inteiro em centavos, recebido: ${centavos}`);
  }
  const sinal = centavos < 0 ? "-" : "";
  const absoluto = Math.abs(centavos);
  const reais = Math.trunc(absoluto / 100);
  const resto = String(absoluto % 100).padStart(2, "0");
  return `${sinal}R$ ${milhares.format(reais)},${resto}`;
}

const COM_VIRGULA = /^(\d{1,3}(?:\.\d{3})+|\d+),(\d{1,2})$/;
const MILHAR_SEM_DECIMAL = /^\d{1,3}(?:\.\d{3})+$/;
const PONTO_DECIMAL = /^(\d+)\.(\d{1,2})$/;
const INTEIRO = /^\d+$/;

/** Converte texto em reais ("25,90", "25.9", "R$ 1.234,56") para centavos. Retorna null se inválido. */
export function parseReais(texto: string): number | null {
  const limpo = texto.replace(/R\$/i, "").replace(/\s/g, "");
  if (!limpo) return null;

  let parteReais: string;
  let parteCentavos = "";

  const virgula = COM_VIRGULA.exec(limpo);
  const pontoDecimal = PONTO_DECIMAL.exec(limpo);
  if (virgula) {
    parteReais = virgula[1].replace(/\./g, "");
    parteCentavos = virgula[2];
  } else if (MILHAR_SEM_DECIMAL.test(limpo)) {
    parteReais = limpo.replace(/\./g, "");
  } else if (pontoDecimal) {
    parteReais = pontoDecimal[1];
    parteCentavos = pontoDecimal[2];
  } else if (INTEIRO.test(limpo)) {
    parteReais = limpo;
  } else {
    return null;
  }

  const centavos = Number(parteReais) * 100 + Number(parteCentavos.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? centavos : null;
}
