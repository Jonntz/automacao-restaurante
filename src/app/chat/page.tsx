import type { Metadata } from "next";
import Link from "next/link";
import { AlternarTema } from "@/components/alternar-tema";
import { Marca } from "@/components/marca";
import { Button } from "@/components/ui/button";
import { Conversa } from "./conversa";

export const metadata: Metadata = {
  title: "Faça seu pedido — Container Lanches",
  description: "Converse com o atendente virtual da Container Lanches e peça sua pizza.",
};

// Chat público da demonstração (specs/011-demo-publica DEM-RF-01): fora do matcher do proxy.ts.
export default function PaginaChat() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 border-b bg-background">
        <div className="flex min-h-14 items-center gap-3 px-4 py-2">
          <Link href="/" aria-label="Container Lanches — início">
            <Marca />
          </Link>
          <div className="hidden min-w-0 flex-col leading-tight sm:flex">
            <span className="font-heading text-sm uppercase tracking-wide">Atendimento</span>
            <span className="text-xs text-muted-foreground">Atendente virtual · demonstração</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <AlternarTema />
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">Painel</Link>
            </Button>
          </div>
        </div>
        <div aria-hidden className="h-1 bg-[image:var(--marca-gradiente)]" />
      </header>
      <Conversa />
    </div>
  );
}
