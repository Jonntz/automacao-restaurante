import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar — Painel Burger Demo" };

export default function PaginaLogin() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Painel do restaurante</CardTitle>
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
