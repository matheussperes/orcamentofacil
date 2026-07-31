"use client";

import { useEffect, useRef, useState } from "react";
import type { BayNode, BoxModule, FrenteConteudo, GrupoPortas, TipoPuxador } from "@/lib/engine/box/types";
import {
  layoutDivisorias,
  layoutVaos,
  retanguloVaos,
  rotuloConteudo,
  type BayRect,
  type DivisoriaRect,
} from "@/lib/engine/box/tree";
import { corParaHex } from "./ModulePreview";
import { alturaDoItem, corExternaDoItem, larguraDoItem, type ModuloOrcamento } from "@/lib/orcamento";
import { derivarY, type AlturasFaixas, type Faixa, type ItemPosicionado } from "@/lib/engine/parede";
import type { Conjunto } from "@/lib/engine/conjunto/types";

// V3 — Canvas 2D do módulo-caixa, em dois modos:
//  - Laboratório (padrão): vãos com borda técnica, rótulo do conteúdo,
//    seleção múltipla de vãos ou seleção de uma divisória — usado em
//    /modulo, onde o clique importa.
//  - Comercial (`comercial`): visual limpo, sem bordas/rótulos técnicos,
//    com indicadores de portas/gavetas no mesmo estilo do ModulePreview
//    (linhas divisórias finas + marcas de puxador) — usado nos cards do
//    orçamento, onde a imagem precisa ficar "bonitinha".
//
// Em ambos os modos, os grupos de porta (`box.portas`) são desenhados por
// cima dos vãos — são independentes da árvore e podem cobrir 1+ vãos ou a
// caixa inteira.
//
// Task 13.0 — terceiro modo "conjunto": lista de itens posicionados
// (`itens` + `alturas`, em vez de `box`), usado pelas telas futuras da
// Stage 13 (Ambientes/Paredes, Linhas de Proposta) pra desenhar N itens
// lado a lado numa mesma parede/faixa. Sempre "bonito" (sem interatividade,
// sem bordas técnicas — equivalente ao modo comercial) porque não há
// seleção/edição por item nesta task (isso é 13.2). A escala/origem do
// canvas passam a ser calculadas pela bounding box do CONJUNTO, não mais
// por um único módulo — mas com 1 item só (faixa "torre", x=0) o resultado
// é matematicamente idêntico ao modo item único (ver `geometriaConjunto`).

const W = 380;
const H = 360;

// Design-System.md Seção 2.2 (accent) / 6.6 (canvas modo laboratório) — cores
// hardcoded em JS porque o desenho é Canvas 2D, não classes Tailwind. Vão
// hover: contorno tracejado 2px ACCENT. Vão selecionado: contorno sólido 2px
// ACCENT + fundo ACCENT_SUBTLE.
//
// Nota de retrofit (Task 13.3b): fora de escopo desta task — o contrato só
// pediu a migração do contorno de CONJUNTO (`CONJUNTO_COR`, abaixo) para
// `informacao`. Este `ACCENT`/`ACCENT_SUBTLE` (seleção/hover de VÃO no modo
// laboratório de `/modulo`) continua com o hex azul antigo (`#2563EB`/
// `#EFF6FF`), não o novo laranja (`accent.vivid` `#D97706`) — como é hex
// hardcoded (não classe Tailwind), NÃO recolore junto com o flip do token.
// Isso é uma divergência visual real (a seleção de vão fica azul enquanto o
// resto do app vira laranja); registrada aqui para retrofit futuro de
// `/modulo`, fora do escopo de shell+Dashboard desta task.
const ACCENT = "#2563EB";
const ACCENT_SUBTLE = "#EFF6FF";

interface Geo {
  scale: number;
  ox: number;
  oy: number;
  interiorTop: number;
  interiorH: number;
  interiorW: number;
  t: number;
  rects: BayRect[];
}

