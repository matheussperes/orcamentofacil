import {
  PRECOS_REFERENCIA,
  type PrecosReferencia,
} from "./engine/prices";

// V2-6 — Catálogo de materiais editável pelo usuário. No MVP persiste em
// localStorage (a versão final usa as tabelas Prisma CatalogoItem→Preco, doc 03).
// O motor de custos consome estes preços em vez da tabela de referência fixa.

export interface AcabamentoMdf {
  id: string;
  cor: string;
  espessura: number; // 6 | 15 | 18
  precoChapa: number; // R$ por chapa 2,75×1,84m
  fornecedor?: string;
}

export interface FerragemCatalogo {
  codigo: string; // casa com os itens gerados pela engine (ex.: "dobradica_35")
  nome: string;
  preco: number;
  unidade: string; // "un", "par"…
  fornecedor?: string;
}

export interface Catalogo {
  mdf: AcabamentoMdf[];
  ferragens: FerragemCatalogo[];
  fitaMetro: number;
  /** Task 3.6 — tamanho do rolo de fita (metros), derivado do produto tipo
   * `fita` ativo (`lib/produto/mapear.ts::produtosParaCatalogo`). Sem
   * fallback: `undefined` quando nenhum produto tem o valor cadastrado
   * (diferente de `fitaMetro`, que sempre tem `PRECOS_REFERENCIA` como
   * último recurso). */
  tamanhoRoloFitaM?: number;
  montagemPorM2: number;
  freteFixo: number;
}

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — exportado (era
// privado deste módulo) para `lib/produto/mapear.ts`/os formulários de
// `/catalogo` reaproveitarem a mesma lista de códigos fixos de ferragem que
// o motor de caixa emite (`lib/engine/box/explode.ts`), evitando duplicar a
// lista em dois lugares.
export const NOMES_FERRAGENS: Record<string, { nome: string; unidade: string }> = {
  dobradica_35: { nome: "Dobradiça 35mm", unidade: "un" },
  corredica_par: { nome: "Corrediça (par)", unidade: "par" },
  puxador: { nome: "Puxador", unidade: "un" },
  pe_nivelador: { nome: "Pé nivelador", unidade: "un" },
  suporte_fixacao_aereo: { nome: "Suporte de fixação (aéreo)", unidade: "un" },
  parafuso_kit_modulo: { nome: "Kit de parafusos (módulo)", unidade: "kit" },
  fita_led_m: { nome: "Fita LED", unidade: "m" },
  pistao: { nome: "Pistão a gás (basculante)", unidade: "un" },
  kit_porta_correr: { nome: "Kit porta de correr (trilho + roldanas)", unidade: "kit" },
  perfil_puxador_m: { nome: "Perfil puxador (alumínio)", unidade: "m" },
};

// Catálogo padrão (Nível 1 do onboarding, doc 07): já vem preenchido.
export const CATALOGO_PADRAO: Catalogo = {
  mdf: [
    { id: "branco-6", cor: "Branco TX", espessura: 6, precoChapa: 155 },
    { id: "branco-15", cor: "Branco TX", espessura: 15, precoChapa: 285 },
    { id: "branco-18", cor: "Branco TX", espessura: 18, precoChapa: 315 },
    { id: "freijo-15", cor: "Louro Freijó", espessura: 15, precoChapa: 380 },
    { id: "freijo-18", cor: "Louro Freijó", espessura: 18, precoChapa: 420 },
    { id: "cinza-15", cor: "Cinza Sagrado", espessura: 15, precoChapa: 295 },
    { id: "cinza-18", cor: "Cinza Sagrado", espessura: 18, precoChapa: 330 },
    { id: "madeirado-18", cor: "Madeirado", espessura: 18, precoChapa: 410 },
  ],
  ferragens: Object.entries(PRECOS_REFERENCIA.ferragens).map(([codigo, preco]) => ({
    codigo,
    nome: NOMES_FERRAGENS[codigo]?.nome ?? codigo,
    unidade: NOMES_FERRAGENS[codigo]?.unidade ?? "un",
    preco,
  })),
  fitaMetro: PRECOS_REFERENCIA.fitaMetro,
  montagemPorM2: PRECOS_REFERENCIA.montagemPorM2,
  freteFixo: PRECOS_REFERENCIA.freteFixo,
};

const CHAVE = "catalogo";

export function carregarCatalogo(): Catalogo {
  if (typeof window === "undefined") return CATALOGO_PADRAO;
  try {
    const raw = window.localStorage.getItem(CHAVE);
    if (!raw) return CATALOGO_PADRAO;
    return { ...CATALOGO_PADRAO, ...JSON.parse(raw) } as Catalogo;
  } catch {
    return CATALOGO_PADRAO;
  }
}

export function salvarCatalogo(catalogo: Catalogo): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE, JSON.stringify(catalogo));
}

/** Converte o catálogo do usuário no formato que o motor de custos consome. */
export function catalogoParaPrecos(catalogo: Catalogo): PrecosReferencia {
  return {
    chapaEspecifica: catalogo.mdf.map((m) => ({
      cor: m.cor,
      espessura: m.espessura,
      preco: m.precoChapa,
    })),
    chapaPorEspessura: PRECOS_REFERENCIA.chapaPorEspessura, // fallback
    ferragens: Object.fromEntries(catalogo.ferragens.map((f) => [f.codigo, f.preco])),
    fitaMetro: catalogo.fitaMetro,
    montagemPorM2: catalogo.montagemPorM2,
    freteFixo: catalogo.freteFixo,
  };
}

/** Cores distintas disponíveis (para os dropdowns de material por módulo). */
export function coresDisponiveis(catalogo: Catalogo): string[] {
  return [...new Set(catalogo.mdf.map((m) => m.cor))];
}

/** Espessuras disponíveis para uma cor. */
export function espessurasDaCor(catalogo: Catalogo, cor: string): number[] {
  return catalogo.mdf
    .filter((m) => m.cor === cor)
    .map((m) => m.espessura)
    .sort((a, b) => a - b);
}
