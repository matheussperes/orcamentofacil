"use client";

import { useMemo, useState } from "react";
import {
  validarParedeTier1,
  validarParedeTier2,
  type ItemPosicionado,
  type ResolvedorItens,
  type AlturasFaixas,
} from "@/lib/engine/parede";
import { aplicarOverrides, detectarConjuntos, type Conjunto, type OverrideJuncao } from "@/lib/engine/conjunto";
import type { EngineWarning } from "@/lib/engine/types";
import type { ParedeComMeta } from "@/lib/ambiente/estado";
import type { LinhaProposta } from "@/lib/linha-proposta/tipos";
import type { ItemDoConjunto } from "@/app/components/BoxCanvas";
import { derivarTagsComerciais } from "../AmbientesLab.helpers";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Validação
 * (Tier 1 + Tier 2, Task 13.2b/13.2c) e detecção de Conjuntos automáticos +
 * override do handle de junção — não reimplementa nenhuma regra de
 * agrupamento, só consome `detectarConjuntos`/`aplicarOverrides`. */
export function useConjuntos(params: {
  parede: ParedeComMeta;
  alturas: AlturasFaixas;
  resolvedor: ResolvedorItens;
  overridesIniciais: OverrideJuncao[];
  linhasProposta: LinhaProposta[];
  marcarAlteracao: () => void;
}) {
  const { parede, alturas, resolvedor, overridesIniciais, linhasProposta, marcarAlteracao } = params;

  // Task 13.2b — overrides do handle de junção.
  const [overrides, setOverrides] = useState<OverrideJuncao[]>(() => overridesIniciais);

  // Tier 1 + Tier 2 rodam a cada mudança de posicionamento/parede/alturas
  // (useMemo recalcula sempre que qualquer dependência muda — não há botão
  // "validar", é reativo). `parede` já carrega `itens` (posições) direto —
  // não precisa mais de um wrapper `paredeComItens` (Task 13.3c).
  const warnings: EngineWarning[] = useMemo(
    () => [...validarParedeTier1(parede, resolvedor), ...validarParedeTier2(parede, alturas, resolvedor)],
    [parede, alturas, resolvedor]
  );

  // itemId -> pior severidade (erro > aviso), consumido pelo destaque visual
  // do BoxCanvas modo conjunto (ver Nota de Escopo do contrato / comentário
  // em BoxCanvas.tsx).
  const itensComAviso = useMemo(() => {
    const m = new Map<string, "erro" | "aviso">();
    for (const w of warnings) {
      if (!w.moduloId) continue;
      if (m.get(w.moduloId) !== "erro") m.set(w.moduloId, w.severidade);
    }
    return m;
  }, [warnings]);

  const tagsComerciais = useMemo(() => derivarTagsComerciais(linhasProposta), [linhasProposta]);

  const itensDoConjunto: ItemDoConjunto[] = useMemo(
    () =>
      parede.itens
        .map((posicao) => {
          const item = resolvedor.get(posicao.itemId);
          return item ? { item, posicao } : null;
        })
        .filter((v): v is ItemDoConjunto => v !== null),
    [parede.itens, resolvedor]
  );

  // Task 13.2b — Conjuntos automáticos (detecção pura, sem override) + finais
  // (override do handle de junção por cima). Nenhuma lógica de agrupamento é
  // reimplementada aqui — só consome `detectarConjuntos`/`aplicarOverrides`
  // (lib/engine/conjunto/detectar.ts, já testadas).
  const conjuntosAutomaticos = useMemo(
    () => detectarConjuntos(parede, alturas, resolvedor),
    [parede, alturas, resolvedor]
  );

  const conjuntosFinais = useMemo(
    () => aplicarOverrides(conjuntosAutomaticos, parede.itens, overrides),
    [conjuntosAutomaticos, parede.itens, overrides]
  );

  // Alterna união/quebra do par (handle de junção do BoxCanvas modo
  // conjunto): remove qualquer override existente para o par e adiciona um
  // novo com `forcar` invertido do estado atual (lido de `conjuntosFinais`,
  // nunca reconstruído aqui — é `aplicarOverrides` quem decide se o par está
  // unido). Quebrar um conjunto de 3 no meio vira 2 conjuntos de 2 (nunca
  // sobra 1) porque essa é a regra de `aplicarOverrides`, não algo garantido
  // por este callback.
  function alternarJuncao(itemIdA: string, itemIdB: string) {
    const unidoAtualmente = conjuntosFinais.some(
      (c) => c.itensIds.includes(itemIdA) && c.itensIds.includes(itemIdB)
    );
    setOverrides((atuais) => [
      ...atuais.filter(
        (o) =>
          !(
            (o.itemIdA === itemIdA && o.itemIdB === itemIdB) ||
            (o.itemIdA === itemIdB && o.itemIdB === itemIdA)
          )
      ),
      { itemIdA, itemIdB, forcar: unidoAtualmente ? "quebrado" : "unido" },
    ]);
    marcarAlteracao();
  }

  // Task 13.2c — itens que NÃO pertencem a nenhum Conjunto ("avulsos"): alvo
  // válido de Elemento Contínuo tanto quanto um Conjunto (Modelo de Domínio
  // 3.4 — `alvo: { conjuntoId } | { moduloId }`, "bloco ou módulo isolado").
  const idsEmConjunto = useMemo(
    () => new Set(conjuntosFinais.flatMap((c) => c.itensIds)),
    [conjuntosFinais]
  );
  const itensAvulsos: ItemPosicionado[] = useMemo(
    () => parede.itens.filter((i) => !idsEmConjunto.has(i.itemId)),
    [parede.itens, idsEmConjunto]
  );

  function nomeDoItem(itemId: string): string {
    const modulo = resolvedor.get(itemId);
    if (!modulo) return itemId;
    return modulo.origem === "custom_box" ? modulo.box.nome : modulo.placa.nome;
  }

  return {
    overrides,
    warnings,
    itensComAviso,
    tagsComerciais,
    itensDoConjunto,
    conjuntosFinais,
    idsEmConjunto,
    itensAvulsos,
    alternarJuncao,
    nomeDoItem,
  };
}

export type { Conjunto };
