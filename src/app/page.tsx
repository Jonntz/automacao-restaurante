import Link from "next/link";
import { AlternarTema } from "@/components/alternar-tema";
import { Marca } from "@/components/marca";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-16">
      <div className="absolute right-4 top-4">
        <AlternarTema />
      </div>
      <div className="flex max-w-xl flex-col items-center gap-8 text-center">
        <Marca tamanho="lg" />
        <p className="text-lg text-muted-foreground">
          Pizzaria com atendimento por IA no WhatsApp: o cliente monta a pizza (inteira ou meio a meio), paga via
          Pix e a cozinha acompanha cada pedido em tempo real.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="px-8 font-semibold">
            <Link href="/chat">Fazer um pedido</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="px-8 font-semibold">
            <Link href="/admin">Abrir painel</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
