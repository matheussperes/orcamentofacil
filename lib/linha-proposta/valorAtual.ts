import type { LinhaProposta } from "./tipos";

// Task 0.7b (Modelo-de-Dominio.md 5.4.1, leituras R1/R2) — extraído de
// `PropostaLab.tsx::valorAtualDaLinha` para ser testável sem infraestrutura
// de renderização (o projeto não tem testing-library/jsdom; mesmo padrão de
// lógica de Lab extraída pra `lib/` puro + `.test.ts` de
// `lib/engine/precificacao/rebalancear.ts`).
//
// R1 — ao vivo (`congeladoEm === null`): override manual ainda não
// persistido (`valoresOverride`) tem prioridade, senão o rateio computado ao
// vivo (`valorAoVivo`, já resolvido por quem chama).
// R2 — congelada (`congeladoEm !== null`): NADA é recalculado — sempre o
// valor persistido em `linha.valorRateado`, ignorando override e rateio ao
// vivo.
export function valorAtualDaLinha(params: {
  linha: Pick<LinhaProposta, "id" | "valorRateado">;
  congeladoEm: string | null;
  valoresOverride: Record<string, number> | null;
  valorAoVivo: number;
}): number {
  if (params.congeladoEm !== null) return params.linha.valorRateado ?? 0;
  if (params.valoresOverride && params.valoresOverride[params.linha.id] !== undefined) {
    return params.valoresOverride[params.linha.id];
  }
  return params.valorAoVivo;
}
