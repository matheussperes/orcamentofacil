// Tipos do modelo de precificação V2 (Modelo de Domínio, Seção 5).
//
// COEXISTÊNCIA CONSCIENTE: este módulo NÃO substitui `lib/engine/pricing.ts`
// (modelo V1 — markup divisor, ainda ativo nas telas atuais). Os dois convivem
// até a Fase C decompor a página única (mesma coexistência da Task 12.4). Este
// módulo implementa os 4 modos de precificação, os 3 modos de montagem, o
// rateio por custo alocado e o resumo financeiro de 6 campos.
//
// Todas as funções deste módulo são PURAS e determinísticas: preços e
// configuração entram como parâmetro; nada de I/O, banco ou relógio.

import type { EngineWarning } from "../types";

// --- Modos de precificação (Seção 5.1) ---
// Todos produzem `precoMoveis` a partir do custo de material.
// `percentual` é FRAÇÃO (0.5 = 50%), consistente com `pricing.ts`.
export type ModoPrecificacao =
  | { modo: "multiplicador"; fator: number } // precoMoveis = fator × custoMaterial
  | { modo: "percentual"; percentual: number } // precoMoveis = custoMaterial × (1 + percentual)
  | { modo: "por_chapa"; valorChapa: number } // precoMoveis = valorChapa × totalChapasInteiro
  | { modo: "fixo"; valor: number }; // precoMoveis = valor (ignora custo de material)

// --- Modos de montagem (Seção 5.3 / briefing D-24) ---
// Um só por orçamento; produz `montagemTotal`. `percentual` é FRAÇÃO.
export type ModoMontagem =
  | { modo: "percentual_material"; percentual: number } // custoMaterial × percentual
  | { modo: "por_chapa"; valorChapa: number } // valorChapa × totalChapasInteiro
  | { modo: "manual"; valor: number }; // valor

// Configuração comercial do orçamento (perfil + override por orçamento).
// Frete é sempre valor editável (Seção 5.5 "Frete: editável").
export interface ConfiguracaoPrecificacao {
  precificacao: ModoPrecificacao;
  montagem: ModoMontagem;
  freteTotal: number; // R$, somado por cima sem markup (decisão de negócio #1)
}

// Partição abstrata de itens do orçamento. Cada `itemId` casa com
// `ResultadoModulo.moduloId` do `EngineOutput.porModulo`. Na Fase C serão
// Linhas de Proposta / Ambientes — aqui é só uma partição de itens.
export interface GrupoItens {
  id: string;
  itemIds: string[];
}

// Decomposição do custo de material (Seção 5.5 "Custo de material").
export interface CustoMaterial {
  custoMaterial: number; // chapas (N inteiro × preço) + fita + ferragens + acessórios
  custoChapas: number; // Σ_M N(M) × precoChapa(M)
  custoFita: number;
  custoFerragens: number;
  custoAcessorios: number; // ver nota em custo-material.ts (não há campo dedicado hoje)
  totalChapasInteiro: number; // Σ_M N(M) — base dos modos "por_chapa"
}

// Valor rateado de um grupo, decomposto por componente (Seção 5.2).
// `valorRateado` = valorMoveis + valorFrete + valorMontagem (é o único número
// que o cliente enxerga — D-25 frete/montagem diluídos).
export interface ValorGrupo {
  id: string;
  valorRateado: number;
  valorMoveis: number;
  valorFrete: number;
  valorMontagem: number;
  custoAlocado: number; // base de rateio de móveis e frete
  chapasAlocadas: number; // FRACIONÁRIO — base de rateio da montagem por_chapa
}

// Resumo financeiro de 6 campos (Seção 5.5).
export interface ResumoFinanceiro {
  precoFinal: number;
  custoMaterial: number;
  montagem: number;
  frete: number;
  lucroFinal: number; // precoFinal − material − montagem − frete
  margemLucro: number; // lucroFinal ÷ precoFinal (guardado contra /0)
}

// Resultado congelável do rateio (Seção 5.4). É PURO e determinístico; o
// "congelamento" é o ato de PERSISTIR este snapshot no fechamento da proposta
// (persistência é Fase C, fora de escopo). Invariante testável:
// Σ grupos[].valorRateado == resumo.precoFinal (exato, em centavos).
export interface RateioSnapshot {
  resumo: ResumoFinanceiro;
  precoMoveis: number;
  montagemTotal: number;
  freteTotal: number;
  grupos: ValorGrupo[];
  custoMaterial: CustoMaterial;
  warnings: EngineWarning[];
}
