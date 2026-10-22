"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";

// No servidor o tema salvo é desconhecido: renderiza "escuro" (padrão) e só habilita após hidratar.
const assinarNada = () => () => {};
const useHidratado = () =>
  useSyncExternalStore(
    assinarNada,
    () => true,
    () => false,
  );

/** Switch claro/escuro (MRC-RF-04). */
export function AlternarTema() {
  const { resolvedTheme, setTheme } = useTheme();
  const hidratado = useHidratado();
  const escuro = hidratado ? resolvedTheme === "dark" : true;

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Sun className="size-4" aria-hidden />
      <Switch
        aria-label="Tema escuro"
        checked={escuro}
        disabled={!hidratado}
        onCheckedChange={(ligado) => setTheme(ligado ? "dark" : "light")}
      />
      <Moon className="size-4" aria-hidden />
    </div>
  );
}
