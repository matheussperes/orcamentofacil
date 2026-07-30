// Task 13.3d — mapeamento PURO domínio↔linhas/jsonb do Supabase, separado de
// `carregar.ts`/`salvar.ts` (que fazem a I/O) para poder ser testado sem
// mockar o client do Supabase (`lib/ambiente/mapear.test.ts`).

import type { AlturasFaixas, ElementoParede, ItemPosicionado, Parede } from "@/lib/engine/parede/types";
import type { ElementoContinuo } from "@/lib/engine/elemento-continuo/types";
import type { OverrideJuncao } from "@/lib/engine/conjunto";
import type { ModuloOrcamento } from "@/lib/orcamento";
import { alturasIniciais, paredeInicial } from "./estado";

// ---- organizacao.alturas_padrao ----

const CHAVES_ALTURAS: (keyof AlturasFaixas)[] = [
  "alturaRodape",
  "alturaBancada",
  "alturaInstalacaoAereo",
  "peDireito",
];

/** `organizacao.alturas_padrao` nasce `{}` (Task 11.1) — sem as 4 chaves
 * completas, cai no default (`alturasIniciais`), nunca em erro. */
export function alturasDeJson(bruto: unknown): AlturasFaixas {
  if (!bruto || typeof bruto !== "object") return alturasIniciais();
  const obj = bruto as Partial<Record<keyof AlturasFaixas, unknown>>;
  const completo = CHAVES_ALTURAS.every((chave) => typeof obj[chave] === "number");
  return completo ? (obj as AlturasFaixas) : alturasIniciais();
}

// ---- orcamento.itens (módulos) ----

export function modulosDeJson(bruto: unknown): ModuloOrcamento[] {
  return Array.isArray(bruto) ? (bruto as ModuloOrcamento[]) : [];
}

// ---- parede (1 linha por orçamento — escopo desta task) ----

export interface ParedeRow {
  id: string;
  altura: number;
  largura: number;
  elementos: unknown;
  itens: unknown;
  overrides_juncao: unknown;
}

export function paredeDeLinha(row: ParedeRow | null): { parede: Parede; overrides: OverrideJuncao[] } {
  if (!row) return { parede: paredeInicial(), overrides: [] };
  return {
    parede: {
      id: row.id,
      altura: row.altura,
      largura: row.largura,
      elementos: (row.elementos as ElementoParede[] | null) ?? [],
      itens: (row.itens as ItemPosicionado[] | null) ?? [],
    },
    overrides: (row.overrides_juncao as OverrideJuncao[] | null) ?? [],
  };
}

export function linhaDeParede(input: {
  organizacaoId: string;
  ambienteId: string;
  parede: Parede;
  overrides: OverrideJuncao[];
}) {
  return {
    organizacao_id: input.organizacaoId,
    ambiente_id: input.ambienteId,
    altura: input.parede.altura,
    largura: input.parede.largura,
    elementos: input.parede.elementos,
    itens: input.parede.itens,
    overrides_juncao: input.overrides,
  };
}

// ---- elemento_continuo (N linhas) ----
//
// GAP DE SCHEMA (reportar ao Maestro, contrato 13.3d: "se achar que falta
// coluna, PARE e reporte — não escreva SQL"): `elemento_continuo` não tem
// coluna para `ElementoContinuo.material.cor` nem para `tamponamentoTipo`.
// A tabela só guarda `espessura` (numeric solto) + `produto_id` (FK pra
// `produto`, de onde a cor viria via `especificacao` — mas a migration
// 20260727090500_elemento_continuo.sql deixa `produto_id` null "por ora": não
// há integração com o catálogo ainda). Resultado prático: a cor escolhida no
// painel de Elemento Contínuo NÃO sobrevive a um reload — volta pra
// `COR_FALLBACK`. Fix real é uma migration futura (coluna `cor text`, ou
// popular `produto_id` de verdade) — fora do escopo desta task (13.3d: "NÃO
// há migration/schema novo"). `tamponamentoTipo` tem o mesmo problema, mas
// hoje a UI (`AmbientesLab.adicionarElementoContinuo`) nunca define esse
// campo, então não há regressão visível — só uma limitação já existente que
// persiste.
export const COR_FALLBACK = "Branco TX";

export interface ElementoContinuoRow {
  id: string;
  tipo: string;
  alvo: unknown;
  posicao: string;
  espessura: number | null;
  override: unknown;
  engrossamento: unknown;
}

export function linhaDeElementoContinuo(input: {
  organizacaoId: string;
  orcamentoId: string;
  elemento: ElementoContinuo;
}) {
  const { elemento } = input;
  return {
    organizacao_id: input.organizacaoId,
    orcamento_id: input.orcamentoId,
    tipo: elemento.tipo,
    alvo: elemento.alvo,
    posicao: elemento.posicao,
    espessura: elemento.material.espessura,
    override: elemento.override ?? null,
    engrossamento: elemento.engrossamento ?? null,
  };
}

export function elementoContinuoDeLinha(row: ElementoContinuoRow): ElementoContinuo {
  return {
    id: row.id,
    tipo: row.tipo as ElementoContinuo["tipo"],
    alvo: row.alvo as ElementoContinuo["alvo"],
    posicao: row.posicao as ElementoContinuo["posicao"],
    // cor: ver GAP DE SCHEMA acima — não persistida, sempre volta no fallback.
    material: { cor: COR_FALLBACK, espessura: row.espessura ?? 18 },
    override: (row.override as ElementoContinuo["override"]) ?? undefined,
    engrossamento: (row.engrossamento as ElementoContinuo["engrossamento"]) ?? undefined,
  };
}
