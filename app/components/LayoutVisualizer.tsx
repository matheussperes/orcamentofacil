"use client";

import { useEffect, useRef, useState } from "react";
import { corParaHex } from "./ModulePreview";

// V2-3 — Visualizador de layout das paredes em Canvas nativo. Vistas:
// elevação da Parede A, da Parede B, ambas, e planta baixa (top-down).

export interface LayoutModulo {
  id: string;
  parede: string;
  largura_mm: number;
  altura_mm: number;
  profundidade_mm: number;
  categoria: string; // "superior" = aéreo
  cor?: string;
}

export type TipoVista = "ParedeA" | "ParedeB" | "Ambas" | "PlantaBaixa";

const L = 820;
const A = 300;

export function LayoutVisualizer({
  modulos,
  paredes,
}: {
  modulos: LayoutModulo[];
  paredes: Record<string, number>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [vista, setVista] = useState<TipoVista>("ParedeA");

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, L, A);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, L, A);

    if (vista === "PlantaBaixa") {
      desenharPlanta(ctx, modulos, paredes);
    } else if (vista === "Ambas") {
      desenharElevacao(ctx, filtra(modulos, "A"), paredes.A ?? 0, "A", 0, A / 2);
      desenharElevacao(ctx, filtra(modulos, "B"), paredes.B ?? 0, "B", A / 2, A / 2);
    } else {
      const p = vista === "ParedeA" ? "A" : "B";
      desenharElevacao(ctx, filtra(modulos, p), paredes[p] ?? 0, p, 0, A);
    }
  }, [modulos, paredes, vista]);

  const abas: { v: TipoVista; label: string }[] = [
    { v: "ParedeA", label: "Parede A" },
    { v: "ParedeB", label: "Parede B" },
    { v: "Ambas", label: "Ambas" },
    { v: "PlantaBaixa", label: "Planta baixa" },
  ];

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 10 }}>
        {abas.map((a) => (
          <button
            key={a.v}
            className={vista === a.v ? "primary" : ""}
            onClick={() => setVista(a.v)}
          >
            {a.label}
          </button>
        ))}
      </div>
      <canvas
        ref={ref}
        width={L}
        height={A}
        style={{
          width: "100%",
          height: "auto",
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 6,
        }}
      />
    </div>
  );
}

function filtra(modulos: LayoutModulo[], parede: string): LayoutModulo[] {
  return modulos.filter((m) => m.parede === parede);
}

function desenharElevacao(
  ctx: CanvasRenderingContext2D,
  modulos: LayoutModulo[],
  larguraParede: number,
  parede: string,
  offsetY: number,
  altura: number
) {
  const margem = 40;
  const yChao = offsetY + altura - 30;
  const larguraDisponivel = L - margem * 2;
  const escala =
    larguraParede > 0
      ? Math.min(larguraDisponivel / larguraParede, (altura - 60) / 2700)
      : 0.1;

  // Linha do chão.
  ctx.strokeStyle = "#7f8c8d";
  ctx.lineWidth = 2;
  linha(ctx, margem, yChao, L - margem, yChao);

  // Rótulo da parede.
  ctx.fillStyle = "#64748b";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Parede ${parede} — ${(larguraParede / 1000).toFixed(2)}m`, margem, offsetY + 20);

  const piso = modulos.filter((m) => m.categoria !== "superior");
  const aereo = modulos.filter((m) => m.categoria === "superior");

  let x = margem;
  for (const m of piso) {
    const w = m.largura_mm * escala;
    const h = m.altura_mm * escala;
    desenhaCaixa(ctx, x, yChao - h, w, h, m);
    x += w;
  }

  // Aéreos: linha superior, a ~1500mm do chão.
  const yAereoBase = yChao - 1500 * escala;
  let xa = margem;
  for (const m of aereo) {
    const w = m.largura_mm * escala;
    const h = m.altura_mm * escala;
    desenhaCaixa(ctx, xa, yAereoBase - h, w, h, m);
    xa += w;
  }

  // Aviso de estouro (piso).
  const totalPiso = piso.reduce((s, m) => s + m.largura_mm, 0);
  if (totalPiso > larguraParede && larguraParede > 0) {
    ctx.fillStyle = "#ef4d5a";
    ctx.textAlign = "right";
    ctx.fillText(`estouro ${totalPiso - larguraParede}mm`, L - margem, offsetY + 20);
  }
}

function desenhaCaixa(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  m: LayoutModulo
) {
  ctx.fillStyle = corParaHex(m.cor);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#2c3e50";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x, y, w, h);

  const portas = m.largura_mm >= 500 ? 2 : 1;
  if (portas === 2) {
    ctx.strokeStyle = "rgba(44,62,80,0.4)";
    linha(ctx, x + w / 2, y + 2, x + w / 2, y + h - 2);
  }

  if (w > 34) {
    ctx.fillStyle = "#2c3e50";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(m.largura_mm), x + w / 2, y - 4);
  }
}

function desenharPlanta(
  ctx: CanvasRenderingContext2D,
  modulos: LayoutModulo[],
  paredes: Record<string, number>
) {
  const margem = 40;
  const escala = 0.09;
  const yParede = 60;

  ctx.fillStyle = "#64748b";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Planta baixa (vista superior)", margem, 28);

  // Parede ao fundo.
  ctx.strokeStyle = "#2c3e50";
  ctx.lineWidth = 5;
  linha(ctx, margem, yParede, L - margem, yParede);

  let x = margem;
  for (const m of modulos.filter((mm) => mm.categoria !== "superior")) {
    const w = m.largura_mm * escala;
    const prof = m.profundidade_mm * escala;
    ctx.fillStyle = corParaHex(m.cor);
    ctx.fillRect(x, yParede, w, prof);
    ctx.strokeStyle = "#34495e";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, yParede, w, prof);

    // Arco da porta abrindo.
    ctx.strokeStyle = "rgba(231,76,60,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, yParede + prof, Math.min(w, prof * 1.4), -Math.PI / 2, 0, false);
    ctx.stroke();

    x += w;
  }
}

function linha(
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