function geometria(box: BoxModule): Geo {
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

interface GeoItemConjunto {
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
// testável), consumidas pelo desenho (`desenharHandle`/`desenharBracketConjunto`)
// e pelo hit-test de clique (`clique()`, mais abaixo).

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

function linha(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Desenho de UMA frente de gaveta externa: linhas divisórias entre as
 * frentes + marca/perfil de puxador (igual às portas) — reaproveitado no
 * modo comercial e no modo laboratório (antes só tinha um rótulo de texto). */
function desenharGavetaVisual(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frente: Extract<FrenteConteudo, { tipo: "gaveta" }>,
  tipoPuxador: TipoPuxador
) {
  const qtd = Math.max(1, frente.qtd);
  ctx.strokeStyle = "rgba(28,36,48,0.45)";
  ctx.lineWidth = 1;
  for (let i = 1; i < qtd; i++) {
    const gy = y + (h / qtd) * i;
    linha(ctx, x + 3, gy, x + w - 3, gy);
  }
  if (!frente.interna && tipoPuxador !== "sem_puxador") {
    ctx.fillStyle = "rgba(28,36,48,0.5)";
    for (let i = 0; i < qtd; i++) {
      const topoFrente = y + (h / qtd) * i;
      if (tipoPuxador === "perfil") {
        ctx.fillRect(x + 6, topoFrente + 3, w - 12, 3);
      } else {
        const centroY = topoFrente + h / qtd / 2;
        ctx.fillRect(x + w / 2 - 8, centroY - 1.5, 16, 3);
      }
    }
  }
}

/** Desenho "bonito" (modo comercial): recursa a árvore de vãos desenhando só
 * divisórias finas + indicador de gaveta/prateleira — sem bordas técnicas
 * nem texto. Portas não entram aqui (ver `desenharGrupoPortas`). */
function desenharConteudoBonito(
  ctx: CanvasRenderingContext2D,
  node: BayNode,
  x: number,
  y: number,
  w: number,
  h: number,
  tPx: number,
  tipoPuxador: TipoPuxador
) {
  if (node.split !== "none" && node.qtdDivisorias > 0 && node.children) {
    const bays = node.qtdDivisorias + 1;
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    if (node.split === "vertical") {
      const childW = (w - node.qtdDivisorias * tPx) / bays;
      let cx = x;
      node.children.forEach((child, i) => {
        desenharConteudoBonito(ctx, child, cx, y, childW, h, tPx, tipoPuxador);
        cx += childW;
        if (i < node.children!.length - 1) {
          linha(ctx, cx + tPx / 2, y, cx + tPx / 2, y + h);
          cx += tPx;
        }
      });
    } else {
      const childH = (h - node.qtdDivisorias * tPx) / bays;
      let cy = y;
      node.children.forEach((child, i) => {
        desenharConteudoBonito(ctx, child, x, cy, w, childH, tPx, tipoPuxador);
        cy += childH;
        if (i < node.children!.length - 1) {
          linha(ctx, x, cy + tPx / 2, x + w, cy + tPx / 2);
          cy += tPx;
        }
      });
    }
    return;
  }

  const c = node.content;
  // BayContent não tem mais o branch "tamponamento" (Modelo de Domínio, Seção
  // 3.6; Task 12.4) — só resta a forma "espaco".
  if (!c) return;

  const frente = c.frente;
  ctx.strokeStyle = "rgba(28,36,48,0.45)";
  ctx.lineWidth = 1;

  if (frente.tipo === "gaveta") {
    desenharGavetaVisual(ctx, x, y, w, h, frente, tipoPuxador);
  }

  // Prateleiras internas: independentes da frente, sempre desenhadas se houver.
  if (c.prateleiras && c.prateleiras.qtd > 0) {
    const n = c.prateleiras.qtd;
    for (let i = 1; i <= n; i++) {
      const py = y + (h / (n + 1)) * i;
      linha(ctx, x + 3, py, x + w - 3, py);
    }
  }
}

/** Sentido EFETIVO de um painel dentro de um grupo de portas: pares
 * direita/esquerda (abrir não-basculante e correr) saem espelhados — painéis
 * de índice ímpar usam o sentido oposto ao escolhido, pra abrir/puxar
 * simetricamente (como um par clássico de portas de balcão). Basculante não
 * tem par "oposto" com esse sentido, então não espelha. */
function sentidoEfetivo(grupo: GrupoPortas, indice: number): GrupoPortas["sentido"] {
  if (grupo.sentido !== "direita" && grupo.sentido !== "esquerda") return grupo.sentido;
  if (indice % 2 === 0) return grupo.sentido;
  return grupo.sentido === "direita" ? "esquerda" : "direita";
}

/** Marca (ou perfil) de puxador de UM painel, posicionada conforme o sentido
 * (ver descrições em PortasCard). "haste" desenha uma marca curta na posição
 * do puxador; "perfil" estende essa marca pra borda inteira; "sem_puxador"
 * não desenha nada. */
function desenharPuxador(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tipoAbertura: GrupoPortas["tipoAbertura"],
  sentido: GrupoPortas["sentido"],
  tipoPuxador: TipoPuxador
) {
  if (tipoPuxador === "sem_puxador") return;
  ctx.fillStyle = "rgba(28,36,48,0.6)";
  const espessura = 3;
  const comp = 16;
  const margem = 3;
  const perfil = tipoPuxador === "perfil";

  if (tipoAbertura === "correr") {
    const naDireita = sentido === "direita";
    const x0 = naDireita ? x + w - espessura - margem : x + margem;
    if (perfil) ctx.fillRect(x0, y + margem, espessura, h - margem * 2);
    else ctx.fillRect(x0, y + h / 2 - comp / 2, espessura, comp);
    return;
  }

  if (sentido === "basculante_pia" || sentido === "basculante_aereo") {
    const noTopo = sentido === "basculante_pia"; // abre pra baixo -> puxador no topo
    const y0 = noTopo ? y + margem : y + h - espessura - margem;
    if (perfil) ctx.fillRect(x + margem, y0, w - margem * 2, espessura);
    else ctx.fillRect(x + w / 2 - comp / 2, y0, comp, espessura);
    return;
  }

  // "direita": abre pra direita, puxador no topo esquerdo. "esquerda": abre
  // pra esquerda, puxador no topo direito.
  const naDireita = sentido === "esquerda";
  const x0 = naDireita ? x + w - espessura - margem : x + margem;
  if (perfil) ctx.fillRect(x0, y + margem, espessura, h - margem * 2);
  else ctx.fillRect(x0, y + margem, espessura, comp);
}

/** Desenha um grupo de porta (retângulo já em px) — linhas divisórias entre
 * os painéis + marca/perfil de puxador em cada um (espelhado quando o par é
 * direita/esquerda, ver `sentidoEfetivo`). */
function desenharGrupoPortas(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  grupo: GrupoPortas,
  tipoPuxador: TipoPuxador
) {
  const { x, y, w, h } = rect;
  const qtd = Math.max(1, grupo.qtd);
  const larguraPainel = w / qtd;

  ctx.strokeStyle = "rgba(28,36,48,0.55)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  for (let i = 1; i < qtd; i++) {
    const px = x + larguraPainel * i;
    linha(ctx, px, y + 2, px, y + h - 2);
  }
  for (let i = 0; i < qtd; i++) {
    desenharPuxador(ctx, x + larguraPainel * i, y, larguraPainel, h, grupo.tipoAbertura, sentidoEfetivo(grupo, i), tipoPuxador);
  }
}

/** Retângulo (mm) coberto por um grupo de porta — caixa inteira ou a união
 * dos vãos alvo. Reaproveitado pro desenho e pro hit-test de clique. */
function retanguloDoGrupo(
  box: BoxModule,
  grupo: GrupoPortas,
  g: Geo,
  t: number
): { x: number; y: number; w: number; h: number } | null {
  if (grupo.alvo.tipo === "caixa_inteira") {
    return { x: t, y: g.interiorTop, w: g.interiorW, h: g.interiorH };
  }
  return retanguloVaos(box.raiz, new Set(grupo.alvo.vaoIds), t, g.interiorTop, g.interiorW, g.interiorH, t);
}

/** Desenha UM item do conjunto (já com `scale`/`ox`/`oy` resolvidos por
 * `geometriaConjunto`). `custom_box`: reaproveita as MESMAS funções de
 * desenho do modo item único (`desenharConteudoBonito`, `desenharGrupoPortas`,
 * `retanguloDoGrupo`, `corParaHex`) — mesma sequência do modo comercial
 * (carcaça + conteúdo bonito + portas + tamponamento), sem bordas técnicas
 * nem rótulos (não há seleção por item nesta task). `placa` (Task 13.1 ainda
 * não tem editor/render próprio): retângulo simples preenchido pela cor do
 * material — nada além disso, por escopo desta task. */
function desenharItemConjunto(ctx: CanvasRenderingContext2D, g: GeoItemConjunto) {
  const { item, scale, ox, oy } = g;
  const px = (mmX: number) => ox + mmX * scale;
  const py = (mmY: number) => oy + mmY * scale;

  if (item.origem === "placa") {
    const largura = larguraDoItem(item);
    const altura = alturaDoItem(item);
    ctx.fillStyle = corParaHex(corExternaDoItem(item));
    ctx.fillRect(px(0), py(0), largura * scale, altura * scale);
    return;
  }

  const box = item.box;
  const t = box.caixa.espessura;
  const interiorTop = t;
  const interiorH = box.altura - 2 * t;
  const interiorW = box.largura - 2 * t;
  const geo: Geo = { scale, ox, oy, interiorTop, interiorH, interiorW, t, rects: [] };

  ctx.fillStyle = corParaHex(box.caixa.cor);
  ctx.fillRect(px(0), py(0), box.largura * scale, box.altura * scale);
  ctx.strokeStyle = "#1c2430";
  ctx.lineWidth = 2;
  ctx.strokeRect(px(0), py(0), box.largura * scale, box.altura * scale);

  desenharConteudoBonito(
    ctx,
    box.raiz,
    px(t),
    py(interiorTop),
    interiorW * scale,
    interiorH * scale,
    t * scale,
    box.puxador
  );

  for (const grupo of box.portas) {
    const rectMm = retanguloDoGrupo(box, grupo, geo, t);
    if (!rectMm) continue;
    const rectPx = { x: px(rectMm.x), y: py(rectMm.y), w: rectMm.w * scale, h: rectMm.h * scale };
    desenharGrupoPortas(ctx, rectPx, grupo, box.puxador);
  }
}

// Task 13.2a — Nota de Escopo do contrato: `BoxCanvasPropsConjunto` (Task
// 13.0) não tinha nenhuma prop de interatividade/destaque porque não havia
// consumidor real ainda. Esta task É o primeiro consumidor (`/ambientes`) e
// precisa destacar visualmente o item com erro/aviso (`EngineWarning.
// moduloId` -> `ItemPosicionado.itemId`). Decisão de implementação (rota 1
// das duas propostas pelo contrato): estender `BoxCanvasPropsConjunto` com
// `itensComAviso` e desenhar o contorno DENTRO do canvas, reaproveitando
// `geometriaConjunto` (que agora carrega `itemId`) em vez de um overlay
// HTML/SVG por cima — evita duplicar o cálculo de geometria numa segunda
// camada de posicionamento.
const ERRO = "#DC2626"; // Design-System 2.3 (semânticas — erro)
const ERRO_SUBTLE = "rgba(220,38,38,0.12)";
const AVISO = "#D97706"; // Design-System 2.3 (semânticas — aviso)
const AVISO_SUBTLE = "rgba(217,119,6,0.12)";

function desenharDestaqueItem(ctx: CanvasRenderingContext2D, g: GeoItemConjunto, severidade: "erro" | "aviso") {
  const { item, scale, ox, oy } = g;
  const largura = larguraDoItem(item) * scale;
  const altura = alturaDoItem(item) * scale;
  const cor = severidade === "erro" ? ERRO : AVISO;
  ctx.fillStyle = severidade === "erro" ? ERRO_SUBTLE : AVISO_SUBTLE;
  ctx.fillRect(ox, oy, largura, altura);
  ctx.strokeStyle = cor;
  ctx.lineWidth = 3;
  ctx.strokeRect(ox + 1.5, oy + 1.5, largura - 3, altura - 3);
}

// Task 13.2b — Design-System.md Seção 9.3 especifica `stroke-informacao`
// para o contorno/colchete do conjunto e para o handle de junção.
//
// Task 13.3b (retrofit v3, migração executada): `tailwind.config.ts` agora
// repointa `accent` para laranja e adiciona o token `informacao` (Seção 2.4)
// com o hex que ERA o `accent` azul da v2 (`#2563EB`). Esta constante já
// usava esse hex antes da migração — o valor não muda, só o nome/comentário,
// para deixar explícito que este contorno é semanticamente `informacao`
// (não mais uma referência histórica a `accent`). Continua desenhado como
// hex puro (Canvas 2D, não classe Tailwind), mas agora aponta pro token
// certo: se `informacao` mudar de valor no Design-System no futuro, este
// hex precisa acompanhar.
const CONJUNTO_COR = "#2563EB"; // informacao (Design-System v3, Seção 2.4)

const HANDLE_RAIO_PX = 10; // círculo de 20px de diâmetro (Design-System 9.3)
const BRACKET_TICK_PX = 6; // altura da perna do colchete nas extremidades

function desenharBracketConjunto(ctx: CanvasRenderingContext2D, bracket: ConjuntoBracket) {
  ctx.strokeStyle = CONJUNTO_COR;
  ctx.lineWidth = 1.5;
  linha(ctx, bracket.x1, bracket.yTopo, bracket.x2, bracket.yTopo);
  linha(ctx, bracket.x1, bracket.yTopo, bracket.x1, bracket.yTopo + BRACKET_TICK_PX);
  linha(ctx, bracket.x2, bracket.yTopo, bracket.x2, bracket.yTopo + BRACKET_TICK_PX);

  ctx.fillStyle = CONJUNTO_COR;
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(bracket.rotulo, (bracket.x1 + bracket.x2) / 2, bracket.yTopo - 4);
}

/** Ícone de elo (Design-System 9.3 pede `Link`/`Unlink` do lucide, 12px) —
 * Canvas 2D não desenha componentes React/SVG do lucide diretamente (só path
 * data manual), então aqui aproxima-se com duas formas vetoriais simples
 * (mesmo padrão já usado neste arquivo pra dobradiça/puxador: forma
 * reconhecível, não ícone fotográfico). "Unido": dois elos encostados.
 * "Quebrado": os mesmos dois elos com um vão visível entre eles. */
function desenharIconeElo(ctx: CanvasRenderingContext2D, cx: number, cy: number, unido: boolean) {
  const w = 6;
  const h = 3.5;
  const raio = 1.5;
  const gap = unido ? 0.5 : 3.5;

  ctx.strokeStyle = CONJUNTO_COR;
  ctx.lineWidth = 1.3;
  for (const sinal of [-1, 1]) {
    const x = cx + sinal * (gap / 2 + (sinal < 0 ? w : 0));
    ctx.beginPath();
    ctx.roundRect(x, cy - h / 2, w, h, raio);
    ctx.stroke();
  }
}

function desenharHandle(ctx: CanvasRenderingContext2D, h: HandleGeo, unido: boolean) {
  ctx.beginPath();
  ctx.arc(h.cx, h.cy, HANDLE_RAIO_PX, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF"; // cinza-0 (Design-System 9.3)
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = CONJUNTO_COR;
  ctx.stroke();
  desenharIconeElo(ctx, h.cx, h.cy, unido);
}

/** Estado atual do par (unido/quebrado): verifica se os dois itens estão no
 * MESMO Conjunto já resolvido (detecção automática + overrides,
 * `conjuntosFinais` em `/ambientes`) — nunca reconstrói essa lógica aqui
 * (é `aplicarOverrides`, lib/engine/conjunto/detectar.ts, quem decide). */
function parEstaUnido(itemIdA: string, itemIdB: string, conjuntos: Conjunto[]): boolean {
  return conjuntos.some((c) => c.itensIds.includes(itemIdA) && c.itensIds.includes(itemIdB));
}

function desenharConjunto(
  ctx: CanvasRenderingContext2D,
  itens: ItemDoConjunto[],
  alturas: AlturasFaixas,
  itensComAviso?: Map<string, "erro" | "aviso">,
  conjuntos?: Conjunto[]
) {
  for (const g of geometriaConjunto(itens, alturas)) {
    desenharItemConjunto(ctx, g);
    const severidade = itensComAviso?.get(g.itemId);
    if (severidade) desenharDestaqueItem(ctx, g, severidade);
  }

  if (!conjuntos) return; // sem `conjuntos`, modo conjunto se comporta como nas Tasks 13.0/13.2a

  for (const bracket of geometriaConjuntoBrackets(itens, alturas, conjuntos)) {
    desenharBracketConjunto(ctx, bracket);
  }
  // Handles independem de já formarem Conjunto (ver `geometriaHandles`) — só
  // o ícone (unido/quebrado) depende do estado atual de `conjuntos`.
  for (const h of geometriaHandles(itens, alturas)) {
    desenharHandle(ctx, h, parEstaUnido(h.itemIdA, h.itemIdB, conjuntos));
  }
}

export interface DivisaoSelecionada {
  parentId: string;
  indice: number;
}

export type ModoSelecao = "vaos" | "divisoes" | "portas" | "gavetas";

// Modo item único (`box`) — props de interatividade/seleção completas, como
// já existia. Modo conjunto (`itens` + `alturas`) — Task 13.0, aditivo: sem
// nenhuma prop de interatividade (não há seleção por item nesta task, 13.2).
// União com os campos do outro modo explicitamente `undefined` (em vez de
// discriminada por tag própria) pra poder ler qualquer prop direto do objeto
// sem narrowing manual em cada uso abaixo.
interface BoxCanvasPropsItemUnico {
  box: BoxModule;
  itens?: undefined;
  alturas?: undefined;
  itensComAviso?: undefined;
  conjuntos?: undefined;
  onToggleJuncao?: undefined;
  /** Modo bonito para cards do orçamento — sem bordas/rótulos técnicos, não interativo. */
  comercial?: boolean;
  modoSelecao?: ModoSelecao;
  vaosSelecionados?: string[];
  onToggleVao?: (id: string) => void;
  divisaoSelecionada?: DivisaoSelecionada | null;
  onSelecionarDivisoria?: (sel: DivisaoSelecionada) => void;
  /** Modo "portas": seleciona um GRUPO de porta existente (pra editar/excluir). */
  portaSelecionada?: string | null;
  onSelecionarPorta?: (id: string) => void;
  /** Modo "gavetas": seleciona o VÃO cujo conteúdo de gaveta vai editar/excluir. */
  vaoGavetaSelecionado?: string | null;
  onSelecionarVaoGaveta?: (id: string) => void;
  /** Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — ver comentário
   * completo na prop homônima de `BoxCanvasPropsConjunto`, abaixo. */
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

interface BoxCanvasPropsConjunto {
  box?: undefined;
  /** Lista de itens posicionados (conjunto) — cada um com sua faixa/x; Y é
   * sempre derivado via `derivarY`, nunca digitado (D-20). */
  itens: ItemDoConjunto[];
  /** As 4 alturas do perfil da organização, necessárias pra derivar Y a
   * partir da faixa de cada item (`lib/engine/parede::AlturasFaixas`). */
  alturas: AlturasFaixas;
  /** Task 13.2a — item.itemId -> pior severidade de warning que o atinge
   * (`EngineWarning.moduloId` é o `ItemPosicionado.itemId`). Desenha contorno
   * + fundo tintado por cima do item (ver `desenharDestaqueItem`). Opcional:
   * sem esta prop, o modo conjunto se comporta exatamente como na Task 13.0. */
  itensComAviso?: Map<string, "erro" | "aviso">;
  /** Task 13.2b — Conjuntos JÁ RESOLVIDOS (`aplicarOverrides` sobre
   * `detectarConjuntos`, ver lib/engine/conjunto/detectar.ts). Desenha o
   * contorno/colchete (Design-System 9.3) acima de cada Conjunto e decide o
   * ícone (unido/quebrado) de cada handle entre pares adjacentes. Opcional:
   * sem esta prop, o modo conjunto se comporta como nas Tasks 13.0/13.2a (sem
   * contorno de conjunto nem handles). */
  conjuntos?: Conjunto[];
  /** Task 13.2b — chamado ao clicar num handle de junção (círculo entre dois
   * itens adjacentes) pra alternar união/quebra do par. Handles só recebem
   * hit-testing de clique (`clique()`, abaixo) quando ESTA prop E `conjuntos`
   * estão presentes juntas — com só `conjuntos`, os handles são puramente
   * visuais (preserva o early-return da Task 13.0 quando as props novas não
   * são passadas). */
  onToggleJuncao?: (itemIdA: string, itemIdB: string) => void;
  comercial?: undefined;
  modoSelecao?: undefined;
  vaosSelecionados?: undefined;
  onToggleVao?: undefined;
  divisaoSelecionada?: undefined;
  onSelecionarDivisoria?: undefined;
  portaSelecionada?: undefined;
  onSelecionarPorta?: undefined;
  vaoGavetaSelecionado?: undefined;
  onSelecionarVaoGaveta?: undefined;
  /** Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — mudança pequena e
   * ADITIVA: `BoxCanvas` não expunha o `<canvas>` interno pro caller (só
   * usava a `ref` internamente). A aba "Proposta" precisa capturar o
   * `<canvas>` do modo conjunto para gerar a imagem de render de cada Linha
   * de Proposta (`canvas.toDataURL('image/png')` — ver
   * `components/orcamento/LinhaPropostaCard.tsx`). Chamado a cada commit
   * (não só na montagem) com o elemento atual — sem esta prop, nenhum
   * comportamento muda (nenhum consumidor existente a passa: `/modulo`,
   * `/ambientes`, Corte&Material). Existe também no modo item único
   * (`BoxCanvasPropsItemUnico`, acima) pela mesma razão de simetria de tipo
   * já usada nas outras props (`comercial`, etc.), embora esta task só use o
   * modo conjunto. */
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

type BoxCanvasProps = BoxCanvasPropsItemUnico | BoxCanvasPropsConjunto;

export function BoxCanvas(props: BoxCanvasProps) {
  const {
    box,
    itens,
    alturas,
    itensComAviso,
    conjuntos,
    onToggleJuncao,
    comercial: comercialProp = false,
    modoSelecao = "vaos",
    vaosSelecionados = [],
    onToggleVao,
    divisaoSelecionada = null,
    onSelecionarDivisoria,
    portaSelecionada = null,
    onSelecionarPorta,
    vaoGavetaSelecionado = null,
    onSelecionarVaoGaveta,
    onCanvasReady,
  } = props;
  // Conjunto é sempre "bonito"/não interativo por padrão (equivalente a
  // `comercial`) — a ÚNICA interatividade do modo conjunto é o handle de
  // junção (Task 13.2b), tratado à parte em `clique()`, não por este flag.
  const comercial = itens ? true : comercialProp;
  // Task 13.2b — só os handles são clicáveis no modo conjunto, e só quando
  // as duas props novas estão presentes (ver comentário de `onToggleJuncao`).
  const handlesInterativos = Boolean(itens && conjuntos && onToggleJuncao);
  const ref = useRef<HTMLCanvasElement>(null);
  // Vão sob o mouse (só nos modos "vaos"/"gavetas", que operam sobre os
  // mesmos retângulos de g.rects) — puramente apresentacional, não afeta
  // onToggleVao/modoSelecao/vaosSelecionados.
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Task 13.6a — entrega o `<canvas>` pro caller (ver comentário da prop).
  // Efeito PRÓPRIO, separado do de desenho abaixo: só precisa rodar quando a
  // referência do elemento muda (nunca, na prática, com `ref` de
  // `useRef` — o nó DOM é estável entre renders), mas roda a cada commit
  // desta função (`onCanvasReady` como única dependência) para não exigir
  // que o caller memoize um `ref` próprio.
  useEffect(() => {
    onCanvasReady?.(ref.current);
  }, [onCanvasReady]);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    if (itens && alturas) {
      desenharConjunto(ctx, itens, alturas, itensComAviso, conjuntos);
      return;
    }
    if (!box) return;

    const g = geometria(box);
    const px = (mmX: number) => g.ox + mmX * g.scale;
    const py = (mmY: number) => g.oy + mmY * g.scale;
    const t = box.caixa.espessura;

    // Carcaça (contorno do módulo).
    ctx.fillStyle = corParaHex(box.caixa.cor);
    ctx.fillRect(px(0), py(0), box.largura * g.scale, box.altura * g.scale);
    ctx.strokeStyle = "#1c2430";
    ctx.lineWidth = 2;
    ctx.strokeRect(px(0), py(0), box.largura * g.scale, box.altura * g.scale);

    if (comercial) {
      desenharConteudoBonito(
        ctx,
        box.raiz,
        px(t),
        py(g.interiorTop),
        g.interiorW * g.scale,
        g.interiorH * g.scale,
        t * g.scale,
        box.puxador
      );
    } else {
      // Vãos-folha (modo laboratório): bordas técnicas + rótulo do conteúdo.
      for (const r of g.rects) {
        const x = px(r.x);
        const y = py(r.y);
        const w = r.w * g.scale;
        const h = r.h * g.scale;
        const sel =
          (modoSelecao === "vaos" && vaosSelecionados.includes(r.id)) ||
          (modoSelecao === "gavetas" && vaoGavetaSelecionado === r.id);
        const hover =
          !sel && hoverId === r.id && (modoSelecao === "vaos" || modoSelecao === "gavetas");

        ctx.fillStyle = sel ? ACCENT_SUBTLE : "#ffffff";
        ctx.fillRect(x, y, w, h);
        ctx.setLineDash(hover ? [4, 3] : []);
        ctx.strokeStyle = sel || hover ? ACCENT : "#94a3b8";
        ctx.lineWidth = sel || hover ? 2 : 1;
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        // Gaveta ganha representação visual (linhas + puxador), igual às
        // portas — não só o texto. Outros conteúdos (prateleiras/vazio)
        // continuam com o rótulo de texto.
        const conteudo = r.node.content;
        if (conteudo?.tipo === "espaco" && conteudo.frente.tipo === "gaveta") {
          desenharGavetaVisual(ctx, x, y, w, h, conteudo.frente, box.puxador);
          if (conteudo.prateleiras && conteudo.prateleiras.qtd > 0) {
            ctx.fillStyle = "#1c2430";
            ctx.font = "10px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${conteudo.prateleiras.qtd} prat.`, x + w / 2, y + h - 6);
          }
        } else {
          const rotulo = rotuloConteudo(r.node);
          if (rotulo !== "vazio") {
            ctx.fillStyle = "#1c2430";
            ctx.font = "11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(rotulo, x + w / 2, y + h / 2 + 4);
          }
        }
      }

      // Divisórias: no modo "Selecionar divisões", destaca a divisória
      // atualmente selecionada (as demais já aparecem como a borda entre
      // vãos vizinhos, não precisam de traço extra).
      if (modoSelecao === "divisoes" && divisaoSelecionada) {
        const divisorias = layoutDivisorias(box.raiz, t, g.interiorTop, g.interiorW, g.interiorH, t);
        const d = divisorias.find(
          (d) => d.parentId === divisaoSelecionada.parentId && d.indice === divisaoSelecionada.indice
        );
        if (d) {
          ctx.fillStyle = ACCENT;
          ctx.fillRect(px(d.x) - 1.5, py(d.y) - 1.5, Math.max(d.w * g.scale, 1) + 3, Math.max(d.h * g.scale, 1) + 3);
        }
      }
    }

    // Grupos de porta: independentes da árvore, desenhados por cima dos vãos
    // (cobrem 1+ vãos selecionados no laboratório, ou a caixa inteira).
    for (const grupo of box.portas) {
      const rectMm = retanguloDoGrupo(box, grupo, g, t);
      if (!rectMm) continue;
      const rectPx = { x: px(rectMm.x), y: py(rectMm.y), w: rectMm.w * g.scale, h: rectMm.h * g.scale };
      desenharGrupoPortas(ctx, rectPx, grupo, box.puxador);
      // Modo "Selecionar Portas": destaca o grupo selecionado por cima.
      if (!comercial && modoSelecao === "portas" && portaSelecionada === grupo.id) {
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 2;
        ctx.strokeRect(rectPx.x + 2, rectPx.y + 2, rectPx.w - 4, rectPx.h - 4);
      }
    }
  }, [box, itens, alturas, itensComAviso, conjuntos, comercial, modoSelecao, vaosSelecionados, divisaoSelecionada, portaSelecionada, vaoGavetaSelecionado, hoverId]);

  function clique(e: React.MouseEvent<HTMLCanvasElement>) {
    // Task 13.2b — modo conjunto: a ÚNICA exceção ao "não interativo" da Task
    // 13.0 é o handle de junção, e só quando `conjuntos`+`onToggleJuncao`
    // estão presentes juntas (`handlesInterativos`). Sem essas props novas, o
    // `return` abaixo preserva EXATAMENTE o comportamento anterior (nenhum
    // clique faz nada no modo conjunto) — não passa para o hit-test de `box`
    // logo em seguida, que não existe nesse modo (`box` é sempre `undefined`
    // quando `itens` está presente).
    if (itens && alturas) {
      if (handlesInterativos) {
        const canvas = ref.current;
        if (!canvas) return;
        const rectEl = canvas.getBoundingClientRect();
        const cx = ((e.clientX - rectEl.left) / rectEl.width) * W;
        const cy = ((e.clientY - rectEl.top) / rectEl.height) * H;
        for (const h of geometriaHandles(itens, alturas)) {
          const dx = cx - h.cx;
          const dy = cy - h.cy;
          if (dx * dx + dy * dy <= HANDLE_RAIO_PX * HANDLE_RAIO_PX) {
            onToggleJuncao?.(h.itemIdA, h.itemIdB);
            return;
          }
        }
      }
      return;
    }

    if (comercial || !box) return; // preview comercial não é interativo
    const canvas = ref.current;
    if (!canvas) return;
    const rectEl = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rectEl.left) / rectEl.width) * W;
    const cy = ((e.clientY - rectEl.top) / rectEl.height) * H;
    const g = geometria(box);
    const t = box.caixa.espessura;

    if (modoSelecao === "divisoes") {
      const PAD = 5;
      const divisorias: DivisoriaRect[] = layoutDivisorias(box.raiz, t, g.interiorTop, g.interiorW, g.interiorH, t);
      for (const d of divisorias) {
        const x = g.ox + d.x * g.scale;
        const y = g.oy + d.y * g.scale;
        const w = d.w * g.scale;
        const h = d.h * g.scale;
        if (cx >= x - PAD && cx <= x + w + PAD && cy >= y - PAD && cy <= y + h + PAD) {
          onSelecionarDivisoria?.({ parentId: d.parentId, indice: d.indice });
          return;
        }
      }
      return;
    }

    if (modoSelecao === "portas") {
      for (const grupo of box.portas) {
        const rectMm = retanguloDoGrupo(box, grupo, g, t);
        if (!rectMm) continue;
        const x = g.ox + rectMm.x * g.scale;
        const y = g.oy + rectMm.y * g.scale;
        const w = rectMm.w * g.scale;
        const h = rectMm.h * g.scale;
        if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) {
          onSelecionarPorta?.(grupo.id);
          return;
        }
      }
      return;
    }

    if (modoSelecao === "gavetas") {
      for (const r of g.rects) {
        const x = g.ox + r.x * g.scale;
        const y = g.oy + r.y * g.scale;
        if (cx >= x && cx <= x + r.w * g.scale && cy >= y && cy <= y + r.h * g.scale) {
          onSelecionarVaoGaveta?.(r.id);
          return;
        }
      }
      return;
    }

    for (const r of g.rects) {
      const x = g.ox + r.x * g.scale;
      const y = g.oy + r.y * g.scale;
      if (cx >= x && cx <= x + r.w * g.scale && cy >= y && cy <= y + r.h * g.scale) {
        onToggleVao?.(r.id);
        return;
      }
    }
  }

  /** Só atualiza o vão sob o mouse (feedback visual de hover) — não dispara
   * nenhum callback de seleção. Restrito aos modos "vaos"/"gavetas", que
   * operam sobre os mesmos retângulos de g.rects. */
  function moverMouse(e: React.MouseEvent<HTMLCanvasElement>) {
    if (comercial || !box) return;
    if (modoSelecao !== "vaos" && modoSelecao !== "gavetas") {
      if (hoverId !== null) setHoverId(null);
      return;
    }
    const canvas = ref.current;
    if (!canvas) return;
    const rectEl = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rectEl.left) / rectEl.width) * W;
    const cy = ((e.clientY - rectEl.top) / rectEl.height) * H;
    const g = geometria(box);
    let encontrado: string | null = null;
    for (const r of g.rects) {
      const x = g.ox + r.x * g.scale;
      const y = g.oy + r.y * g.scale;
      if (cx >= x && cx <= x + r.w * g.scale && cy >= y && cy <= y + r.h * g.scale) {
        encontrado = r.id;
        break;
      }
    }
    if (encontrado !== hoverId) setHoverId(encontrado);
  }

  function sairMouse() {
    if (hoverId !== null) setHoverId(null);
  }

  return (
    <div className="max-w-full rounded-md border border-cinza-200 bg-cinza-50 p-2">
      <canvas
        ref={ref}
        width={W}
        height={H}
        onClick={clique}
        onMouseMove={moverMouse}
        onMouseLeave={sairMouse}
        style={{
          display: "block",
          width: "100%",
          maxWidth: W,
          height: "auto",
          // Task 13.2b — modo conjunto com handles interativos ganha cursor
          // pointer (feedback de clicabilidade dos handles), mesmo sendo
          // `comercial`; sem `handlesInterativos`, comportamento inalterado.
          cursor: comercial && !handlesInterativos ? "default" : "pointer",
        }}
      />
    </div>
  );
}
