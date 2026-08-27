import type { AlturasFaixas, Faixa, Parede } from "@/lib/engine/parede";
import { derivarY } from "@/lib/engine/parede";
import type { ItemDoConjunto } from "@/app/components/BoxCanvas";
import { alturaDoItem, larguraDoItem } from "@/lib/orcamento";

// Task R.5a — extraído de `ElevacaoParede.tsx` (decomposição pura, teto de
// 400 linhas/arquivo, zero mudança de comportamento): só a geometria pura
// (testável sem SVG, ver `ElevacaoParede.test.ts`). O componente reexporta
// tudo daqui (mesmo padrão de `AmbientesLab.tsx` → `AmbientesLab.helpers.ts`).

export interface FaixaBanda {
  faixa: Faixa;
  y0: number;
  y1: number;
}

// "torre" não é uma banda horizontal distinta — ocupa do chão ao pé-direito
// por natureza (mesma decisão de `derivarY`/`TETO_DA_FAIXA` em
// lib/engine/parede/validar.ts). Por isso as 3 bandas empilhadas cobrem só
// inferior/bancada/aereo; "torre" é indicada à parte por um bracket vertical
// de altura inteira (ver `BracketTorre` no componente), não por uma 4ª banda
// com limites próprios que não existem no modelo de domínio.
export function bandasFaixas(alturas: AlturasFaixas): FaixaBanda[] {
  return [
    { faixa: "inferior", y0: 0, y1: alturas.alturaBancada },
    { faixa: "bancada", y0: alturas.alturaBancada, y1: alturas.alturaInstalacaoAereo },
    { faixa: "aereo", y0: alturas.alturaInstalacaoAereo, y1: alturas.peDireito },
  ];
}

export interface ItemDesenhado {
  item: ItemDoConjunto;
  rect: { x: number; y: number; w: number; h: number }; // em mm, coords de DADOS
}

/** Geometria pura dos módulos posicionados (`parede.itens`), mesma fonte de
 * verdade do resto do motor (`derivarY`/`larguraDoItem`/`alturaDoItem`) — sem
 * fórmula nova, só empacota o retângulo em mm pra `retanguloParaPx` desenhar. */
export function retangulosDosItens(itens: ItemDoConjunto[], alturas: AlturasFaixas): ItemDesenhado[] {
  return itens.map((it) => ({
    item: it,
    rect: {
      x: it.posicao.x,
      y: derivarY(it.posicao.faixa, alturas),
      w: larguraDoItem(it.item),
      h: alturaDoItem(it.item),
    },
  }));
}

export interface CotaFaixa {
  faixa: Faixa;
  altura: number; // mm — y1 - y0 da banda
  yBase: number; // mm
  yTopo: number; // mm
}

// Task 2.27 (RF-27) — geometria pura das cotas de altura por faixa, extraída
// para ser testável sem SVG: cada banda já traz seus limites (`bandasFaixas`
// acima), aqui só empacota o valor cotado (`y1 - y0`) junto com os limites
// em mm que o desenho usa pra posicionar linha/seta/rótulo.
export function cotasFaixas(bandas: FaixaBanda[]): CotaFaixa[] {
  return bandas.map((b) => ({ faixa: b.faixa, altura: b.y1 - b.y0, yBase: b.y0, yTopo: b.y1 }));
}

export interface LayoutElevacao {
  scale: number;
  larguraPx: number;
  alturaPx: number;
  bandas: FaixaBanda[];
}

/** Geometria pura: escala que cabe a parede (largura x altura, mm) numa
 * caixa de `maxW`×`maxH` px, preservando proporção — mesma ideia de
 * `geometria(box)`/`geometriaConjunto` em BoxCanvas.tsx. Guard contra
 * parede com dimensão zero/negativa (evita Infinity/NaN propagando pro
 * desenho). */
export function layoutElevacao(
  parede: Pick<Parede, "largura" | "altura">,
  alturas: AlturasFaixas,
  maxW: number,
  maxH: number
): LayoutElevacao {
  const scale =
    parede.largura > 0 && parede.altura > 0 ? Math.min(maxW / parede.largura, maxH / parede.altura) : 0;
  return {
    scale,
    larguraPx: parede.largura * scale,
    alturaPx: parede.altura * scale,
    bandas: bandasFaixas(alturas),
  };
}

/** Converte um retângulo em coordenadas de DADOS (mm; y cresce do chão pra
 * cima) para um retângulo em pixels SVG (y cresce do topo pra baixo),
 * usando a escala/altura já resolvidas por `layoutElevacao`. Reaproveitada
 * tanto pelos elementos de parede quanto pelas bandas de faixa. */
export function retanguloParaPx(
  x: number,
  y: number,
  w: number,
  h: number,
  layout: Pick<LayoutElevacao, "scale" | "alturaPx">
): { x: number; y: number; w: number; h: number } {
  return {
    x: x * layout.scale,
    y: layout.alturaPx - (y + h) * layout.scale,
    w: w * layout.scale,
    h: h * layout.scale,
  };
}
