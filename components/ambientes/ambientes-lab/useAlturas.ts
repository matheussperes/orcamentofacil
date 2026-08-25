"use client";

import { useState } from "react";
import type { AlturasFaixas, Parede } from "@/lib/engine/parede";
import type { ParedeComMeta } from "@/lib/ambiente/estado";
import { definirAlturaOverride, removerAlturaOverride } from "../AmbientesLab.helpers";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Perfil de
 * alturas da organização (`alturas`) + override por parede, derivado de
 * `parede.alturasOverride` (Modelo-de-Domínio 3.2.1) — nunca um flag
 * próprio. */
export function useAlturas(params: {
  alturasIniciais: AlturasFaixas;
  parede: ParedeComMeta;
  atualizarParede: (patch: Partial<Parede>) => void;
  marcarAlteracao: () => void;
}) {
  const { alturasIniciais, parede, atualizarParede, marcarAlteracao } = params;
  const [alturas, setAlturas] = useState<AlturasFaixas>(() => alturasIniciais);

  function atualizarAlturas(patch: Partial<AlturasFaixas>) {
    setAlturas((a) => ({ ...a, ...patch }));
    marcarAlteracao();
  }

  // Task 2.3-2.6 (alturas) — estado "herdado" vs "customizado" é DERIVADO de
  // `parede.alturasOverride?.[campo] !== undefined` (Modelo-de-Domínio Seção
  // 3.2.1), nunca um flag próprio. "Voltar ao herdado" apaga a chave do
  // override (nunca copia o valor numérico do perfil) — é isso que mantém a
  // propagação futura funcionando quando o perfil muda depois.
  function alturaCustomizada(campo: keyof AlturasFaixas): boolean {
    return parede.alturasOverride?.[campo] !== undefined;
  }
  function alturaEfetiva(campo: keyof AlturasFaixas): number {
    return parede.alturasOverride?.[campo] ?? alturas[campo];
  }
  function setAlturaOverride(campo: keyof AlturasFaixas, valor: number) {
    atualizarParede({ alturasOverride: definirAlturaOverride(parede.alturasOverride, campo, valor) });
  }
  function voltarAoHerdado(campo: keyof AlturasFaixas) {
    atualizarParede({ alturasOverride: removerAlturaOverride(parede.alturasOverride, campo) });
  }

  return { alturas, atualizarAlturas, alturaCustomizada, alturaEfetiva, setAlturaOverride, voltarAoHerdado };
}
