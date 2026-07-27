import type { ModoMontagem, ModoPrecificacao } from "./types";

// Os 4 modos de precificação e os 3 de montagem (Modelo de Domínio, Seções 5.1
// e 5.3). Funções puras. O markup do modo de precificação incide SÓ sobre o
// custo de material (decisão de negócio #1); montagem e frete somam por cima
// sem markup.

interface ContextoModo {
  custoMaterial: number;
  totalChapasInteiro: number; // Σ_M N(M)
}

/** precoMoveis a partir do custo de material (Seção 5.1). */
export function calcularPrecoMoveis(
  modo: ModoPrecificacao,
  ctx: ContextoModo
): number {
  switch (modo.modo) {
    case "multiplicador":
      return modo.fator * ctx.custoMaterial;
    case "percentual":
      // `percentual` é FRAÇÃO (0.5 = 50%), consistente com pricing.ts.
      return ctx.custoMaterial * (1 + modo.percentual);
    case "por_chapa":
      // Valor por chapa consumida — fita/ferragens NÃO entram (é valor por
      // chapa comprada, não sobre custo).
      return modo.valorChapa * ctx.totalChapasInteiro;
    case "fixo":
      return modo.valor; // ignora o custo de material por completo
  }
}

/** montagemTotal a partir do modo escolhido (Seção 5.3 / D-24). */
export function calcularMontagemTotal(
  modo: ModoMontagem,
  ctx: ContextoModo
): number {
  switch (modo.modo) {
    case "percentual_material":
      return ctx.custoMaterial * modo.percentual; // fração
    case "por_chapa":
      return modo.valorChapa * ctx.totalChapasInteiro;
    case "manual":
      return modo.valor;
  }
}
