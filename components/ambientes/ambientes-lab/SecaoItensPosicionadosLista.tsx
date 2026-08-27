"use client";

import Link from "next/link";
import { Layers, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EstadoVazioAba } from "@/components/ui/estado-vazio-aba";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { converterXParaVao } from "@/lib/engine/parede";
import { larguraDoItem } from "@/lib/orcamento";
import type { ParedeComMeta } from "@/lib/ambiente/estado";
import { ROTULO_FAIXA } from "../AmbientesLab.constants";
import type { useItensPosicionados } from "./useItensPosicionados";
import type { useConjuntos } from "./useConjuntos";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Tabela de
 * itens posicionados na parede selecionada (Task 2.18-2.23/13.3e). */
export function SecaoItensPosicionadosLista({
  parede,
  itensHook,
  conjuntosHook,
  orcamentoId,
}: {
  parede: ParedeComMeta;
  itensHook: ReturnType<typeof useItensPosicionados>;
  conjuntosHook: ReturnType<typeof useConjuntos>;
  orcamentoId?: string;
}) {
  if (parede.itens.length === 0) {
    return (
      <EstadoVazioAba
        icone={Layers}
        titulo="Nenhum item posicionado ainda"
        descricao="Use o formulário acima para adicionar o primeiro item desta parede."
        className="border-0 bg-transparent p-0 py-lg shadow-none"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Faixa</TableHead>
            <TableHead className="text-right">Vão esq.</TableHead>
            <TableHead className="text-right">Vão dir.</TableHead>
            <TableHead className="text-right">Largura</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {parede.itens.map((pos) => {
            const modulo = itensHook.resolvedor.get(pos.itemId);
            const severidade = conjuntosHook.itensComAviso.get(pos.itemId);
            // Recalculado a cada render a partir do `x` absoluto —
            // nunca lido de campo armazenado (Seção 3.1.1).
            const vao = converterXParaVao(parede, itensHook.resolvedor, pos);
            return (
              <TableRow
                key={pos.itemId}
                className={
                  severidade === "erro"
                    ? "bg-erro-subtle"
                    : severidade === "aviso"
                      ? "bg-aviso-subtle"
                      : undefined
                }
              >
                <TableCell>{conjuntosHook.nomeDoItem(pos.itemId)}</TableCell>
                <TableCell>{ROTULO_FAIXA[pos.faixa]}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {vao ? vao.esquerda : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {vao ? vao.direita : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {modulo ? larguraDoItem(modulo) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {orcamentoId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        aria-label={`Editar item ${conjuntosHook.nomeDoItem(pos.itemId)}`}
                      >
                        <Link href={`/orcamento/${orcamentoId}/item/${pos.itemId}`}>
                          <Pencil size={14} />
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => itensHook.removerItem(pos.itemId)}
                      aria-label={`Remover item ${conjuntosHook.nomeDoItem(pos.itemId)}`}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
