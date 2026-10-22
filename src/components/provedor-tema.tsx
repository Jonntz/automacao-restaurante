"use client";

import { ThemeProvider } from "next-themes";

/** Tema claro/escuro (MRC-RF-04): classe "dark" no <html>, padrão escuro, escolha salva no navegador. */
export function ProvedorTema({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="tema-container" disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
