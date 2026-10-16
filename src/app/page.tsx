import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-xl flex-col gap-6 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Prova de conceito</p>
        <h1 className="text-4xl font-semibold tracking-tight">Burger Demo 🍔</h1>
        <p className="text-lg text-muted-foreground">
          Atendimento por IA no WhatsApp, pedidos com pagamento via Pix e um painel para a cozinha acompanhar tudo
          em tempo real.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/admin">Abrir painel</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
