"use client";

import { useEffect, useRef } from "react";
import type { BayNode, BoxModule, GrupoPortas } from "@/lib/engine/box/types";
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
  tPx: number
) {
  if (node.split !== "none" && node.qtdDivisorias > 0 && node.children) {
    const bays = node.qtdDivisorias + 1;
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    if (node.split === "vertical") {
      const childW = (w - node.qtdDivisorias * tPx) / bays;
      let cx = x;
      node.children.forEach((child, i) => {
        desenharConteudoBonito(ctx, child, cx, y, childW, h, tPx);
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
        desenharConteudoBonito(ctx, child, x, cy, w, childH, tPx);
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
  if (!c || c.tipo === "tamponamento") return;

  const frente = c.frente;
  ctx.strokeStyle = "rgba(28,36,48,0.45)";
  ctx.lineWidth = 1;

  if (frente.tipo === "gaveta") {
    const qtd = Math.max(1, frente.qtd);
    for (let i = 1; i < qtd; i++) {
      const gy = y + (h / qtd) * i;
      linha(ctx, x + 3, gy, x + w - 3, gy);
    }
    ctx.fillStyle = "rgba(28,36,48,0.5)";
    for (let i = 0; i < qtd; i++) {
      const gy = y + (h / qtd) * (i + 0.5);
      ctx.fillRect(x + w / 2 - 8, gy - 1.5, 16, 3);
    }
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

/** Marca de puxador de UM painel de porta, posicionada conforme o sentido
 * (ver descrições em PortasCard) — todos os painéis de um mesmo grupo usam a
 * mesma posição (sentido é único por grupo, não um por porta). */
function desenharPuxador(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  grupo: GrupoPortas
) {
  ctx.fillStyle = "rgba(28,36,48,0.6)";
  const espessura = 3;
  const comp = 16;
  const margem = 3;

  if (grupo.tipoAbertura === "correr") {
    if (grupo.sentido === "direita") {
      ctx.fillRect(x + w - espessura - margem, y + h / 2 - comp / 2, espessura, comp);
    } else {
      ctx.fillRect(x + margem, y + h / 2 - comp / 2, espessura, comp);
    }
    return;
  }

  switch (grupo.sentido) {
    case "basculante_pia": // abre pra baixo, puxador centralizado no topo
      ctx.fillRect(x + w / 2 - comp / 2, y + margem, comp, espessura);
      break;
    case "basculante_aereo": // abre pra cima, puxador centralizado na base
      ctx.fillRect(x + w / 2 - comp / 2, y + h - espessura - margem, comp, espessura);
      break;
    case "direita": // abre pra direita, puxador no topo esquerdo
      ctx.fillRect(x + margem, y + margem, espessura, comp);
      break;
    case "esquerda": // abre pra esquerda, puxador no topo direito
      ctx.fillRect(x + w - espessura - margem, y + margem, espessura, comp);
      break;
  }
}

/** Desenha um grupo de porta (retângulo já em px) — linhas divisórias entre
 * os painéis + marca de puxador em cada um. */
function desenharGrupoPortas(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  grupo: GrupoPortas
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
    desenharPuxador(ctx, x + larguraPainel * i, y, larguraPainel, h, grupo);
  }
}

export interface DivisaoSelecionada {
  parentId: string;
  indice: number;
}

export function BoxCanvas({
  box,
  comercial = false,
  modoSelecao = "vaos",
  vaosSelecionados = [],
  onToggleVao,
  divisaoSelecionada = null,
  onSelecionarDivisoria,
}: {
  box: BoxModule;
  /** Modo bonito para cards do orçamento — sem bordas/rótulos técnicos, não interativo. */
  comercial?: boolean;
  modoSelecao?: "vaos" | "divisoes";
  vaosSelecionados?: string[];
  onToggleVao?: (id: string) => void;
  divisaoSelecionada?: DivisaoSelecionada | null;
  onSelecionarDivisoria?: (sel: DivisaoSelecionada) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

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
        t * g.scale
      );
    } else {
      // Vãos-folha (modo laboratório): bordas técnicas + rótulo do conteúdo.
      for (const r of g.rects) {
        const x = px(r.x);
        const y = py(r.y);
        const w = r.w * g.scale;
        const h = r.h * g.scale;
        const sel = modoSelecao === "vaos" && vaosSelecionados.includes(r.id);
        ctx.fillStyle = sel ? "rgba(79,140,255,0.28)" : "#ffffff";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = sel ? "#4f8cff" : "#94a3b8";
        ctx.lineWidth = sel ? 2.5 : 1;
        ctx.strokeRect(x, y, w, h);

        const rotulo = rotuloConteudo(r.node);
        if (rotulo !== "vazio") {
          ctx.fillStyle = "#1c2430";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(rotulo, x + w / 2, y + h / 2 + 4);
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
          ctx.fillStyle = "#4f8cff";
          ctx.fillRect(px(d.x) - 1.5, py(d.y) - 1.5, Math.max(d.w * g.scale, 1) + 3, Math.max(d.h * g.scale, 1) + 3);
        }
      }
    }

    // Grupos de porta: independentes da árvore, desenhados por cima dos vãos
    // (cobrem 1+ vãos selecionados no laboratório, ou a caixa inteira).
    for (const grupo of box.portas) {
      let rectMm: { x: number; y: number; w: number; h: number } | null;
      if (grupo.alvo.tipo === "caixa_inteira") {
        rectMm = { x: t, y: g.interiorTop, w: g.interiorW, h: g.interiorH };
      } else {
        rectMm = retanguloVaos(box.raiz, new Set(grupo.alvo.vaoIds), t, g.interiorTop, g.interiorW, g.interiorH, t);
      }
      if (!rectMm) continue;
      desenharGrupoPortas(
        ctx,
        { x: px(rectMm.x), y: py(rectMm.y), w: rectMm.w * g.scale, h: rectMm.h * g.scale },
        grupo
      );
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
  }, [box, comercial, modoSelecao, vaosSelecionados, divisaoSelecionada]);

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

    for (const r of g.rects) {
      const x = g.ox + r.x * g.scale;
      const y = g.oy + r.y * g.scale;
      if (cx >= x && cx <= x + r.w * g.scale && cy >= y && cy <= y + r.h * g.scale) {
        onToggleVao?.(r.id);
        return;
      }
    }
  }

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      onClick={clique}
      style={{
        width: "100%",
        maxWidth: W,
        height: "auto",
        background: "#f9fafb",
        border: "1px solid var(--border)",
        borderRadius: 8,
        cursor: comercial ? "default" : "pointer",
      }}
    />
  );
}
