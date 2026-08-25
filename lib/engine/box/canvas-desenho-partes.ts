// V3 — Desenho Canvas 2D de baixo nível, reaproveitado tanto pelo modo item
// único quanto pelo modo "conjunto" (`canvas-desenho-item-unico.ts` e
// `canvas-desenho-conjunto.ts`). Extraído de `app/components/BoxCanvas.tsx`
// (Task R.3b — decomposição, sem mudança de comportamento).

import type { BayNode, BoxModule, FrenteConteudo, GrupoPortas, TipoPuxador } from "@/lib/engine/box/types";
import { retanguloVaos } from "@/lib/engine/box/tree";
import type { Geo } from "./canvas-geometria";

export function linha(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Desenho de UMA frente de gaveta externa: linhas divisórias entre as
 * frentes + marca/perfil de puxador (igual às portas) — reaproveitado no
 * modo comercial e no modo laboratório (antes só tinha um rótulo de texto). */
export function desenharGavetaVisual(
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
export function desenharConteudoBonito(
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
export function sentidoEfetivo(grupo: GrupoPortas, indice: number): GrupoPortas["sentido"] {
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
export function desenharGrupoPortas(
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
export function retanguloDoGrupo(
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
