import Image from "next/image";
import { cn } from "@/lib/utils";

export const NOME_MARCA = "Container Lanches";
export const SLOGAN = "Sabor que reina";

/** Wordmark da logo: "CONTAINER" (Anton, gradiente laranja) + "Lanches" (Yellowtail) — MRC-RF-03. */
function Wordmark({ grande }: { grande: boolean }) {
  return (
    <span className="flex flex-col items-center leading-none">
      <span className={cn("texto-marca font-heading uppercase tracking-wide", grande ? "text-6xl" : "text-xl")}>
        Container
      </span>
      <span className={cn("font-script text-[var(--marca-script)]", grande ? "-mt-3 text-5xl" : "-mt-1.5 text-lg")}>
        Lanches
      </span>
    </span>
  );
}

export function Marca({ tamanho = "sm", className }: { tamanho?: "sm" | "lg"; className?: string }) {
  if (tamanho === "lg") {
    return (
      <div className={cn("flex flex-col items-center gap-4 text-center", className)}>
        <Image
          src="/marca/emblema.png"
          alt={`Emblema ${NOME_MARCA}`}
          width={384}
          height={384}
          priority
          className="size-40 rounded-full shadow-xl ring-4 ring-primary sm:size-48"
        />
        <Wordmark grande />
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          <span aria-hidden className="text-primary">★</span>
          {SLOGAN}
          <span aria-hidden className="text-primary">★</span>
        </span>
      </div>
    );
  }
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Image src="/marca/logo-quadrada.png" alt="" width={36} height={36} className="size-9 rounded-full ring-2 ring-primary" />
      <Wordmark grande={false} />
      <span className="sr-only">{NOME_MARCA}</span>
    </span>
  );
}
