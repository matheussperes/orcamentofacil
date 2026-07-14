"use client";

import { useEffect, useRef } from "react";

// V2-2 — Pré-visualização 2D do módulo em Canvas nativo (sem biblioteca).
// Desenha a caixa e divisórias internas (portas/gavetas/prateleiras) a partir
// da configuração. Escala para caber na área de preview.

export interface PreviewModulo {
  largura_mm: number;
  altura_mm: number;
  config: Record<string, number>;
  corExterno?: string;
}

const LARGURA_CANVAS = 168;
const ALTURA_CANVAS = 128;

export function ModulePreview({ modulo }: { modulo: PreviewModulo }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, LARGURA_CANVAS, ALTURA_CANVAS);

    const pad = 12;
    const escala = Math.min(
      (LARGURA_CANVAS - pad * 2) / modulo.largura_mm,
      (ALTURA_CANVAS - pad * 2) / modulo.altura_mm
    );
    const w = modulo.largura_mm * escala;
    const h = modulo.altura_mm * escala;
    const x = (LARGURA_CANVAS - w) / 2;
    const y = (ALTURA_CANVAS - h) / 2;

    // Caixa externa (cor do acabamento externo, se informada).
    ctx.fillStyle = corParaHex(modulo.corExterno);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#1c2430";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    const portas = modulo.config.CONFIG_QTD_PORTAS ?? 0;
    const gavetas = modulo.config.CONFIG_QTD_GAVETAS ?? 0;
    const prateleiras = modulo.config.CONFIG_QTD_PRATELEIRAS ?? 0;

    ctx.strokeStyle = "rgba(28,36,48,0.45)";
    ctx.lineWidth = 1;

    if (gavetas > 0) {
      // Gavetas: faixas horizontais.
      for (let i = 1; i < gavetas; i++) {
        const gy = y + (h / gavetas) * i;
        line(ctx, x + 3, gy, x + w - 3, gy);
      }
      // Puxadores das gavetas.
      ctx.fillStyle = "rgba(28,36,48,0.5)";
      for (let i = 0; i < gavetas; i++) {
        const gy = y + (h / gavetas) * (i + 0.5);
        ctx.fillRect(x + w / 2 - 8, gy - 1.5, 16, 3);
      }
    } else {
      // Prateleiras internas.
      for (let i = 1; i <= prateleiras; i++) {
        const py = y + (h / (prateleiras + 1)) * i;
        line(ctx, x + 3, py, x + w - 3, py);
      }
      // Portas: divisórias verticais + puxadores nas bordas internas.
      if (portas > 1) {
        for (let i = 1; i < portas; i++) {
          const px = x + (w / portas) * i;
          line(ctx, px, y + 3, px, y + h - 3);
        }
      }
      if (portas > 0) {
        ctx.fillStyle = "rgba(28,36,48,0.5)";
        for (let i = 0; i < portas; i++) {
          const px = x + (w / portas) * (i + 1) - 6;
          ctx.fillRect(px, y + h / 2 - 8, 3, 16);
        }
      }
    }
  }, [modulo]);

  return (
    <canvas
      ref={ref}
      width={LARGURA_CANVAS}
      height={ALTURA_CANVAS}
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 6,
      }}
    />
  );
}

function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// Mapeia nomes de acabamento para uma cor aproximada de exibição.
export function corParaHex(cor?: string): string {
  const c = (cor ?? "").toLowerCase();
  if (c.includes("madeir") || c.includes("freij") || c.includes("nogueira"))
    return "#c8955c";
  if (c.includes("cinza")) return "#9aa1a8";
  if (c.includes("preto") || c.includes("graf")) return "#3b4048";
  if (c.includes("carval") || c.includes("mel")) return "#d9b382";
  return "#eef0f2"; // branco/claro padrão
}
