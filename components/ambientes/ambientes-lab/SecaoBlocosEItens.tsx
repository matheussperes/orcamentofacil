"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TituloSecao } from "@/components/ui/titulo-secao";
import { ROTULO_FAIXA } from "../AmbientesLab.constants";
import type { useConjuntos } from "./useConjuntos";
import type { useElementosContinuos } from "./useElementosContinuos";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Tabela de
 * "Blocos e itens" — alvo selecionável de Elemento Contínuo (Conjunto ou
 * item avulso, Task 13.2c). */
export function SecaoBlocosEItens({
  conjuntosHook,
  elementosContinuosHook,
}: {
  conjuntosHook: ReturnType<typeof useConjuntos>;
  elementosContinuosHook: ReturnType<typeof useElementosContinuos>;
}) {
  const { conjuntosFinais, itensAvulsos, nomeDoItem } = conjuntosHook;
  const { selecao, setSelecao } = elementosContinuosHook;

  return (
    <section className="min-w-0 rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <TituloSecao>Blocos e itens</TituloSecao>
      <p className="mb-3 text-corpo-pequeno text-cinza-500">
        Selecione um Conjunto ou um item avulso para adicionar tampo, rodapé, tamponamento ou
        fechamento (Elemento Contínuo).
      </p>
      {conjuntosFinais.length === 0 && itensAvulsos.length === 0 ? (
        <p className="text-corpo-pequeno text-cinza-500">Nenhum item posicionado ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alvo</TableHead>
                <TableHead>Faixa</TableHead>
                <TableHead className="text-right">Itens</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {conjuntosFinais.map((conjunto, i) => {
                const selecionado = selecao?.tipo === "conjunto" && selecao.conjuntoId === conjunto.id;
                return (
                  <TableRow
                    key={conjunto.id}
                    className={`cursor-pointer ${selecionado ? "bg-accent-subtle" : ""}`}
                    onClick={() => setSelecao({ tipo: "conjunto", conjuntoId: conjunto.id })}
                  >
                    <TableCell>Conjunto {i + 1}</TableCell>
                    <TableCell>{ROTULO_FAIXA[conjunto.faixa]}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {conjunto.itensIds.length}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                );
              })}
              {itensAvulsos.map((pos) => {
                const selecionado = selecao?.tipo === "item" && selecao.itemId === pos.itemId;
                return (
                  <TableRow
                    key={pos.itemId}
                    className={`cursor-pointer ${selecionado ? "bg-accent-subtle" : ""}`}
                    onClick={() => setSelecao({ tipo: "item", itemId: pos.itemId })}
                  >
                    <TableCell>{nomeDoItem(pos.itemId)} (avulso)</TableCell>
                    <TableCell>{ROTULO_FAIXA[pos.faixa]}</TableCell>
                    <TableCell className="text-right tabular-nums">1</TableCell>
                    <TableCell />
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
