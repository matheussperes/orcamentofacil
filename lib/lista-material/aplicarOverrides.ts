import type { LinhaInsumo } from "@/lib/insumos";
import type { OverrideQuantidade } from "./override";

// Task 3.8 (front) — merge puro dos overrides de quantidade (Task 3.8 back,
// `lib/lista-material/override.ts`) sobre as linhas do BOM. Usada tanto pela
// tabela em tela quanto pelo snapshot de congelamento (`montarSnapshotAtual`
// em `CorteMaterialLab.tsx`) — uma fonte só, sem I/O, sem estado. Categoria,
// item e `unit` nunca mudam aqui — só `total`, recalculado como
// `quantidadeOverride * unit`.

/** Aplica os overrides ativos sobre `linhas`, recalculando `total` dos itens
 * com override. Linhas sem override ativo (ou overrides de itens que não
 * existem mais em `linhas`, ex.: peça removida do orçamento) passam intactas. */
export function aplicarOverridesQuantidade(
  linhas: LinhaInsumo[],
  overrides: OverrideQuantidade[]
): LinhaInsumo[] {
  const quantidadePorItem = new Map(overrides.map((o) => [o.itemChave, o.quantidade]));

  return linhas.map((linha) => {
    const quantidadeOverride = quantidadePorItem.get(linha.item);
    if (quantidadeOverride === undefined) return linha;
    return { ...linha, total: round2(quantidadeOverride * linha.unit) };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
