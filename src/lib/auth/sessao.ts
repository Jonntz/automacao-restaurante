import { jwtVerify, SignJWT } from "jose";

// Sessão do único admin: JWT HS256 num cookie httpOnly (ADM-RF-01).

export const NOME_COOKIE_SESSAO = "sessao";
export const DURACAO_SESSAO_SEGUNDOS = 12 * 60 * 60;

const chave = (segredo: string) => new TextEncoder().encode(segredo);

export async function criarTokenSessao(email: string, segredo: string, agora = new Date()): Promise<string> {
  const emSegundos = Math.floor(agora.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt(emSegundos)
    .setExpirationTime(emSegundos + DURACAO_SESSAO_SEGUNDOS)
    .sign(chave(segredo));
}

export async function verificarTokenSessao(
  token: string | undefined | null,
  segredo: string,
  agora = new Date(),
): Promise<{ email: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(segredo), { algorithms: ["HS256"], currentDate: agora });
    return payload.sub ? { email: payload.sub } : null;
  } catch {
    return null;
  }
}
