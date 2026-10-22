"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatarMensagem, type Trecho } from "@/lib/chat/formatar";

function TrechoFormatado({ trecho }: { trecho: Trecho }) {
  if (trecho.negrito) return <strong className="font-semibold">{trecho.texto}</strong>;
  if (trecho.italico) return <em>{trecho.texto}</em>;
  return trecho.texto;
}

function CodigoPix({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      toast.success("Código Pix copiado");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não consegui copiar. Selecione o código e copie manualmente.");
    }
  }
  return (
    <div className="my-1 flex flex-col gap-2 rounded-lg border border-dashed border-primary/60 bg-muted/60 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pix copia e cola</span>
      <code className="select-all break-all font-mono text-xs leading-relaxed">{codigo}</code>
      <Button type="button" size="sm" onClick={copiar} className="self-start">
        {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copiado ? "Copiado!" : "Copiar código Pix"}
      </Button>
    </div>
  );
}

/** Fala do atendente com a formatação do WhatsApp (DEM-RF-10). Nada vira HTML. */
export function MensagemBot({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      {formatarMensagem(texto).map((bloco, i) =>
        bloco.tipo === "pix" ? (
          <CodigoPix key={i} codigo={bloco.codigo} />
        ) : (
          bloco.linhas.map((linha, j) =>
            linha.length ? (
              <p key={`${i}-${j}`}>
                {linha.map((trecho, k) => (
                  <TrechoFormatado key={k} trecho={trecho} />
                ))}
              </p>
            ) : (
              <span key={`${i}-${j}`} aria-hidden className="h-2" />
            ),
          )
        ),
      )}
    </div>
  );
}
