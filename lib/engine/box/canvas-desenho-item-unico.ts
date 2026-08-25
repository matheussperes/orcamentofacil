// V3 — Desenho Canvas 2D do modo item único (laboratório + comercial) de
// `BoxCanvas`. Extraído de `app/components/BoxCanvas.tsx` (Task R.3b —
// decomposição, sem mudança de comportamento).

import type { BoxModule } from "@/lib/engine/box/types";
import { layoutDivisorias, rotuloConteudo } from "@/lib/engine/box/tree";
import { corParaHex } from "@/app/components/ModulePreview";
import { geometria } from "./canvas-geometria";
import { desenharConteudoBonito, desenharGavetaVisual, desenharGrupoPortas, retanguloDoGrupo } from "./canvas-desenho-partes";

// Design-System.md Seção 2.2 (accent) / 6.6 (canvas modo laboratório) — cores
// hardcoded em JS porque o desenho é Canvas 2D, não classes Tailwind. Vão
// hover: contorno tracejado 2px ACCENT. Vão selecionado: contorno sólido 2px
// ACCENT + fundo ACCENT_SUBTLE.
//
// Nota de retrofit (Task 13.3b): fora de escopo desta task — o contrato só
// pediu a migração do contorno de CONJUNTO (`CONJUNTO_COR`, em
// `canvas-desenho-conjunto.ts`) para `informacao`. Este `ACCENT`/
// `ACCENT_SUBTLE` (seleção/hover de VÃO no modo laboratório de `/modulo`)
// continua com o hex azul antigo (`#2563EB`/`#EFF6FF`), não o novo laranja
// (`accent.vivid` `#D97706`) — como é hex hardcoded (não classe Tailwind), NÃO
// recolore junto com o flip do token. Isso é uma divergência visual real (a
// seleção de vão fica azul enquanto o resto do app vira laranja); registrada
// aqui para retrofit futuro de `/modulo`, fora do escopo de shell+Dashboard.
export const ACCENT = "#2563EB";
export const ACCENT_SUBTLE = "#EFF6FF";

export interface DivisaoSelecionada {
  parentId: string;
  indice: number;
}

export type ModoSelecao = "vaos" | "divisoes" | "portas" | "gavetas";

export interface OpcoesDesenhoItemUnico {
  comercial: boolean;
  modoSelecao: ModoSelecao;
  vaosSelecionados: string[];
  divisaoSelecionada: DivisaoSelecionada | null;
  portaSelecionada: string | null;
  vaoGavetaSelecionado: string | null;
  hoverId: string | null;
}

/** Desenha o módulo-caixa completo no modo item único (laboratório com bordas
 * técnicas + rótulos, ou "bonito"/comercial) — carcaça, conteúdo, divisórias
 * selecionadas e grupos de porta por cima. Equivalente ao branch `if (!box)
 * return; ... geometria(box) ...` que existia direto no efeito de desenho de
 * `BoxCanvas`. */
export function desenharItemUnico(
  ctx: CanvasRenderingContext2D,
  box: BoxModule,
  opts: OpcoesDesenhoItemUnico
) {
  const { comercial, modoSelecao, vaosSelecionados, divisaoSelecionada, portaSelecionada, vaoGavetaSelecionado, hoverId } = opts;
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
}
