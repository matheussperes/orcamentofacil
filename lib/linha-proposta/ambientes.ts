import type { AmbienteItem } from "@/lib/ambiente/estado";

// Task 2.32 — vínculo visual "linha ⇄ ambiente" (documento-fonte: dividir
// "Quarto" em "Cabeceira"/"Penteadeira"/"Gaveteiro"/"Guarda-roupa" deve
// manter as 4 linhas reconhecíveis como pertencentes a "Quarto"). O vínculo
// já existe nos dados — um `itemId` só existe numa Linha de Proposta se
// estiver posicionado em algum `ItemPosicionado` de alguma `Parede`, e toda
// `Parede` pertence a exatamente um `Ambiente` (Modelo-de-Dominio Seção
// 3.2) — então basta DERIVAR, nunca rastrear/persistir. Função pura, mesmo
// padrão de `lib/linha-proposta/descricao.ts`.

/** Nomes distintos dos ambientes cujas paredes contêm algum dos `itemIds`
 * desta linha, na ordem em que os ambientes aparecem em `ambientes`. Uma
 * Linha de Proposta pode cruzar ambientes (Modelo-de-Dominio Seção 6), caso
 * em que retorna mais de um nome. Item cujo `itemId` não resolve pra
 * nenhuma parede é ignorado silenciosamente (invariante do domínio — não
 * deveria acontecer, mesmo tratamento de item órfão já usado no motor). */
export function ambientesDaLinha(itemIds: string[], ambientes: AmbienteItem[]): string[] {
  if (itemIds.length === 0) return [];
  const idsDesejados = new Set(itemIds);
  const nomes: string[] = [];
  for (const ambiente of ambientes) {
    const contemAlgumItem = ambiente.paredes.some((parede) =>
      parede.itens.some((item) => idsDesejados.has(item.itemId))
    );
    if (contemAlgumItem && !nomes.includes(ambiente.nome)) nomes.push(ambiente.nome);
  }
  return nomes;
}
