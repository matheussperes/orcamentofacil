"use client";

import { useEffect, useRef } from "react";
import type { BoxModule } from "@/lib/engine/box/types";
import { layoutVaos, rotuloConteudo, type BayRect } from "@/lib/engine/box/tree";
import { corParaHex } from "./ModulePreview";

// V3 — Editor visual da caixa em Canvas 2D. Desenha a carcaça e os vãos-folha
// (elevação frontal), destaca o selecionado e permite clicar para selecionar.

const TRAVESSA_H = 70;
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
  const interiorTop = box.tipo === "inferior" ? TRAVESSA_H : t;
  const interiorH =
    box.tipo === "inferior" ? box.altura - t - TRAVESSA_H : box.altura - 2 * t;
  const rects = layoutVaos(
    box.raiz,
    t,
    interiorTop,
    box.largura - 2 * t,
    interiorH,
    t
  );
  return { scale, ox, oy, interiorTop, interiorH, rects };
}

export function BoxCanvas({
  box,
  selecionado,
  onSelecionar,
}: {
  box: BoxModule;
  selecionado: string | null;
  onSelecionar: (id: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    const g = geometria(box);
    const px = (mmX: number) => g.ox + mmX * g.scale;
    const py = (mmY: number) => g.oy + mmY * g.scale;

    // Carcaça (contorno do módulo).
    ctx.fillStyle = corParaHex(box.caixa.cor);
    ctx.fillRect(px(0), py(0), box.largura * g.scale, box.altura * g.scale);
    ctx.strokeStyle = "#1c2430";
    ctx.lineWidth = 2;
    ctx.strokeRect(px(0), py(0), box.largura * g.scale, box.altura * g.scale);

    // Vãos-folha.
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

      // Rótulo do conteúdo.
      ctx.fillStyle = "#1c2430";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(rotuloConteudo(r.node), x + w / 2, y + h / 2 + 4);
    }
  }, [box, selecionado]);

  function clique(e: React.MouseEvent<HTMLCanvasElement>) {
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
        cursor: "pointer",
      }}
    />
  );
}
