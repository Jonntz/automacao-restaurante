// Formatação das respostas do atendente no chat web (specs/011-demo-publica DEM-RF-10).
// O prompt manda o bot escrever como no WhatsApp: *negrito*, _itálico_ e "•" para listas.
// Nada aqui vira HTML: o componente renderiza os trechos como texto em elementos React.

export type Trecho = { texto: string; negrito?: true; italico?: true };
export type Bloco = { tipo: "linhas"; linhas: Trecho[][] } | { tipo: "pix"; codigo: string };

// Mesmo padrão do nó "Montar mensagens" do agente (IA-RF-06): do 000201 até o CRC 6304XXXX.
const PIX = /000201[^\n]*6304[0-9A-Fa-f]{4}/g;
// Regra do WhatsApp: a marcação não começa/termina com espaço nem fica colada a letras ou números.
const MARCACAO = /(?<![\p{L}\p{N}])(?:\*(?=\S)([^*\n]*?\S)\*|_(?=\S)([^_\n]*?\S)_)(?![\p{L}\p{N}])/gu;

function trechosDaLinha(linha: string): Trecho[] {
  const trechos: Trecho[] = [];
  let inicio = 0;
  for (const m of linha.matchAll(MARCACAO)) {
    if (m.index > inicio) trechos.push({ texto: linha.slice(inicio, m.index) });
    trechos.push(m[1] !== undefined ? { texto: m[1], negrito: true } : { texto: m[2], italico: true });
    inicio = m.index + m[0].length;
  }
  if (inicio < linha.length) trechos.push({ texto: linha.slice(inicio) });
  return trechos;
}

function blocoDeTexto(texto: string): Bloco | null {
  const limpo = texto.replace(/^\s*\n|\n\s*$/g, "").trim();
  return limpo ? { tipo: "linhas", linhas: limpo.split("\n").map(trechosDaLinha) } : null;
}

export function formatarMensagem(texto: string): Bloco[] {
  // "  \n" é a quebra dura que o Chat Teste insere para o markdown do n8n; aqui toda quebra já é real.
  const normalizado = texto.replace(/[ \t]+\n/g, "\n").trim();
  const blocos: Bloco[] = [];
  let inicio = 0;
  for (const m of normalizado.matchAll(PIX)) {
    const antes = blocoDeTexto(normalizado.slice(inicio, m.index));
    if (antes) blocos.push(antes);
    blocos.push({ tipo: "pix", codigo: m[0] });
    inicio = m.index + m[0].length;
  }
  const resto = blocoDeTexto(normalizado.slice(inicio));
  if (resto) blocos.push(resto);
  return blocos;
}
