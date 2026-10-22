"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { alternarLojaAcao } from "./acoes-loja";

export function SwitchLoja({ aberta }: { aberta: boolean }) {
  const [otimista, definirOtimista] = useOptimistic(aberta);
  const [, iniciar] = useTransition();

  const alternar = (valor: boolean) =>
    iniciar(async () => {
      definirOtimista(valor);
      const r = await alternarLojaAcao(valor);
      if (r.ok) toast.success(r.mensagem);
      else toast.error(r.erro);
    });

  return (
    <div className="flex items-center gap-2">
      <Switch id="loja-aberta" checked={otimista} onCheckedChange={alternar} />
      <Label htmlFor="loja-aberta" className={otimista ? "whitespace-nowrap font-semibold text-foreground" : "whitespace-nowrap text-muted-foreground"}>
        {otimista ? "Loja aberta" : "Loja fechada"}
      </Label>
    </div>
  );
}
