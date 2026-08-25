"use client";

import { BoxCanvas } from "@/app/components/BoxCanvas";
import type { AlturasFaixas } from "@/lib/engine/parede";
import type { ParedeComMeta } from "@/lib/ambiente/estado";
import { ElevacaoParede } from "../ElevacaoParede";
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
        <h2 className="mb-3 text-titulo-secao text-cinza-900">Elevação da parede</h2>
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
        <h2 className="mb-3 text-titulo-secao text-cinza-900">Itens posicionados (conjunto)</h2>
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
          <p className="text-corpo-pequeno text-cinza-500">Adicione um item para visualizar.</p>
        )}
      </section>
    </div>
  );
}
