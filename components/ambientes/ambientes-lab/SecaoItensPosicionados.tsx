"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { TituloSecao } from "@/components/ui/titulo-secao";
import type { ParedeComMeta } from "@/lib/ambiente/estado";
import type { BoxPreset } from "@/lib/boxPresets";
import type { Catalogo } from "@/lib/catalog";
import { SecaoItensPosicionadosForm } from "./SecaoItensPosicionadosForm";
import { SecaoItensPosicionadosLista } from "./SecaoItensPosicionadosLista";
import type { useItensPosicionados } from "./useItensPosicionados";
import type { useConjuntos } from "./useConjuntos";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Seção
 * "Itens posicionados" — composição de formulário + lista (Task
 * 2.18-2.23). */
export function SecaoItensPosicionados({
  parede,
  itensHook,
  conjuntosHook,
  presets,
  catalogo,
  orcamentoId,
}: {
  parede: ParedeComMeta;
  itensHook: ReturnType<typeof useItensPosicionados>;
  conjuntosHook: ReturnType<typeof useConjuntos>;
  presets: BoxPreset[];
  catalogo: Catalogo | null;
  orcamentoId?: string;
}) {
  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <TituloSecao>Itens posicionados</TituloSecao>
      {presets.length === 0 ? (
        <p className="text-corpo-pequeno text-cinza-500">
          Nenhum módulo disponível. Crie um módulo em{" "}
          <a href="/modulo" className="text-accent hover:underline">
            /modulo
          </a>{" "}
          e salve como módulo da biblioteca.
        </p>
      ) : (
        <>
          <SecaoItensPosicionadosForm itensHook={itensHook} presets={presets} catalogo={catalogo} />

          {itensHook.erroVaoItem && (
            <Alert variant="erro" className="mb-3">
              <AlertDescription>{itensHook.erroVaoItem}</AlertDescription>
            </Alert>
          )}

          <SecaoItensPosicionadosLista
            parede={parede}
            itensHook={itensHook}
            conjuntosHook={conjuntosHook}
            orcamentoId={orcamentoId}
          />
        </>
      )}
    </section>
  );
}
