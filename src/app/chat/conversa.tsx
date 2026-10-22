"use client";

import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BOAS_VINDAS, LIMITE_MENSAGEM, MENSAGEM_INDISPONIVEL, SUGESTOES } from "@/lib/chat/textos";
import { cn } from "@/lib/utils";
import { MensagemBot } from "./mensagem";

type Mensagem = { id: number; autor: "bot" | "cliente"; texto: string };

// Gerado no primeiro envio (não no render: o prerender do Cache Components rejeita valores aleatórios).
// randomUUID só existe em contexto seguro; em http://<ip-da-rede> cai no fallback.
const novaSessao = () =>
  globalThis.crypto?.randomUUID?.() ?? `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function Digitando() {
  return (
    <span role="status" aria-label="Atendente digitando" className="flex items-center gap-1 py-1.5">
      {[0, 150, 300].map((atraso) => (
        <span
          key={atraso}
          aria-hidden
          className="size-2 animate-bounce rounded-full bg-muted-foreground/70"
          style={{ animationDelay: `${atraso}ms` }}
        />
      ))}
    </span>
  );
}

/** Conversa com o atendente pelo proxy /api/chat (DEM-RF-01). */
export function Conversa() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([{ id: 0, autor: "bot", texto: BOAS_VINDAS }]);
  const [texto, setTexto] = useState("");
  const [esperando, setEsperando] = useState(false);
  const sessao = useRef<string | null>(null);
  const proximoId = useRef(1);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, esperando]);

  const adicionar = (autor: Mensagem["autor"], conteudo: string) =>
    setMensagens((atuais) => [...atuais, { id: proximoId.current++, autor, texto: conteudo }]);

  async function enviar(conteudo: string) {
    const chatInput = conteudo.trim();
    if (!chatInput || esperando) return;
    sessao.current ??= novaSessao();
    adicionar("cliente", chatInput);
    setTexto("");
    setEsperando(true);
    let resposta = MENSAGEM_INDISPONIVEL;
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "sendMessage", sessionId: sessao.current, chatInput }),
      });
      const corpo = (await r.json()) as { output?: string };
      if (corpo.output) resposta = corpo.output;
    } catch {
      // sem rede: fica a mensagem de indisponibilidade
    }
    adicionar("bot", resposta);
    setEsperando(false);
    campo.current?.focus();
  }

  const clienteJaFalou = mensagens.some((m) => m.autor === "cliente");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ol aria-live="polite" aria-label="Conversa" className="mx-auto flex max-w-3xl flex-col gap-3 p-4">
          {mensagens.map((m) => (
            <li key={m.id} className={cn("flex", m.autor === "cliente" ? "justify-end" : "justify-start")}>
              <div
                data-autor={m.autor}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-snug shadow-sm sm:max-w-[75%]",
                  m.autor === "cliente"
                    ? "rounded-br-sm bg-primary whitespace-pre-wrap break-words text-primary-foreground"
                    : "rounded-bl-sm border bg-card break-words text-card-foreground",
                )}
              >
                {m.autor === "bot" ? <MensagemBot texto={m.texto} /> : m.texto}
              </div>
            </li>
          ))}
          {esperando && (
            <li className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border bg-card px-4 py-2 shadow-sm">
                <Digitando />
              </div>
            </li>
          )}
        </ol>
        <div ref={fim} />
      </div>

      <div className="shrink-0 border-t bg-background px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!clienteJaFalou && (
          <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <Button key={s} type="button" variant="outline" size="sm" className="rounded-full" disabled={esperando} onClick={() => enviar(s)}>
                {s}
              </Button>
            ))}
          </div>
        )}
        <form
          className="mx-auto flex max-w-3xl items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar(texto);
          }}
        >
          <Textarea
            ref={campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void enviar(texto);
              }
            }}
            rows={1}
            maxLength={LIMITE_MENSAGEM}
            placeholder="Escreva seu pedido…"
            aria-label="Mensagem"
            className="max-h-32 min-h-10 resize-none"
          />
          <Button type="submit" size="icon" className="size-10 shrink-0" disabled={esperando || !texto.trim()} aria-label="Enviar">
            <SendHorizontal aria-hidden />
          </Button>
        </form>
      </div>
    </div>
  );
}
