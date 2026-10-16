"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ResultadoAcao } from "@/lib/admin/cardapio";
import { salvarCategoriaAcao, salvarItemAcao } from "./acoes";

export type ItemEditavel = { id?: number; categoriaId?: number; nome: string; descricao: string; precoCentavos?: number; disponivel: boolean };
export type CategoriaEditavel = { id?: number; nome: string; ordem: number };

const centavosParaCampo = (c?: number) => (c === undefined ? "" : `${Math.trunc(c / 100)},${String(c % 100).padStart(2, "0")}`);

function useFecharAoSalvar(estado: ResultadoAcao | null, aoFechar: () => void) {
  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.success(estado.mensagem);
      aoFechar();
    } else if (!estado.campos) {
      toast.error(estado.erro);
    }
  }, [estado, aoFechar]);
}

function ErroCampo({ estado, campo }: { estado: ResultadoAcao | null; campo: string }) {
  const msg = estado && !estado.ok ? estado.campos?.[campo] : undefined;
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}

export function FormularioItem({
  item,
  categorias,
  aoFechar,
}: {
  item: ItemEditavel | null;
  categorias: { id: number; nome: string }[];
  aoFechar: () => void;
}) {
  const [estado, acao, salvando] = useActionState(salvarItemAcao, null);
  const [disponivel, setDisponivel] = useState(item?.disponivel ?? true);
  useFecharAoSalvar(estado, aoFechar);

  return (
    <Dialog open={item !== null} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item?.id ? "Editar item" : "Novo item"}</DialogTitle>
          <DialogDescription>O bot passa a oferecer as mudanças na próxima mensagem.</DialogDescription>
        </DialogHeader>
        {item && (
          <form action={acao} className="flex flex-col gap-3">
            {item.id && <input type="hidden" name="id" value={item.id} />}
            <div className="grid gap-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" defaultValue={item.nome} required maxLength={80} />
              <ErroCampo estado={estado} campo="nome" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" name="descricao" defaultValue={item.descricao} maxLength={300} rows={2} />
              <ErroCampo estado={estado} campo="descricao" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="preco">Preço (R$)</Label>
                <Input id="preco" name="preco" inputMode="decimal" placeholder="25,90" defaultValue={centavosParaCampo(item.precoCentavos)} required />
                <ErroCampo estado={estado} campo="preco" />
              </div>
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Select name="categoriaId" defaultValue={item.categoriaId ? String(item.categoriaId) : undefined} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErroCampo estado={estado} campo="categoriaId" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="disponivel" name="disponivel" checked={disponivel} onCheckedChange={setDisponivel} />
              <Label htmlFor="disponivel">Disponível</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={aoFechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function FormularioCategoria({ categoria, aoFechar }: { categoria: CategoriaEditavel | null; aoFechar: () => void }) {
  const [estado, acao, salvando] = useActionState(salvarCategoriaAcao, null);
  useFecharAoSalvar(estado, aoFechar);

  return (
    <Dialog open={categoria !== null} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categoria?.id ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>A ordem define a sequência no cardápio do bot.</DialogDescription>
        </DialogHeader>
        {categoria && (
          <form action={acao} className="flex flex-col gap-3">
            {categoria.id && <input type="hidden" name="id" value={categoria.id} />}
            <div className="grid gap-1.5">
              <Label htmlFor="nome-categoria">Nome</Label>
              <Input id="nome-categoria" name="nome" defaultValue={categoria.nome} required maxLength={60} />
              <ErroCampo estado={estado} campo="nome" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ordem">Ordem</Label>
              <Input id="ordem" name="ordem" type="number" min={0} defaultValue={categoria.ordem} required />
              <ErroCampo estado={estado} campo="ordem" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={aoFechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
