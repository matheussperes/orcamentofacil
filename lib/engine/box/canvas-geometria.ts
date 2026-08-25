// V3 — Geometria pura do Canvas 2D do módulo-caixa (extraído de
// `app/components/BoxCanvas.tsx`, Task R.3b — decomposição, sem mudança de
// comportamento). Nenhuma função aqui toca Canvas 2D/JSX: só matemática
// testável (ver `app/components/BoxCanvas.test.ts`).
//
// Modo item único (`geometria`) e modo "conjunto" (`geometriaConjunto` +
// `geometriaHandles` + `geometriaConjuntoBrackets`, Task 13.0/13.2a/13.2b).

import type { BoxModule } from "@/lib/engine/box/types";
import { layoutVaos, type BayRect } from "@/lib/engine/box/tree";
import { alturaDoItem, larguraDoItem, type ModuloOrcamento } from "@/lib/orcamento";
import { derivarY, type AlturasFaixas, type Faixa, type ItemPosicionado } from "@/lib/engine/parede";
import type { Conjunto } from "@/lib/engine/conjunto/types";

export const W = 380;
export const H = 360;

export interface Geo {
  scale: number;
  ox: number;
  oy: number;
  interiorTop: number;
  interiorH: number;
  interiorW: number;
  t: number;
  rects: BayRect[];
}

export function geometria(box: BoxModule): Geo {
  const t = box.caixa.espessura;
  const pad = 24;
  const scale = Math.min((W - pad * 2) / box.largura, (H - pad * 2) / box.altura);
  const ox = (W - box.largura * scale) / 2;
  const oy = (H - box.altura * scale) / 2;
  // A travessa do "inferior" é deitada (como a base): só consome a espessura
  // t da caixa, igual aereo/torre — não os 70mm de profundidade dela (ver
  // TRAVESSA_PROFUNDIDADE em explode.ts). Mesmo cálculo para os 3 tipos.
  const interiorTop = t;
  const interiorH = box.altura - 2 * t;
  const interiorW = box.largura - 2 * t;
  const rects = layoutVaos(box.raiz, t, interiorTop, interiorW, interiorH, t);
  return { scale, ox, oy, interiorTop, interiorH, interiorW, t, rects };
}

/** Um item do modo "conjunto" — o módulo/placa (via `ModuloOrcamento`, que já
 * cobre `custom_box` e `placa`, `lib/orcamento.ts`) e sua posição na parede
 * (`ItemPosicionado`: x + faixa — nunca Y digitado, D-20). */
export interface ItemDoConjunto {
  item: ModuloOrcamento;
  posicao: ItemPosicionado;
}

export interface GeoItemConjunto {
  item: ModuloOrcamento;
  // Task 13.2a — carregado a partir de `posicao.itemId` (não existia antes,
  // Task 13.0 não precisava correlacionar geometria a um item específico).
  // Necessário para o destaque de aviso/erro (ver `itensComAviso` abaixo),
  // que precisa saber QUAL retângulo desenhado corresponde a qual warning.
  itemId: string;
  scale: number;
  ox: number;
  oy: number;
}

// Geometria do modo "conjunto": mesma ideia de `geometria(box)` (escala +
// origem centralizando um retângulo no canvas W×H com padding 24), mas o
// retângulo ajustado é a BOUNDING BOX do conjunto inteiro, não de um módulo
// só. Eixo X: `posicao.x` já é o offset da borda esquerda da parede (mesmo
// referencial dos itens). Eixo Y: `derivarY(faixa, alturas)` devolve a
// altura-do-chão (0 = chão, cresce pra cima) — o INVERSO do sentido do
// canvas (cresce pra baixo) — por isso o topo de cada item (maior
// altura-do-chão do conjunto) vira a origem Y=0 do canvas, e cada item é
// posicionado por (boundingTopo - topoDoItem), não por y direto.
//
// Com 1 item só (faixa "torre", x=0): boundingLeft=0, boundingTopo=altura,
// então totalW/totalH/scale/ox/oy caem exatamente na mesma conta de
// `geometria(box)` — é assim que a task garante o modo lista "pixel-idêntico"
// ao modo item único quando N=1 (ver `BoxCanvas.test.ts`).
export function geometriaConjunto(itens: ItemDoConjunto[], alturas: AlturasFaixas): GeoItemConjunto[] {
  if (itens.length === 0) return [];
  const pad = 24;

  const medidas = itens.map(({ item, posicao }) => {
    const largura = larguraDoItem(item);
    const altura = alturaDoItem(item);
    const y = derivarY(posicao.faixa, alturas);
    return { item, itemId: posicao.itemId, x: posicao.x, largura, y, topo: y + altura };
  });

  const boundingLeft = Math.min(...medidas.map((m) => m.x));
  const boundingRight = Math.max(...medidas.map((m) => m.x + m.largura));
  const boundingTopo = Math.max(...medidas.map((m) => m.topo));
  const boundingBase = Math.min(...medidas.map((m) => m.y));

  const totalW = boundingRight - boundingLeft;
  const totalH = boundingTopo - boundingBase;

  const scale = Math.min((W - pad * 2) / totalW, (H - pad * 2) / totalH);
  const ox = (W - totalW * scale) / 2;
  const oy = (H - totalH * scale) / 2;

  return medidas.map((m) => ({
    item: m.item,
    itemId: m.itemId,
    scale,
    ox: ox + (m.x - boundingLeft) * scale,
    oy: oy + (boundingTopo - m.topo) * scale,
  }));
}

