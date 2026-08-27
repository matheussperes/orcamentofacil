"use client";

import { LayoutGrid } from "lucide-react";
import { BoxCanvas } from "@/app/components/BoxCanvas";
import { TituloSecao } from "@/components/ui/titulo-secao";
import type { AlturasFaixas } from "@/lib/engine/parede";
import type { ParedeComMeta } from "@/lib/ambiente/estado";
import { ElevacaoParede } from "../ElevacaoParede";
import { EstadoVazioAba } from "@/components/ui/estado-vazio-aba";
import type { useConjuntos } from "./useConjuntos";
import type { useElementosParede } from "./useElementosParede";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Elevação da
 * parede (SVG 2D) + BoxCanvas modo conjunto (Task 13.2b). */
export function SecaoElevacaoConjunto({
  parede,
  alturas,
  conjuntosHook,
  elementosParedeHook,
}: {
  parede: ParedeComMeta;
  alturas: AlturasFaixas;
  conjuntosHook: ReturnType<typeof useConjuntos>;
  elementosParedeHook: ReturnType<typeof useElementosParede>;
}) {
  return (
    <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <TituloSecao>Elevação da parede</TituloSecao>
        <div className="max-w-full overflow-x-auto rounded-md border border-cinza-200 bg-cinza-50 p-2">
          <ElevacaoParede
            parede={parede}
            alturas={alturas}
            itens={conjuntosHook.itensDoConjunto}
            onClicarElemento={(_, indice) => elementosParedeHook.editarElemento(indice)}
            tagsComerciais={conjuntosHook.tagsComerciais}
          />
        </div>
      </section>
      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <TituloSecao>Itens posicionados (conjunto)</TituloSecao>
        {conjuntosHook.itensDoConjunto.length > 0 ? (
          <BoxCanvas
            itens={conjuntosHook.itensDoConjunto}
            alturas={alturas}
            itensComAviso={conjuntosHook.itensComAviso}
            conjuntos={conjuntosHook.conjuntosFinais}
            onToggleJuncao={conjuntosHook.alternarJuncao}
            tagsComerciais={conjuntosHook.tagsComerciais}
          />
        ) : (
          <EstadoVazioAba
            icone={LayoutGrid}
            titulo="Nenhum item posicionado ainda"
            descricao="Adicione um item na seção 'Itens posicionados' ao lado para visualizar o conjunto aqui."
            className="border-0 bg-transparent p-0 py-lg shadow-none"
          />
        )}
      </section>
    </div>
  );
}
