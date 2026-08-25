"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROTULO_POSICAO_ELEMENTO, ROTULO_TIPO_ELEMENTO_CONTINUO } from "../AmbientesLab.constants";
import type { useElementosContinuos } from "./useElementosContinuos";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Lista de
 * elementos contínuos do alvo selecionado + consolidado de material (Task
 * 13.2c). */
export function SecaoElementosContinuosLista({
  elementosContinuosHook,
}: {
  elementosContinuosHook: ReturnType<typeof useElementosContinuos>;
}) {
  const { elementosDaSelecao, resultadoElementosContinuos, removerElementoContinuo } = elementosContinuosHook;

  if (elementosDaSelecao.length === 0) {
    return (
      <p className="text-corpo-pequeno text-cinza-500">
        Nenhum elemento contínuo adicionado a este alvo ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Posição</TableHead>
            <TableHead>Material</TableHead>
            <TableHead className="text-right">Peças</TableHead>
            <TableHead className="text-right">Área (m²)</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {elementosDaSelecao.map((elemento) => {
            const resultado = resultadoElementosContinuos.porModulo.find(
              (r) => r.moduloId === elemento.id
            );
            return (
              <TableRow key={elemento.id}>
                <TableCell>{ROTULO_TIPO_ELEMENTO_CONTINUO[elemento.tipo]}</TableCell>
                <TableCell>{ROTULO_POSICAO_ELEMENTO[elemento.posicao]}</TableCell>
                <TableCell>
                  {elemento.material.cor} · {elemento.material.espessura}mm
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {resultado?.pecas.length ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {resultado?.areaMdfM2.toFixed(2) ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removerElementoContinuo(elemento.id)}
                    aria-label={`Remover ${ROTULO_TIPO_ELEMENTO_CONTINUO[elemento.tipo]}`}
                  >
                    <X size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="mt-3 flex flex-wrap gap-lg text-corpo-pequeno text-cinza-600">
        <span>
          Área MDF total:{" "}
          <strong className="tabular-nums text-cinza-900">
            {resultadoElementosContinuos.consolidado.mdf
              .reduce((s, g) => s + g.area_m2, 0)
              .toFixed(2)}{" "}
            m²
          </strong>
        </span>
        <span>
          Fita total:{" "}
          <strong className="tabular-nums text-cinza-900">
            {resultadoElementosContinuos.consolidado.fitaTotalM.toFixed(2)} m
          </strong>
        </span>
        {resultadoElementosContinuos.consolidado.ferragens.length > 0 && (
          <span>
            Ferragens:{" "}
            <strong className="text-cinza-900">
              {resultadoElementosContinuos.consolidado.ferragens
                .map((f) => `${f.item} ×${f.quantidade}`)
                .join(", ")}
            </strong>
          </span>
        )}
      </div>
    </div>
  );
}
