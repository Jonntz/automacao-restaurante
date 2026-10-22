import type { Metadata } from "next";
import { Anton, Barlow, Geist_Mono, Yellowtail } from "next/font/google";
import { ProvedorTema } from "@/components/provedor-tema";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Tipografia da marca (MRC-RF-02): Anton nos títulos, Barlow no texto, Yellowtail só no wordmark.
const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });
const yellowtail = Yellowtail({ variable: "--font-yellowtail", subsets: ["latin"], weight: "400" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Container Lanches — Sabor que reina",
  description: "PoC: atendimento por IA no WhatsApp, pedidos de pizza com Pix e painel de gestão.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${barlow.variable} ${anton.variable} ${yellowtail.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ProvedorTema>
          {children}
          {/* Embaixo: no topo direito o toast cobria o switch "Loja aberta" do cabeçalho. */}
          <Toaster richColors position="bottom-right" />
        </ProvedorTema>
      </body>
    </html>
  );
}
