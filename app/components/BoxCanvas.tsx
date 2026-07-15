"use client";

import { useEffect, useRef } from "react";
import type { BayNode, BoxModule } from "@/lib/engine/box/types";
import { layoutVaos, rotuloConteudo, type BayRect } from "@/lib/engine/box/tree";
import { corParaHex } from "./ModulePreview";

// V3 — Canvas 2D do módulo-caixa, em dois modos:
//  - Laboratório (padrão): vãos com borda técnica, rótulo do conteúdo e
//    destaque de seleção — usado em /modulo, onde o clique importa.
//  - Comercial (`comercial`): visual limpo, sem bordas/rótulos técnicos,
//    com indicadores de portas/gavetas no mesmo estilo do ModulePreview
//    (linhas divisórias finas + marcas de puxador) — usado nos cards do
//    orçamento, onde a imagem precisa ficar "bonitinha".

const W = 380;
const H = 360;

interface Geo {
  scale: number;
  ox: number;
  oy: number;
  interiorTop: number;
  interiorH: number;
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
  const rects = layoutVaos(box.raiz, t, interiorTop, box.largura - 2 * t, interiorH, t);
  return { scale, ox, oy, interiorTop, interiorH, rects };
}

function linha(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Desenho "bonito" (modo comercial): recursa a árvore de vãos desenhando só
 * divisórias finas + indicadores de porta/gaveta/prateleira — sem bordas
 * técnicas nem texto, no mesmo estilo visual do ModulePreview (V2-2). */
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
  } else if (frente.tipo === "portas") {
    const qtd = Math.max(1, frente.qtd);
    if (qtd > 1) {
      for (let i = 1; i < qtd; i++) {
        const px = x + (w / qtd) * i;
        linha(ctx, px, y + 3, px, y + h - 3);
      }
    }
    ctx.fillStyle = "rgba(28,36,48,0.5)";
    for (let i = 0; i < qtd; i++) {
      const px = x + (w / qtd) * (i + 1) - 6;
      ctx.fillRect(px, y + h / 2 - 8, 3, 16);
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

export function BoxCanvas({
  box,
  selecionado,
  onSelecionar,
  comercial = false,
}: {
  box: BoxModule;
  selecionado: string | null;
  onSelecionar: (id: string) => void;
  /** Modo bonito para cards do orçamento — sem bordas/rótulos técnicos. */
  comercial?: boolean;
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
        (box.largura - 2 * t) * g.scale,
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
        const sel = r.id === selecionado;
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
  }, [box, selecionado, comercial]);

  function clique(e: React.MouseEvent<HTMLCanvasElement>) {
    if (comercial) return; // preview comercial não é interativo
    const canvas = ref.current;
    if (!canvas) return;
    const rectEl = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rectEl.left) / rectEl.width) * W;
    const cy = ((e.clientY - rectEl.top) / rectEl.height) * H;
    const g = geometria(box);
    for (const r of g.rects) {
      const x = g.ox + r.x * g.scale;
      const y = g.oy + r.y * g.scale;
      if (cx >= x && cx <= x + r.w * g.scale && cy >= y && cy <= y + r.h * g.scale) {
        onSelecionar(r.id);
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
