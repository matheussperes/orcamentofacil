import { pecaLinearParaPeca } from "./engine/consolidar";
import { precoChapa, type PrecosReferencia } from "./engine/prices";
import type { EngineOutput, GrupoFita, Peca } from "./engine/types";

// V2-5 — Lista unificada de insumos (BOM + custo) no formato de pré-orçamento
// de fornecedor. Fonte única de verdade usada pela tela de resultado e pela
// proposta em PDF.

/** Todas as peças do orçamento (de todos os módulos + elementos contínuos),
 * achatadas num único array — usado pelo plano de corte do orçamento completo. */
export function todasAsPecas(engine: EngineOutput): Peca[] {
  const pecas: Peca[] = engine.porModulo.flatMap((m) => m.pecas);
  for (const g of engine.globais) pecas.push(pecaLinearParaPeca(g));
  return pecas;
}

export interface LinhaInsumo {
  item: string;
  categoria: "Chapas" | "Acabamento" | "Ferragens" | "Serviço";
  qtd: string; // descrição legível (ex.: "3 chapa(s) · 9,42 m²")
  /** Task 3.8 (front) — o número puro que multiplica `unit` para dar `total`
   * (chapas, metros de fita, unidades de ferragem…), exposto pra permitir
   * override de quantidade na UI sem precisar reconstruir `qtd` (string
   * livre). Mesmo número já usado internamente para calcular `total` — não é
   * um segundo cálculo. */
  quantidadeBase: number;
  unit: number;
  total: number;
}

export function montarLinhasInsumos(
  engine: EngineOutput,
  precos: PrecosReferencia,
  opcoes: { incluirServicos?: boolean } = {}
): { linhas: LinhaInsumo[]; subtotal: number } {
  const linhas: LinhaInsumo[] = [];
  let areaTotal = 0;

  for (const g of engine.consolidado.mdf) {
    const unit = precoChapa(precos, g.cor, g.espessura_mm);
    areaTotal += g.area_m2;
    linhas.push({
      item: `MDF ${g.cor} ${g.espessura_mm}mm`,
      categoria: "Chapas",
      qtd: `${g.chapas} chapa(s) · ${g.area_m2.toFixed(2)} m²`,
      quantidadeBase: g.chapas,
      unit,
      total: round2(g.chapas * unit),
    });
  }

  for (const f of engine.consolidado.fitaPorCor) {
    linhas.push({
      item: `Fita de borda ${f.cor} ${f.larguraFitaMm}mm`,
      categoria: "Acabamento",
      qtd: `${f.metros.toFixed(1)} m`,
      quantidadeBase: f.metros,
      unit: precos.fitaMetro,
      total: round2(f.metros * precos.fitaMetro),
    });
  }

  for (const f of engine.consolidado.ferragens) {
    const unit = precos.ferragens[f.item] ?? 0;
    linhas.push({
      item: f.item.replace(/_/g, " "),
      categoria: "Ferragens",
      qtd: `${f.quantidade}`,
      quantidadeBase: f.quantidade,
      unit,
      total: round2(f.quantidade * unit),
    });
  }

  if (opcoes.incluirServicos) {
    linhas.push({
      item: "Montagem",
      categoria: "Serviço",
      qtd: `${areaTotal.toFixed(2)} m²`,
      quantidadeBase: areaTotal,
      unit: precos.montagemPorM2,
      total: round2(areaTotal * precos.montagemPorM2),
    });
    linhas.push({
      item: "Frete",
      categoria: "Serviço",
      qtd: "1",
      quantidadeBase: 1,
      unit: precos.freteFixo,
      total: round2(precos.freteFixo),
    });
  }

  const subtotal = round2(linhas.reduce((s, l) => s + l.total, 0));
  return { linhas, subtotal };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Task 3.6 (RF-03/RF-29) — "quantos rolos comprar" a partir do tamanho de
// rolo cadastrado no catálogo (`Catalogo.tamanhoRoloFitaM`), nunca hardcoded.
export interface RoloFitaCalculado {
  cor: string;
  larguraFitaMm: number;
  metros: number;
  tamanhoRoloM: number;
  rolos: number;
}

/** Rolos de fita a comprar por grupo de `fitaPorCor` (Task 3.5 motor). Só
 * existe UM `tamanhoRoloM` conhecido hoje (mesma simplificação de
 * `fitaMetro` — o catálogo ainda não distingue fita por cor/largura),
 * aplicado a todos os grupos. Sem `tamanhoRoloM` cadastrado (`undefined`
 * ou `<= 0`), devolve array vazio — nunca inventa um tamanho de rolo. */
export function calcularRolosDeFita(
  fitaPorCor: GrupoFita[],
  tamanhoRoloM: number | undefined
): RoloFitaCalculado[] {
  if (typeof tamanhoRoloM !== "number" || tamanhoRoloM <= 0) return [];
  return fitaPorCor.map((f) => ({
    cor: f.cor,
    larguraFitaMm: f.larguraFitaMm,
    metros: f.metros,
    tamanhoRoloM,
    rolos: Math.ceil(f.metros / tamanhoRoloM),
  }));
}
