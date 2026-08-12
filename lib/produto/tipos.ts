// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — tipos comuns do
// domínio `produto` (tabela `public.produto`,
// `supabase/migrations/20260727090100_produto.sql`). Shape de
// `especificacao` por `tipo` documentado na migration de seed
// (`supabase/migrations/20260727140000_seed_produtos_padrao.sql`), fonte da
// verdade — NÃO inventar campos fora dela:
//   - "chapa":     { cor: string; espessura: number; texturaUrl?: string }
//     (`texturaUrl` — Task 3.13 catálogo-back — caminho relativo no bucket
//     `texturas`, ver `EspecificacaoChapa` abaixo)
//   - "ferragem":  { codigo: string; unidade: string } — `codigo` precisa
//     bater com um dos códigos fixos emitidos pelo motor de caixa
//     (`lib/engine/box/explode.ts`), ver `CODIGOS_FERRAGEM_FIXOS` abaixo.
//   - "fita":      { unidade: "m"; tamanhoRoloM?: number } — Task 3.6,
//     tamanho do rolo (metros) usado para calcular quantos rolos comprar
//     (`lib/insumos.ts::calcularRolosDeFita`); sem fallback quando ausente.
//   - "led"/"acessorio": sem especificação obrigatória (nascem vazios).

import { NOMES_FERRAGENS } from "@/lib/catalog";

export type TipoProduto = "chapa" | "ferragem" | "fita" | "led" | "acessorio";

export interface EspecificacaoChapa {
  cor: string;
  espessura: number;
  /** [Q-14] Caminho relativo dentro do bucket `texturas` (Supabase Storage,
   * supabase/migrations/20260811110000_storage_texturas.sql) — nunca URL
   * absoluta/externa (validado em `lib/produto/acoes.ts::validarDados`, evita
   * hotlink dentro do canvas do usuário). Ausente ⇒ cor sólida. */
  texturaUrl?: string;
}

export interface EspecificacaoFerragem {
  codigo: string;
  unidade: string;
}

export interface EspecificacaoFita {
  unidade: "m";
  /** Task 3.6 — tamanho do rolo, em metros, cadastrado no catálogo. Opcional
   * de propósito: ao contrário do preço (`ProdutoRow.preco`, sempre presente
   * com fallback via `PRECOS_REFERENCIA`), não existe tamanho de rolo padrão
   * inventável — ausente aqui, o cálculo de rolos simplesmente não roda. */
  tamanhoRoloM?: number;
}

/** Linha normalizada de `produto` (camelCase, tipada) — usada tanto pela
 * leitura server-side (`lib/produto/listar.ts`, CRUD de `/catalogo`) quanto
 * client-side (`lib/produto/buscar.ts`, consumo real do catálogo). */
export interface ProdutoRow {
  id: string;
  tipo: TipoProduto;
  nome: string;
  /** Task 4.4 — código opcional de chamada rápida (RF-03/RF-30), único por
   * organização (`produto_organizacao_id_codigo_key`,
   * `supabase/migrations/20260812120000_produto_codigo.sql`). */
  codigo?: string | null;
  especificacao: Record<string, unknown>;
  preco: number;
  fornecedor: string | null;
  ativo: boolean;
  criadoEm: string;
}

/** Linha crua vinda do PostgREST (snake_case, tipos soltos) → `ProdutoRow`.
 * Único ponto de normalização — evita repetir o mesmo cast em
 * `listar.ts`/`buscar.ts`/`acoes.ts`. */
export function produtoRowDeLinha(linha: Record<string, unknown>): ProdutoRow {
  return {
    id: linha.id as string,
    tipo: linha.tipo as TipoProduto,
    nome: (linha.nome as string | null) ?? "",
    codigo: (linha.codigo as string | null) ?? null,
    especificacao: (linha.especificacao as Record<string, unknown> | null) ?? {},
    preco: Number(linha.preco ?? 0),
    fornecedor: (linha.fornecedor as string | null) ?? null,
    ativo: (linha.ativo as boolean | null) ?? true,
    criadoEm: (linha.criado_em as string | null) ?? new Date(0).toISOString(),
  };
}

/** Colunas lidas de `produto` em toda leitura (CRUD e consumo) — um só lugar
 * pra manter a lista em sincronia com `produtoRowDeLinha`. */
export const COLUNAS_PRODUTO =
  "id, tipo, nome, codigo, especificacao, preco, fornecedor, ativo, criado_em";

/** Códigos fixos de ferragem que o motor de caixa sabe procurar
 * (`lib/engine/box/explode.ts`) — reaproveita os nomes amigáveis já
 * cadastrados em `lib/catalog.ts::NOMES_FERRAGENS` em vez de duplicar a
 * lista. Um produto tipo ferragem com um `codigo` fora desta lista não afeta
 * nenhum cálculo (o motor não sabe procurá-lo) — por isso o formulário de
 * "Adicionar ferragem" em `/catalogo` só permite escolher entre estes
 * (seletor fixo, não texto livre). */
export const CODIGOS_FERRAGEM_FIXOS = Object.keys(NOMES_FERRAGENS) as string[];

export function nomeAmigavelFerragem(codigo: string): string {
  return NOMES_FERRAGENS[codigo]?.nome ?? codigo;
}

export function unidadePadraoFerragem(codigo: string): string {
  return NOMES_FERRAGENS[codigo]?.unidade ?? "un";
}
