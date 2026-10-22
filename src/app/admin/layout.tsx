import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { AlternarTema } from "@/components/alternar-tema";
import { Marca } from "@/components/marca";
import { Button } from "@/components/ui/button";
import { obterConfiguracao } from "@/lib/cardapio/consultar";
import { getDb } from "@/lib/db/client";
import { sair } from "../login/acoes";
import { Navegacao } from "./navegacao";
import { SwitchLoja } from "./switch-loja";

async function EstadoLoja() {
  await connection();
  const config = await obterConfiguracao(await getDb());
  return (
    <>
      <span className="hidden text-sm text-muted-foreground sm:inline">{config.nome}</span>
      <SwitchLoja aberta={config.lojaAberta} />
    </>
  );
}

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
          <Link href="/admin/pedidos" aria-label="Container Lanches — pedidos">
            <Marca />
          </Link>
          <Navegacao />
          <div className="ml-auto flex items-center gap-3">
            <Suspense fallback={<span className="text-sm text-muted-foreground">…</span>}>
              <EstadoLoja />
            </Suspense>
            <AlternarTema />
            <form action={sair}>
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
        {/* filete com o gradiente laranja do wordmark */}
        <div aria-hidden className="h-1 bg-[image:var(--marca-gradiente)]" />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
