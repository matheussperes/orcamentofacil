import { precoChapa, type PrecosReferencia } from "./engine/prices";
import type { EngineOutput, Peca } from "./engine/types";

// V2-5 — Lista unificada de insumos (BOM + custo) no formato de pré-orçamento
// de fornecedor. Fonte única de verdade usada pela tela de resultado e pela
// proposta em PDF.

/** Todas as peças do orçamento (de todos os módulos + elementos contínuos),
 * achatadas num único array — usado pelo plano de corte do orçamento completo. */
export function todasAsPecas(engine: EngineOutput): Peca[] {
  const pecas: Peca[] = engine.porModulo.flatMap((m) => m.pecas);
  for (const g of engine.globais) {
    pecas.push({
      nome: g.tipo === "tampo" ? "Tampo contínuo" : "Rodapé contínuo",
      quantidade: 1,
      material_tipo: "caixa",
      cor: g.cor,
      espessura_mm: g.espessura_mm,
      altura_mm: g.largura_mm,
      largura_mm: g.comprimento_mm,
      area_m2: g.area_m2,
      fita_m: g.fita_m,
      // Veio de chapa (Seção 8, Task 12.5): `PecaLinear` (tampo/rodapé
      // contínuo, motor de templates V2) não carrega `BoxMaterial`, só
      // cor/espessura já resolvidas — não há de onde ler `temVeio`.
      // PLACEHOLDER documentado, mesmo padrão de Placa/Elemento Contínuo:
      // `temVeio: false` (sem veio até esse motor ganhar o campo) e
      // `sentidoVeio: "comprimento"` (ignorado enquanto `temVeio` é false).
      temVeio: false,
      sentidoVeio: "comprimento",
    });
  }
  return pecas;
}

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
