"use client";

import { TituloSecao } from "@/components/ui/titulo-secao";
import { SecaoBlocosEItens } from "./SecaoBlocosEItens";
import { SecaoElementosContinuosForm } from "./SecaoElementosContinuosForm";
import { SecaoElementosContinuosLista } from "./SecaoElementosContinuosLista";
import type { useConjuntos } from "./useConjuntos";
import type { useElementosContinuos } from "./useElementosContinuos";
import type { Catalogo } from "@/lib/catalog";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Grid
 * "Blocos e itens" + "Elementos contínuos" (Task 13.2c). */
export function SecaoBlocosEElementosContinuos({
  conjuntosHook,
  elementosContinuosHook,
  catalogo,
}: {
  conjuntosHook: ReturnType<typeof useConjuntos>;
  elementosContinuosHook: ReturnType<typeof useElementosContinuos>;
  catalogo: Catalogo | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
      <SecaoBlocosEItens conjuntosHook={conjuntosHook} elementosContinuosHook={elementosContinuosHook} />

      <section className="min-w-0 rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <TituloSecao>Elementos contínuos</TituloSecao>
        {!elementosContinuosHook.selecao ? (
          <p className="text-corpo-pequeno text-cinza-500">
            Selecione um Conjunto ou item avulso à esquerda para configurar.
          </p>
        ) : (
          <>
            <SecaoElementosContinuosForm
              elementosContinuosHook={elementosContinuosHook}
              nomeDoItem={conjuntosHook.nomeDoItem}
              catalogo={catalogo}
            />
            <SecaoElementosContinuosLista elementosContinuosHook={elementosContinuosHook} />
          </>
        )}
      </section>
    </div>
  );
}
