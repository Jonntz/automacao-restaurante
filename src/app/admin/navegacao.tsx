"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin/pedidos", rotulo: "Pedidos" },
  { href: "/admin/cardapio", rotulo: "Cardápio" },
];

export function Navegacao() {
  const caminho = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
            caminho.startsWith(l.href) ? "bg-muted text-foreground" : "text-muted-foreground",
          )}
        >
          {l.rotulo}
        </Link>
      ))}
    </nav>
  );
}
