import type { EngineOutput, GrupoMdf, ItemQtd, PecaLinear, ResultadoModulo } from "./types";

const AREA_CHAPA_M2 = 2.75 * 1.84; // 5.06 m² (chapa comercial padrão)

interface EntradaMdf {
  cor: string;
  espessura_mm: number;
  area_m2: number;
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/**
 * Consolidação de MDF (por cor×espessura), fita e ferragens (doc 04, etapa 5).
 * Extraído do motor de templates (V1, `lib/engine/engine.ts`) porque é
 * COMPARTILHADO: o caminho de caixa (box-builder V3, `lib/orcamento.ts`)
 * também depende desta função para consolidar seu BOM. Não remover junto
 * com o resto do motor V1 (Task 10.1, docs/Backlog.md).
 */
export function consolidarResultados(
  modulos: ResultadoModulo[],
  globais: PecaLinear[],
  perdaMdf: number
): EngineOutput["consolidado"] {
  const mdfMap = new Map<string, GrupoMdf>();
  const ferragensMap = new Map<string, number>();
  let fitaTotalM = 0;

  const somaMdf = ({ cor, espessura_mm, area_m2 }: EntradaMdf) => {
    const chave = `${cor}|${espessura_mm}`;
    const g =
      mdfMap.get(chave) ??
      { cor, espessura_mm, area_m2: 0, area_com_perda_m2: 0, chapas: 0 };
    g.area_m2 += area_m2;
    mdfMap.set(chave, g);
  };

  for (const mod of modulos) {
    fitaTotalM += mod.fitaM;
    for (const peca of mod.pecas) somaMdf(peca);
    for (const f of mod.ferragens) {
      ferragensMap.set(f.item, (ferragensMap.get(f.item) ?? 0) + f.quantidade);
    }
  }

  for (const g of globais) {
    fitaTotalM += g.fita_m;
    somaMdf(g);
  }

  const mdf: GrupoMdf[] = [];
  for (const g of mdfMap.values()) {
    g.area_m2 = round4(g.area_m2);
    g.area_com_perda_m2 = round4(g.area_m2 * (1 + perdaMdf));
    g.chapas = Math.ceil(g.area_com_perda_m2 / AREA_CHAPA_M2);
    mdf.push(g);
  }
  mdf.sort((a, b) =>
    a.cor === b.cor ? a.espessura_mm - b.espessura_mm : a.cor.localeCompare(b.cor)
  );

  const ferragens: ItemQtd[] = [...ferragensMap.entries()]
    .map(([item, quantidade]) => ({ item, quantidade }))
    .sort((a, b) => a.item.localeCompare(b.item));

  return { mdf, fitaTotalM: round4(fitaTotalM), ferragens };
}
