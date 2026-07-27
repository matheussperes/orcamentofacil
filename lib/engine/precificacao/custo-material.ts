import { precoChapa, type PrecosReferencia } from "../prices";
import type { EngineOutput, ResultadoModulo } from "../types";
import type { CustoMaterial } from "./types";

// Custo de material e bases de rateio por item (Modelo de Domínio, Seção 5.2).
// Puro: preços entram como parâmetro.

/** Chave de material = cor × espessura (mesmo critério de `consolidarResultados`). */
export function chaveMaterial(cor: string, espessura_mm: number): string {
  return `${cor}|${espessura_mm}`;
}

// Índice de materiais derivado do consolidado do motor. `N` = nº INTEIRO de
// chapas compradas (saída do bin-packing/consolidação — "inteiro para compra");
// `areaTotal` = Σ áreaPeças(M) sobre todo o orçamento (denominador do rateio,
// Seção 5.2). `custoChapas` = N × precoChapa (chapas inteiras compradas — D-22).
export interface MaterialInfo {
  N: number;
  preco: number;
  areaTotal: number;
  custoChapas: number;
}

export function indexarMateriais(
  engine: EngineOutput,
  precos: PrecosReferencia
): Map<string, MaterialInfo> {
  const mapa = new Map<string, MaterialInfo>();
  for (const g of engine.consolidado.mdf) {
    const preco = precoChapa(precos, g.cor, g.espessura_mm);
    mapa.set(chaveMaterial(g.cor, g.espessura_mm), {
      N: g.chapas,
      preco,
      areaTotal: g.area_m2,
      custoChapas: g.chapas * preco,
    });
  }
  return mapa;
}

/**
 * Custo de material total do orçamento (Seção 5.5). Chapas usam N INTEIRO ×
 * preço (não área consumida — D-22), por material. Fita e ferragens são
 * atribuição direta aditiva.
 *
 * `custoAcessorios`: o `EngineOutput` atual não modela "acessórios/LED" como
 * categoria separada das ferragens — `ResultadoModulo.ferragens` já cobre todo
 * o hardware diretamente atribuível. Mantém-se o campo (=0) para fidelidade à
 * spec e para quando a categoria existir; hoje acessórios entram via ferragens.
 */
export function calcularCustoMaterial(
  engine: EngineOutput,
  precos: PrecosReferencia,
  materiais: Map<string, MaterialInfo> = indexarMateriais(engine, precos)
): CustoMaterial {
  let custoChapas = 0;
  let totalChapasInteiro = 0;
  for (const m of materiais.values()) {
    custoChapas += m.custoChapas;
    totalChapasInteiro += m.N;
  }

  const custoFita = engine.consolidado.fitaTotalM * precos.fitaMetro;

  let custoFerragens = 0;
  for (const f of engine.consolidado.ferragens) {
    custoFerragens += f.quantidade * (precos.ferragens[f.item] ?? 0);
  }

  const custoAcessorios = 0;

  return {
    custoMaterial: custoChapas + custoFita + custoFerragens + custoAcessorios,
    custoChapas,
    custoFita,
    custoFerragens,
    custoAcessorios,
    totalChapasInteiro,
  };
}

// Bases de rateio de um único item (módulo). Não arredonda — o arredondamento
// só acontece na composição final (Seção 5.2, "arredondamento").
export interface BaseItem {
  custoAlocado: number; // Σ_M chapaAlocada + fita + ferragens (+ acessórios)
  chapasAlocadas: number; // Σ_M N(M) × áreaPeças(item,M)/áreaTotal(M) — fracionário
}

/** Área de peças do item por material (área já vem × quantidade em `Peca`). */
function areaPecasPorMaterial(item: ResultadoModulo): Map<string, number> {
  const areas = new Map<string, number>();
  for (const p of item.pecas) {
    const chave = chaveMaterial(p.cor, p.espessura_mm);
    areas.set(chave, (areas.get(chave) ?? 0) + p.area_m2);
  }
  return areas;
}

/**
 * Custo alocado e chapas alocadas de UM item (Seção 5.2):
 *   chapaAlocada(item, M)   = custoChapasCompradas(M) × áreaPeças(item,M)/áreaTotal(M)
 *   chapasAlocadas(item, M) = N(M)                    × áreaPeças(item,M)/áreaTotal(M)
 * Segregado por material (branco não paga chapa amadeirada de outro item).
 * Fita/ferragens: atribuição DIRETA, aditiva.
 */
export function baseDoItem(
  item: ResultadoModulo,
  materiais: Map<string, MaterialInfo>,
  precos: PrecosReferencia
): BaseItem {
  let chapaAlocada = 0;
  let chapasAlocadas = 0;
  for (const [chave, area] of areaPecasPorMaterial(item)) {
    const mat = materiais.get(chave);
    if (!mat || mat.areaTotal <= 0) continue; // sem chapa/área → nada a alocar
    const fracao = area / mat.areaTotal;
    chapaAlocada += mat.custoChapas * fracao;
    chapasAlocadas += mat.N * fracao;
  }

  const fita = item.fitaM * precos.fitaMetro;
  let ferragens = 0;
  for (const f of item.ferragens) {
    ferragens += f.quantidade * (precos.ferragens[f.item] ?? 0);
  }

  return { custoAlocado: chapaAlocada + fita + ferragens, chapasAlocadas };
}
