"use client";

import { useEffect, useRef } from "react";
import type { Chapa } from "@/lib/engine/box/cutting";

// Fase 3, Etapa 1 — desenha uma chapa de MDF (2750×1840mm) em escala 1:10 com
// as peças posicionadas pelo algoritmo shelf-first (lib/engine/box/cutting.ts).

const ESCALA = 0.1; // 1:10 → chapa 275×184px
const PAD = 1;

export function PlanoCorteCanvas({
  chapa,
  larguraChapa,
  alturaChapa,
}: {
  chapa: Chapa;
  larguraChapa: number;
  alturaChapa: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.round(larguraChapa * ESCALA);
  const h = Math.round(alturaChapa * ESCALA);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    // Fundo da chapa.
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, w, h);

    ctx.font = "8px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const p of chapa.pecas) {
      const x = p.x * ESCALA;
      const y = p.y * ESCALA;
      const pw = p.w * ESCALA;
      const ph = p.h * ESCALA;

      ctx.fillStyle = "#bfdbfe";
      ctx.fillRect(x + PAD, y + PAD, pw - PAD * 2, ph - PAD * 2);
      ctx.strokeStyle = "#1e3a8a";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + PAD, y + PAD, pw - PAD * 2, ph - PAD * 2);

      if (pw > 24 && ph > 12) {
        ctx.fillStyle = "#1e293b";
        const label = `${p.w}×${p.h}`;
        ctx.fillText(label, x + pw / 2, y + ph / 2, pw - 4);
      }
    }
  }, [chapa, w, h]);

  return (
    <div style={{ display: "inline-block", textAlign: "center", marginRight: 12, marginBottom: 12 }}>
      <canvas
        ref={ref}
        width={w}
        height={h}
        style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 4 }}
      />
      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
        Chapa {chapa.index} · {(chapa.aproveitamento * 100).toFixed(1)}% aproveitado
      </div>
    </div>
  );
}
