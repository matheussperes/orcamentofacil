import { precoChapa, type PrecosReferencia } from "./engine/prices";
import type { EngineOutput } from "./engine/types";

// V2-5 — Lista unificada de insumos (BOM + custo) no formato de pré-orçamento
// de fornecedor. Fonte única de verdade usada pela tela de resultado e pela
// proposta em PDF.

export interface LinhaInsumo {
  item: string;
  categoria: "Chapas" | "Acabamento" | "Ferragens" | "Serviço";
  qtd: string; // descrição legível (ex.: "3 chapa(s) · 9,42 m²")
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
      unit,
      total: round2(g.chapas * unit),
    });
  }

  linhas.push({
    item: "Fita de borda",
    categoria: "Acabamento",
    qtd: `${engine.consolidado.fitaTotalM.toFixed(1)} m`,
    unit: precos.fitaMetro,
    total: round2(engine.consolidado.fitaTotalM * precos.fitaMetro),
  });

  for (const f of engine.consolidado.ferragens) {
    const unit = precos.ferragens[f.item] ?? 0;
    linhas.push({
      item: f.item.replace(/_/g, " "),
      categoria: "Ferragens",
      qtd: `${f.quantidade}`,
      unit,
      total: round2(f.quantidade * unit),
    });
  }

  if (opcoes.incluirServicos) {
    linhas.push({
      item: "Montagem",
      categoria: "Serviço",
      qtd: `${areaTotal.toFixed(2)} m²`,
      unit: precos.montagemPorM2,
      total: round2(areaTotal * precos.montagemPorM2),
    });
    linhas.push({
      item: "Frete",
      categoria: "Serviço",
      qtd: "1",
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
