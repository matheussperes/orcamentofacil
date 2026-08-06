// Task 2.12 (back) — tipos comuns do domínio `elemento_parede_preset`
// (tabela `public.elemento_parede_preset`, `supabase/migrations/
// 20260806100000_elemento_parede_preset.sql`; docs/Modelo-de-Dominio.md
// Seção 3.2.3, decisão Q-5). Atalho de digitação por organização: só
// `nome` obrigatório, sem preço/status/tipo.

export interface ElementoParedePresetRow {
  id: string;
  organizacaoId: string;
  nome: string;
  larguraPadrao: number | null;
  alturaPadrao: number | null;
  criadoEm: string;
}

/** Colunas lidas de `elemento_parede_preset` em toda leitura — um só lugar
 * pra manter em sincronia com `elementoParedePresetRowDeLinha`. */
export const COLUNAS_ELEMENTO_PAREDE_PRESET =
  "id, organizacao_id, nome, largura_padrao, altura_padrao, criado_em";

/** Linha crua vinda do PostgREST (snake_case, tipos soltos) →
 * `ElementoParedePresetRow`. */
export function elementoParedePresetRowDeLinha(
  linha: Record<string, unknown>
): ElementoParedePresetRow {
  return {
    id: linha.id as string,
    organizacaoId: linha.organizacao_id as string,
    nome: (linha.nome as string | null) ?? "",
    larguraPadrao: (linha.largura_padrao as number | null) ?? null,
    alturaPadrao: (linha.altura_padrao as number | null) ?? null,
    criadoEm: (linha.criado_em as string | null) ?? new Date(0).toISOString(),
  };
}
