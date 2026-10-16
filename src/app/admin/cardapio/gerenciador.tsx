"use client";

import { useCallback, useOptimistic, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { ResultadoAcao } from "@/lib/admin/cardapio";
import { formatarCentavos } from "@/lib/dinheiro";
import { alternarDisponibilidadeAcao, excluirCategoriaAcao, excluirItemAcao } from "./acoes";
import { FormularioCategoria, FormularioItem, type CategoriaEditavel, type ItemEditavel } from "./formularios";

type Item = { id: number; categoriaId: number; nome: string; descricao: string; precoCentavos: number; disponivel: boolean };
type Categoria = { id: number; nome: string; ordem: number; itens: Item[] };

const avisar = (r: ResultadoAcao) => (r.ok ? toast.success(r.mensagem) : toast.error(r.erro));

function SwitchDisponivel({ item }: { item: Item }) {
  const [otimista, definir] = useOptimistic(item.disponivel);
  const [, iniciar] = useTransition();
  return (
    <Switch
      checked={otimista}
      aria-label={`${item.nome} disponível`}
      onCheckedChange={(valor) =>
        iniciar(async () => {
          definir(valor);
          avisar(await alternarDisponibilidadeAcao(item.id, valor));
        })
      }
    />
  );
}

function BotaoExcluir({ titulo, descricao, aoConfirmar }: { titulo: string; descricao: string; aoConfirmar: () => Promise<ResultadoAcao> }) {
  const [executando, iniciar] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={titulo} disabled={executando}>
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() =>
              iniciar(async () => {
                avisar(await aoConfirmar());
              })
            }>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function GerenciadorCardapio({ categorias }: { categorias: Categoria[] }) {
  const [item, setItem] = useState<ItemEditavel | null>(null);
  const [categoria, setCategoria] = useState<CategoriaEditavel | null>(null);
  const fecharItem = useCallback(() => setItem(null), []);
  const fecharCategoria = useCallback(() => setCategoria(null), []);
  const listaCategorias = categorias.map((c) => ({ id: c.id, nome: c.nome }));
  const proximaOrdem = Math.max(0, ...categorias.map((c) => c.ordem)) + 1;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setItem({ nome: "", descricao: "", disponivel: true, categoriaId: categorias[0]?.id })} disabled={!categorias.length}>
          <Plus /> Novo item
        </Button>
        <Button variant="outline" onClick={() => setCategoria({ nome: "", ordem: proximaOrdem })}>
          <Plus /> Nova categoria
        </Button>
      </div>

      {categorias.map((cat) => (
        <Card key={cat.id}>
          <CardHeader>
            <CardTitle>
              {cat.nome} <span className="text-xs font-normal text-muted-foreground">ordem {cat.ordem}</span>
            </CardTitle>
            <CardAction className="flex gap-1">
              <Button size="icon-sm" variant="ghost" aria-label={`Editar ${cat.nome}`} onClick={() => setCategoria(cat)}>
                <Pencil />
              </Button>
              <BotaoExcluir
                titulo={`Excluir a categoria ${cat.nome}?`}
                descricao="Só é possível excluir categorias sem itens."
                aoConfirmar={() => excluirCategoriaAcao(cat.id)}
              />
            </CardAction>
          </CardHeader>
          <CardContent className="divide-y">
            {cat.itens.length === 0 && <p className="py-2 text-sm text-muted-foreground">Sem itens.</p>}
            {cat.itens.map((i) => (
              <div key={i.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className={i.disponivel ? "font-medium" : "font-medium text-muted-foreground line-through"}>
                    <span className="mr-2 text-xs text-muted-foreground">#{i.id}</span>
                    {i.nome}
                  </p>
                  {i.descricao && <p className="truncate text-sm text-muted-foreground">{i.descricao}</p>}
                </div>
                <span className="text-sm tabular-nums">{formatarCentavos(i.precoCentavos)}</span>
                <SwitchDisponivel item={i} />
                <Button size="icon-sm" variant="ghost" aria-label={`Editar ${i.nome}`} onClick={() => setItem(i)}>
                  <Pencil />
                </Button>
                <BotaoExcluir
                  titulo={`Excluir ${i.nome}?`}
                  descricao="Pedidos antigos continuam mostrando o nome e o preço da época. Para esgotar temporariamente, use o interruptor."
                  aoConfirmar={() => excluirItemAcao(i.id)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <FormularioItem key={item ? `item-${item.id ?? "novo"}` : "item-fechado"} item={item} categorias={listaCategorias} aoFechar={fecharItem} />
      <FormularioCategoria key={categoria ? `cat-${categoria.id ?? "nova"}` : "cat-fechada"} categoria={categoria} aoFechar={fecharCategoria} />
    </>
  );
}
