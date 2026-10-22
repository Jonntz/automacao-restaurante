import { Suspense } from "react";
import type { Metadata } from "next";
import { AlternarTema } from "@/components/alternar-tema";
import { Marca } from "@/components/marca";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar — Painel Container Lanches" };

export default function PaginaLogin() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="absolute right-4 top-4">
        <AlternarTema />
      </div>
      <Marca tamanho="lg" />
      <Card className="w-full max-w-sm border-primary/30">
        <CardHeader>
          <CardTitle className="font-heading text-2xl uppercase tracking-wide">Painel do restaurante</CardTitle>
          <CardDescription>Entre com o e-mail e a senha configurados no .env.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <FormularioLogin />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
