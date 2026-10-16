import { NextResponse, type NextRequest } from "next/server";
import { NOME_COOKIE_SESSAO, verificarTokenSessao } from "@/lib/auth/sessao";

// Protege o painel e sua API (ADM-RF-02). /api/bot e /api/webhooks ficam fora do matcher.
export async function proxy(request: NextRequest) {
  const segredo = process.env.SESSION_SECRET;
  const token = request.cookies.get(NOME_COOKIE_SESSAO)?.value;
  const sessao = segredo && segredo.length >= 32 ? await verificarTokenSessao(token, segredo) : null;
  if (sessao) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("de", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
