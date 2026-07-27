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

const W = 380;
const H = 360;

// Design-System.md Seção 2.2 (accent) / 6.6 (canvas modo laboratório) — cores
// hardcoded em JS porque o desenho é Canvas 2D, não classes Tailwind. Vão
// hover: contorno tracejado 2px ACCENT. Vão selecionado: contorno sólido 2px
// ACCENT + fundo ACCENT_SUBTLE.
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

export interface DivisaoSelecionada {
  parentId: string;
  indice: number;
}

export type ModoSelecao = "vaos" | "divisoes" | "portas" | "gavetas";

export function BoxCanvas({
  box,
  comercial = false,
  modoSelecao = "vaos",
  vaosSelecionados = [],
  onToggleVao,
  divisaoSelecionada = null,
  onSelecionarDivisoria,
  portaSelecionada = null,
  onSelecionarPorta,
  vaoGavetaSelecionado = null,
  onSelecionarVaoGaveta,
}: {
  box: BoxModule;
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
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Vão sob o mouse (só nos modos "vaos"/"gavetas", que operam sobre os
  // mesmos retângulos de g.rects) — puramente apresentacional, não afeta
  // onToggleVao/modoSelecao/vaosSelecionados.
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

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

    // Tamponamento de instância: tiras coloridas por fora da carcaça, com a
    // cor de cada lado — dá feedback visual imediato da configuração atual.
    const tamp = box.tamponamento;
    if (tamp) {
      const faixa = 10; // px, espessura visual da tira (não depende da escala real)
      if (tamp.esquerdo.ativo) {
        ctx.fillStyle = corParaHex(tamp.esquerdo.material.cor);
        ctx.fillRect(px(0) - faixa, py(0), faixa, box.altura * g.scale);
      }
      if (tamp.direito.ativo) {
        ctx.fillStyle = corParaHex(tamp.direito.material.cor);
        ctx.fillRect(px(0) + box.largura * g.scale, py(0), faixa, box.altura * g.scale);
      }
      if (tamp.superior.ativo) {
        ctx.fillStyle = corParaHex(tamp.superior.material.cor);
        ctx.fillRect(px(0), py(0) - faixa, box.largura * g.scale, faixa);
      }
      if (tamp.inferior.ativo) {
        ctx.fillStyle = corParaHex(tamp.inferior.material.cor);
        ctx.fillRect(px(0), py(0) + box.altura * g.scale, box.largura * g.scale, faixa);
      }
    }
  }, [box, comercial, modoSelecao, vaosSelecionados, divisaoSelecionada, portaSelecionada, vaoGavetaSelecionado, hoverId]);

  function clique(e: React.MouseEvent<HTMLCanvasElement>) {
    if (comercial) return; // preview comercial não é interativo
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
    if (comercial) return;
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
          cursor: comercial ? "default" : "pointer",
        }}
      />
    </div>
  );
}
