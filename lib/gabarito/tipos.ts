// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — tipos comuns do
// domínio `gabarito` (tabela `public.gabarito`, `supabase/migrations/
// 20260727090200_gabarito.sql`; D-15, `docs/Modelo-de-Dominio.md` Seção 7):
// base global (`organizacao_id` null, read-only para todas as orgs) + fork
// por organização. `definicao` (jsonb) guarda a árvore `BoxModule`
// (`lib/engine/box/types.ts`) — mesmo shape que já era serializado em
// `lib/boxPresets.ts::BoxPreset.box` no MVP em localStorage.

import { migrarBoxModule } from "@/lib/engine/box/migrate";
import type { BoxModule } from "@/lib/engine/box/types";

/** Linha normalizada de `gabarito` (camelCase, tipada) — usada tanto pela
 * leitura server-side (`lib/gabarito/listar.ts`, `/biblioteca`) quanto
 * client-side (`lib/gabarito/buscar.ts`, `/modulo`). */
export interface GabaritoRow {
  id: string;
  /** `null` = base global (read-only para todas as orgs, D-15). */
  organizacaoId: string | null;
  /** Linhagem do fork (D-15) — `null` quando a linha NÃO é cópia de nenhuma
   * outra (seed global original, ou módulo criado do zero pelo usuário). */
  origemGabaritoId: string | null;
  nome: string;
  categoria: string;
  definicao: BoxModule;
  criadoEm: string;
}

/** Colunas lidas de `gabarito` em toda leitura (CRUD e consumo do editor) —
 * um só lugar pra manter em sincronia com `gabaritoRowDeLinha`. */
export const COLUNAS_GABARITO =
  "id, organizacao_id, origem_gabarito_id, nome, categoria, definicao, criado_em";

/** Linha crua vinda do PostgREST (snake_case, tipos soltos) → `GabaritoRow`.
 * `migrarBoxModule` (mesma função que `lib/boxPresets.ts::listarPresets()` já
 * usava para presets salvos no formato antigo) roda em toda leitura — sem
 * isso, um gabarito gravado antes de uma futura mudança de shape de
 * `BoxModule`/`BayNode` quebraria o editor ao ser reaberto. */
export function gabaritoRowDeLinha(linha: Record<string, unknown>): GabaritoRow {
  return {
    id: linha.id as string,
    organizacaoId: (linha.organizacao_id as string | null) ?? null,
    origemGabaritoId: (linha.origem_gabarito_id as string | null) ?? null,
    nome: (linha.nome as string | null) ?? "",
    categoria: (linha.categoria as string | null) ?? "",
    definicao: migrarBoxModule(linha.definicao as BoxModule),
    criadoEm: (linha.criado_em as string | null) ?? new Date(0).toISOString(),
  };
}

/** `true` quando a linha é da base global (somente leitura para todas as
 * orgs) — usado tanto pela badge "Global"/"Seu módulo" de `/biblioteca`
 * quanto pela decisão de fork-on-save de `/modulo` (D-15). */
export function ehGabaritoGlobal(gabarito: Pick<GabaritoRow, "organizacaoId">): boolean {
  return gabarito.organizacaoId === null;
}
