import { CAPACIDADES, type Capacidade, type ModuloOrcamento } from "@/lib/orcamento";

// Task 13.1 — schema de seções do accordion de Placa, derivado do schema de
// capacidades do domínio (`lib/orcamento.ts::CAPACIDADES`, Modelo de
// Domínio Seção 4). Cada seção declara quais capacidades ela cobre; a lista
// final exibida (`ordemSecoesPlaca`) é filtrada por `CAPACIDADES[origem]` —
// isso é o que garante que o schema seja a fonte única de verdade de "o que
// aparece" (critério de aceitação da Task 13.1), em vez de uma lista fixa
// coincidentemente igual ao schema.
//
// O sentido do veio (`placa.sentidoVeio`) NÃO é uma seção/capacidade daqui —
// o Modelo de Domínio (Seção 8) trata isso como um sub-controle do material,
// visível/habilitado só quando `material.temVeio` é `true` (condição sobre
// um VALOR, não sobre o schema de capacidades). Por isso ele vive dentro do
// corpo da seção "dimensoesMaterial", não como seção própria.
export type SecaoPlaca = "dimensoesMaterial" | "orientacao" | "bordaPorLado" | "engrossamento" | "ripado";

interface SecaoPlacaDef {
  id: SecaoPlaca;
  capacidades: Capacidade[];
  label: string;
}

const SECOES_PLACA: SecaoPlacaDef[] = [
  { id: "dimensoesMaterial", capacidades: ["dimensoes", "material"], label: "Dimensões e material" },
  { id: "orientacao", capacidades: ["orientacao"], label: "Orientação" },
  { id: "bordaPorLado", capacidades: ["bordaPorLado"], label: "Borda (fita)" },
  { id: "engrossamento", capacidades: ["engrossamento"], label: "Engrossamento" },
  { id: "ripado", capacidades: ["ripado"], label: "Ripado" },
];

/**
 * Filtra `SECOES_PLACA` pelas capacidades realmente declaradas em
 * `CAPACIDADES[origem]`: uma seção só aparece quando TODAS as capacidades
 * que ela cobre estão no schema daquele `origem`. Chamar com `"custom_box"`
 * devolve lista vazia (nenhuma das seções de Placa cobre uma capacidade de
 * `custom_box` que não seja também "dimensoes"/"material" — e mesmo essas
 * não bastam sozinhas para uma seção específica de Placa aparecer no box,
 * já que "orientacao"/"bordaPorLado"/"engrossamento"/"ripado" não estão no
 * schema de `custom_box`).
 */
export function ordemSecoesPlaca(origem: ModuloOrcamento["origem"] = "placa"): SecaoPlaca[] {
  const capacidadesDoOrigem = new Set(CAPACIDADES[origem]);
  return SECOES_PLACA.filter((s) => s.capacidades.every((c) => capacidadesDoOrigem.has(c))).map(
    (s) => s.id
  );
}

export const ROTULOS_SECOES_PLACA: Record<SecaoPlaca, string> = Object.fromEntries(
  SECOES_PLACA.map((s) => [s.id, s.label])
) as Record<SecaoPlaca, string>;

/** Exportado só para o teste conferir que nenhuma seção cobre uma
 * capacidade fora do schema (guarda-corpo contra o schema e a UI divergirem
 * silenciosamente). */
export const _SECOES_PLACA_PARA_TESTE = SECOES_PLACA;
