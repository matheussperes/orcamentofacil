import { planoDeCorte } from "./box/cutting";
import type { EngineOutput, GrupoMdf, ItemQtd, Peca, PecaLinear, ResultadoModulo } from "./types";

interface EntradaMdf {
  cor: string;
  espessura_mm: number;
  area_m2: number;
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/**
 * Converte um elemento contínuo (`PecaLinear` — tampo/rodapé) para o shape
 * `Peca` usado pelo bin-packing (`planoDeCorte`) e por listagens achatadas.
 * Fonte única desta tradução — `lib/insumos.ts::todasAsPecas` reaproveita.
 * Sem dado de veio (motor V2 de templates não carrega `BoxMaterial` para
 * elementos contínuos): `temVeio: false` é placeholder, mesmo padrão de
 * `Peca.temVeio` documentado em `./types.ts`.
 */
export function pecaLinearParaPeca(g: PecaLinear): Peca {
  return {
    nome: g.tipo === "tampo" ? "Tampo contínuo" : "Rodapé contínuo",
    quantidade: 1,
    material_tipo: "caixa",
    cor: g.cor,
    espessura_mm: g.espessura_mm,
    altura_mm: g.largura_mm,
    largura_mm: g.comprimento_mm,
    area_m2: g.area_m2,
    fita_m: g.fita_m,
    temVeio: false,
    sentidoVeio: "comprimento",
  };
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

  // Nº de chapas por material: contagem REAL do bin-packing (`planoDeCorte`),
  // não estimativa de área. Uma chapa com baixo aproveitamento (peças que
  // sobram sozinhas numa chapa nova) ainda é uma chapa inteira comprada —
  // `Math.ceil(área / 5.06)` subestimava esse caso porque só via área
  // agregada, sem saber que o encaixe real deixa sobra inteira. Mesmas peças
  // que alimentam o BOM (`mod.pecas`) e os elementos contínuos (convertidos
  // via `pecaLinearParaPeca`) — fonte única com a tela de plano de corte
  // (`lib/lista-material/tipos.ts::montarSnapshotListaMaterial`, que já conta
  // chapas via `grupo.chapas.length` do mesmo `planoDeCorte`).
  const pecasReais: Peca[] = modulos.flatMap((m) => m.pecas);
  for (const g of globais) pecasReais.push(pecaLinearParaPeca(g));
  const chapasPorMaterial = new Map(
    planoDeCorte(pecasReais).map((grupo) => [`${grupo.cor}|${grupo.espessura_mm}`, grupo.chapas.length])
  );

  const mdf: GrupoMdf[] = [];
  for (const [chave, g] of mdfMap.entries()) {
    g.area_m2 = round4(g.area_m2);
    g.area_com_perda_m2 = round4(g.area_m2 * (1 + perdaMdf));
    g.chapas = chapasPorMaterial.get(chave) ?? 0;
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
