// O Brasil não tem horário de verão desde 2019: São Paulo é UTC−03:00 fixo.
const OFFSET_SP_MS = 3 * 60 * 60 * 1000;

/** Meia-noite de hoje em São Paulo, como instante UTC (ADM-RF-05). */
export function inicioDoDiaSaoPaulo(agora: Date): Date {
  const local = new Date(agora.getTime() - OFFSET_SP_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + OFFSET_SP_MS);
}

/** "agora", "há 5 min", "há 2 h", "há 3 d" (ADM-RF-09). */
export function tempoRelativo(data: Date, agora: Date): string {
  const minutos = Math.floor((agora.getTime() - data.getTime()) / 60_000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return `há ${Math.floor(horas / 24)} d`;
}
