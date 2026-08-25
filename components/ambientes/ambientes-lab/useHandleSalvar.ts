"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  AmbienteItem,
  EstadoAmbiente,
  ParedeComMeta,
  ResultadoSalvarAmbiente,
} from "@/lib/ambiente/estado";
import type { AlturasFaixas } from "@/lib/engine/parede";
import type { OverrideJuncao } from "@/lib/engine/conjunto";
import type { ElementoContinuo } from "@/lib/engine/elemento-continuo/types";
import type { ModuloOrcamento } from "@/lib/orcamento";
import { remapearIdsAmbientes, substituirParedeNaLista } from "../AmbientesLab.helpers";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Estado de
 * "Salvar alterações" (Task 13.3d) — feedback de sucesso/erro e a flag
 * `salvando`. Separado de `useHandleSalvar` (que monta o payload e chama
 * `onSalvar`) porque `marcarAlteracao` é consumido por praticamente todo
 * hook de edição (Task 2.x) e por isso precisa existir ANTES deles — sem
 * depender de nenhum dado que só existe depois (ambientes/parede/etc). */
export function useResultadoSalvar() {
  // Task 13.3d — "Salvar alterações": ação explícita (não autosave). Feedback
  // legível de sucesso/erro (Design-System Seção 11 / Alert, Seção 7.13).
  const [salvando, setSalvando] = useState(false);
  const [resultadoSalvar, setResultadoSalvar] = useState<ResultadoSalvarAmbiente | null>(null);

  const marcarAlteracao = () => setResultadoSalvar(null);

  return { salvando, setSalvando, resultadoSalvar, setResultadoSalvar, marcarAlteracao };
}

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). "Salvar
 * alterações" (Task 13.3d) — ação explícita, nunca autosave. Chamado APÓS
 * `useSelecaoAmbiente`/demais hooks de edição, pois depende dos dados deles. */
export function useHandleSalvar(params: {
  onSalvar: (estado: EstadoAmbiente) => Promise<ResultadoSalvarAmbiente>;
  ambientes: AmbienteItem[];
  ambienteSelecionadoId: string;
  paredeSelecionadaId: string;
  parede: ParedeComMeta;
  modulos: ModuloOrcamento[];
  alturas: AlturasFaixas;
  elementosContinuos: ElementoContinuo[];
  overrides: OverrideJuncao[];
  setAmbientes: Dispatch<SetStateAction<AmbienteItem[]>>;
  setAmbienteSelecionadoId: Dispatch<SetStateAction<string>>;
  setParedeSelecionadaId: Dispatch<SetStateAction<string>>;
  setParede: Dispatch<SetStateAction<ParedeComMeta>>;
  setSalvando: Dispatch<SetStateAction<boolean>>;
  setResultadoSalvar: Dispatch<SetStateAction<ResultadoSalvarAmbiente | null>>;
}) {
  const {
    onSalvar,
    ambientes,
    ambienteSelecionadoId,
    paredeSelecionadaId,
    parede,
    modulos,
    alturas,
    elementosContinuos,
    overrides,
    setAmbientes,
    setAmbienteSelecionadoId,
    setParedeSelecionadaId,
    setParede,
    setSalvando,
    setResultadoSalvar,
  } = params;

  async function handleSalvar() {
    setSalvando(true);
    setResultadoSalvar(null);
    // Grava a edição em progresso da parede selecionada de volta na árvore
    // ANTES de enviar — `onSalvar` (Task 13.3d) sempre recebe/grava a lista
    // inteira (Task 2.3-2.6 — [V2.1] fim do singleton), não só a parede ativa.
    const ambientesParaSalvar = substituirParedeNaLista(ambientes, ambienteSelecionadoId, parede);
    const estado: EstadoAmbiente = {
      ambientes: ambientesParaSalvar,
      modulos,
      alturas,
      elementosContinuos,
      overrides,
    };
    const resultado = await onSalvar(estado);
    setSalvando(false);
    setResultadoSalvar(resultado);
    if (resultado.ok) {
      // Bootstrap do orçamento novo (ver `ResultadoSalvarAmbiente.idsRemapeados`):
      // troca os ids sentinela em memória pelos ids reais do banco, senão o
      // PRÓXIMO salvamento tentaria um UPDATE que não afeta nenhuma linha e
      // criaria uma linha duplicada.
      const listaFinal = resultado.idsRemapeados
        ? remapearIdsAmbientes(ambientesParaSalvar, resultado.idsRemapeados)
        : ambientesParaSalvar;
      const novoAmbienteId = resultado.idsRemapeados?.ambientes[ambienteSelecionadoId] ?? ambienteSelecionadoId;
      const novaParedeId = resultado.idsRemapeados?.paredes[paredeSelecionadaId] ?? paredeSelecionadaId;
      setAmbientes(listaFinal);
      setAmbienteSelecionadoId(novoAmbienteId);
      setParedeSelecionadaId(novaParedeId);
      if (novaParedeId !== paredeSelecionadaId) {
        setParede((p) => ({ ...p, id: novaParedeId }));
      }
    }
  }

  return { handleSalvar };
}