// Task 13.2b — Conjuntos + handle de junção.
//
// `geometriaHandles`/`geometriaConjuntoBrackets` são geometria pura (mesmo
// espírito de `geometriaConjunto`: nada de Canvas aqui, só matemática
// testável), consumidas pelo desenho (`desenharHandle`/`desenharBracketConjunto`,
// em `canvas-desenho-conjunto.ts`) e pelo hit-test de clique (`clique()`, em
// `BoxCanvas.tsx`).

export interface HandleGeo {
  itemIdA: string;
  itemIdB: string;
  cx: number;
  cy: number;
}

/** Um handle por par de itens ADJACENTES (consecutivos por x, dentro da
 * mesma faixa) — independe de os dois já formarem um Conjunto detectado:
 * o handle serve tanto pra UNIR dois itens que hoje não formam bloco (vão
 * maior que a tolerância, ou elemento de parede bloqueante entre eles) quanto
 * pra QUEBRAR dois que formam (ver `aplicarOverrides`,
 * lib/engine/conjunto/detectar.ts:159-172). Por isso esta função não recebe
 * `Conjunto[]` — a lista de pares vem só da posição bruta dos itens, nunca do
 * agrupamento já resolvido.
 *
 * Centro do círculo: X = ponto médio entre a borda direita do item à esquerda
 * e a borda esquerda do item à direita; Y = centro vertical da faixa de
 * sobreposição entre os dois itens (ambos compartilham a mesma base — mesma
 * faixa, mesmo `derivarY` — mas podem ter alturas diferentes, então o centro
 * usa a MENOR altura dos dois, garantindo que o handle sempre caia dentro dos
 * dois retângulos). */
export function geometriaHandles(itens: ItemDoConjunto[], alturas: AlturasFaixas): HandleGeo[] {
  const geos = geometriaConjunto(itens, alturas);
  const geoPorItem = new Map(geos.map((g) => [g.itemId, g]));

  const porFaixa = new Map<Faixa, { itemId: string; x: number }[]>();
  for (const { posicao } of itens) {
    const lista = porFaixa.get(posicao.faixa) ?? [];
    lista.push({ itemId: posicao.itemId, x: posicao.x });
    porFaixa.set(posicao.faixa, lista);
  }

  const handles: HandleGeo[] = [];
  for (const lista of porFaixa.values()) {
    const ordenada = [...lista].sort((a, b) => a.x - b.x);
    for (let i = 0; i < ordenada.length - 1; i++) {
      const geoA = geoPorItem.get(ordenada[i].itemId);
      const geoB = geoPorItem.get(ordenada[i + 1].itemId);
      if (!geoA || !geoB) continue;

      const larguraAPx = larguraDoItem(geoA.item) * geoA.scale;
      const alturaAPx = alturaDoItem(geoA.item) * geoA.scale;
      const alturaBPx = alturaDoItem(geoB.item) * geoB.scale;

      const bordaDireitaA = geoA.ox + larguraAPx;
      const bordaEsquerdaB = geoB.ox;
      const baseA = geoA.oy + alturaAPx;
      const baseB = geoB.oy + alturaBPx;
      const base = (baseA + baseB) / 2; // mesma faixa -> já deveriam coincidir; média por segurança
      const menorAltura = Math.min(alturaAPx, alturaBPx);

      handles.push({
        itemIdA: ordenada[i].itemId,
        itemIdB: ordenada[i + 1].itemId,
        cx: (bordaDireitaA + bordaEsquerdaB) / 2,
        cy: base - menorAltura / 2,
      });
    }
  }
  return handles;
}

export interface ConjuntoBracket {
  conjuntoId: string;
  x1: number;
  x2: number;
  yTopo: number;
  rotulo: string;
}

const BRACKET_OFFSET_PX = 10; // distância do colchete acima do topo do grupo

/** Contorno/colchete de cada Conjunto JÁ RESOLVIDO (detecção automática +
 * overrides, `conjuntosFinais` em `/ambientes`) — ao contrário dos handles,
 * este SÓ desenha sobre os itens que efetivamente estão juntos agora.
 * Bounding box em px = min/max das geometrias por item (`geometriaConjunto`)
 * dos itensIds do Conjunto. */
export function geometriaConjuntoBrackets(
  itens: ItemDoConjunto[],
  alturas: AlturasFaixas,
  conjuntos: Conjunto[]
): ConjuntoBracket[] {
  const geos = geometriaConjunto(itens, alturas);
  const geoPorItem = new Map(geos.map((g) => [g.itemId, g]));

  const brackets: ConjuntoBracket[] = [];
  conjuntos.forEach((conjunto, index) => {
    const geosDoConjunto = conjunto.itensIds
      .map((id) => geoPorItem.get(id))
      .filter((g): g is GeoItemConjunto => g !== undefined);
    if (geosDoConjunto.length === 0) return;

    const x1 = Math.min(...geosDoConjunto.map((g) => g.ox));
    const x2 = Math.max(...geosDoConjunto.map((g) => g.ox + larguraDoItem(g.item) * g.scale));
    const yTopo = Math.min(...geosDoConjunto.map((g) => g.oy));

    brackets.push({
      conjuntoId: conjunto.id,
      x1,
      x2,
      yTopo: yTopo - BRACKET_OFFSET_PX,
      rotulo: `Conjunto ${index + 1} (${conjunto.itensIds.length} módulos)`,
    });
  });
  return brackets;
}
