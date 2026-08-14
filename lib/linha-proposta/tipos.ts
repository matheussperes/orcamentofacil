// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — shape de UMA Linha
// de Proposta no client, espelhando `linha_proposta`
// (supabase/migrations/20260727090600_linha_proposta.sql), mas em camelCase
// e sem os campos que a UI não precisa (`organizacao_id`/`orcamento_id` —
// já conhecidos pelo contexto de quem monta a árvore de componentes,
// `criado_em` — só usado pra ORDER BY na leitura, não exibido).
export interface LinhaProposta {
  id: string;
  titulo: string;
  /** itemIds (`ModuloOrcamento`/`ItemPosicionado.itemId`) cobertos por esta
   * linha — mapeia 1:1 pra `GrupoItens.itemIds` (`lib/engine/precificacao`)
   * quando esta linha vira um grupo do rateio. */
  itens: string[];
  /** RenderRef — PATH dentro do bucket privado `linha-proposta-renders`
   * (nunca uma URL assinada, que expira — ver `lib/linha-proposta/storage.ts`
   * pra decisão completa), OU (só no harness `/dev/preview/orcamento`, sem
   * Storage real) uma data URL `data:image/png;base64,...` direta. `null`
   * antes da primeira geração de imagem (nunca deveria durar muito — a
   * geração dispara automaticamente ao montar/mudar os itens). */
  imagemUrl: string | null;
  descricao: string;
  /** `null` até a config de precificação existir OU até o override manual
   * nunca ter sido persistido (ver `lib/linha-proposta/carregar.ts`) — a UI
   * sempre mostra o valor COMPUTADO ao vivo (`ratearPrecificacao`) quando
   * este vier `null`, nunca um placeholder vazio (ver `PropostaLab.tsx`). */
  valorRateado: number | null;
}

export type ResultadoLinhaProposta =
  | { ok: true; linha: LinhaProposta }
  | { ok: false; erro: string };

export interface ResultadoOperacaoLinhaProposta {
  ok: boolean;
  erro?: string;
}

/** Patch parcial de atualização (`lib/linha-proposta/acoes.ts::atualizarLinhaProposta`).
 * Declarado aqui (não no arquivo "use server") para que Client Components
 * possam importar o TIPO sem qualquer acoplamento à Server Action em si. */
export interface PatchLinhaProposta {
  titulo?: string;
  descricao?: string;
  itens?: string[];
  imagemUrl?: string | null;
  valorRateado?: number | null;
}

/** Task 2.28-2.30 (RF-37/Q-3) — badge somente leitura, na aba Ambientes,
 * indicando a qual `LinhaProposta` (agrupamento comercial) um item
 * posicionado pertence. Distinto do handle/bracket de `Conjunto` (físico,
 * `lib/engine/conjunto`) — ver `ElevacaoParede.tsx`/`BoxCanvas.tsx`. */
export interface TagComercial {
  linhaId: string;
  titulo: string;
}
