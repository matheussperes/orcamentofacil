// V3 — Desenho Canvas 2D do modo "conjunto" de `BoxCanvas` (lista de itens
// posicionados lado a lado numa parede/faixa — Task 13.0/13.2a/13.2b).
// Extraído de `app/components/BoxCanvas.tsx` (Task R.3b — decomposição, sem
// mudança de comportamento).

import type { Conjunto } from "@/lib/engine/conjunto/types";
import { alturaDoItem, corExternaDoItem, larguraDoItem } from "@/lib/orcamento";
import type { AlturasFaixas } from "@/lib/engine/parede";
import type { TagComercial } from "@/lib/linha-proposta/tipos";
import { corParaHex } from "@/app/components/ModulePreview";
import {
  geometriaConjunto,
  geometriaConjuntoBrackets,
  geometriaHandles,
  type ConjuntoBracket,
  type GeoItemConjunto,
  type HandleGeo,
  type ItemDoConjunto,
} from "./canvas-geometria";
import { desenharConteudoBonito, desenharGrupoPortas, linha, retanguloDoGrupo } from "./canvas-desenho-partes";
import type { Geo } from "./canvas-geometria";

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

// Task 2.28-2.30 (RF-37/Q-3) — badge comercial (Linha de Proposta): chip
// preenchido em `accent` (Design-System Seção 2.3, mesmo par usado no badge
// de status "Enviado"), deliberadamente diferente de `CONJUNTO_COR`
// (`informacao`, linha+círculo) — nunca o mesmo botão/afordância dos dois
// agrupamentos (Q-3, item 2.30).
const TAG_COR = "#B45309"; // accent
const TAG_SUBTLE = "#FFF3E0"; // accent.subtle
const TAG_BORDER = "#F3C88F"; // accent.border
const TAG_ALTURA_PX = 13;

function tituloAbreviado(titulo: string): string {
  return titulo.length > 12 ? `${titulo.slice(0, 11)}…` : titulo;
}

function desenharTagComercial(ctx: CanvasRenderingContext2D, g: GeoItemConjunto, tag: TagComercial) {
  const largura = larguraDoItem(g.item) * g.scale;
  const altura = alturaDoItem(g.item) * g.scale;
  if (largura <= 24 || altura <= 18) return; // item pequeno demais pro chip caber

  const label = tituloAbreviado(tag.titulo);
  const chipW = Math.max(20, Math.min(largura - 6, label.length * 5.5 + 14));
  const x = g.ox + 3;
  const y = g.oy + 3;

  ctx.fillStyle = TAG_SUBTLE;
  ctx.strokeStyle = TAG_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, chipW, TAG_ALTURA_PX, TAG_ALTURA_PX / 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = TAG_COR;
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + chipW / 2, y + TAG_ALTURA_PX - 4);
}

export const HANDLE_RAIO_PX = 10; // círculo de 20px de diâmetro (Design-System 9.3)
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
 * Canvas 2D não desenha componentes React/SVG do lucide diretamente (só
 * path data manual), então aqui aproxima-se com duas formas vetoriais simples
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

export function desenharConjunto(
  ctx: CanvasRenderingContext2D,
  itens: ItemDoConjunto[],
  alturas: AlturasFaixas,
  itensComAviso?: Map<string, "erro" | "aviso">,
  conjuntos?: Conjunto[],
  tagsComerciais?: Map<string, TagComercial>
) {
  for (const g of geometriaConjunto(itens, alturas)) {
    desenharItemConjunto(ctx, g);
    const severidade = itensComAviso?.get(g.itemId);
    if (severidade) desenharDestaqueItem(ctx, g, severidade);
    const tag = tagsComerciais?.get(g.itemId);
    if (tag) desenharTagComercial(ctx, g, tag);
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
