// Tabela de preços de REFERÊNCIA pré-carregada (doc 07, Nível 1).
// Elimina o cold start: a conta nasce apto a orçar. Estes valores são
// substituíveis pelo usuário (Nível 3) — aqui servem de default.

export interface ChapaEspecifica {
  cor: string;
  espessura: number;
  preco: number;
}

export interface PrecosReferencia {
  // Preço específico por cor×espessura (V2-6, tem prioridade).
  chapaEspecifica?: ChapaEspecifica[];
  // Fallback: preço da chapa comercial (2,75×1,84m) por espessura em mm.
  chapaPorEspessura: Record<number, number>;
  fitaMetro: number; // R$/m
  ferragens: Record<string, number>; // R$/unidade por código de item
  montagemPorM2: number; // R$/m² de MDF
  freteFixo: number; // R$ por orçamento (simplificação MVP)
}

/** Resolve o preço da chapa por cor×espessura, com fallback por espessura. */
export function precoChapa(
  precos: PrecosReferencia,
  cor: string,
  espessura: number
): number {
  const especifico = precos.chapaEspecifica?.find(
    (c) => c.cor === cor && c.espessura === espessura
  );
  if (especifico) return especifico.preco;
  return precos.chapaPorEspessura[espessura] ?? 0;
}

export const PRECOS_REFERENCIA: PrecosReferencia = {
  chapaPorEspessura: {
    6: 155,
    15: 285,
    18: 315,
  },
  fitaMetro: 2.5,
  ferragens: {
    dobradica_35: 8.0,
    corredica_par: 45.0,
    puxador: 15.0,
    pe_nivelador: 2.0,
    suporte_fixacao_aereo: 6.0,
    parafuso_kit_modulo: 12.0,
    fita_led_m: 25.0,
    pistao: 35.0,
    kit_porta_correr: 90.0,
  },
  montagemPorM2: 90.0,
  freteFixo: 200.0,
};
