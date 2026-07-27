import type { BayContent, BayNode, PosicaoDivisao } from "./types";
import { vaoVazio } from "./types";

// Operações puras sobre a árvore de vãos + layout geométrico para o Canvas.

export function novoBayId(): string {
  return "bay-" + Math.random().toString(36).slice(2, 9);
}

/** Aplica `fn` ao nó com o id dado, retornando uma nova árvore. */
function transformar(node: BayNode, id: string, fn: (n: BayNode) => BayNode): BayNode {
  if (node.id === id) return fn(node);
  if (node.children) {
    return { ...node, children: node.children.map((c) => transformar(c, id, fn)) };
  }
  return node;
}

/** Divide um vão em N+1 sub-vãos vazios. */
export function dividirVao(
  root: BayNode,
  id: string,
  split: "vertical" | "horizontal",
  qtd: number,
  opts: { recuoFrontal?: number; posicao?: PosicaoDivisao; recuoLateral?: number } = {}
): BayNode {
  return transformar(root, id, (n) => ({
    ...n,
    split,
    qtdDivisorias: qtd,
    recuoFrontal: opts.recuoFrontal ?? 20,
    posicao: opts.posicao ?? "centralizado",
    recuoLateral: opts.recuoLateral ?? 0,
    content: undefined,
    children: Array.from({ length: qtd + 1 }, () => vaoVazio(novoBayId())),
  }));
}

/**
 * Exclui UMA divisória específica (índice dentro do grupo de um nó dividido),
 * fundindo os dois vãos que ela separava num único vão vazio. Se a última
 * divisória do grupo for removida, o nó colapsa de volta a um vão-folha vazio.
 */
export function excluirDivisoria(root: BayNode, parentId: string, indice: number): BayNode {
  return transformar(root, parentId, (n) => {
    if (n.split === "none" || !n.children) return n;
    if (indice < 0 || indice >= n.qtdDivisorias) return n;

    const filhos = [...n.children];
    filhos.splice(indice, 2, vaoVazio(filhos[indice].id));
    const qtdDivisorias = n.qtdDivisorias - 1;
    if (qtdDivisorias <= 0) return vaoVazio(n.id);
    return { ...n, qtdDivisorias, children: filhos };
  });
}

/** Define o conteúdo de um vão-folha. */
export function definirConteudo(root: BayNode, id: string, content: BayContent): BayNode {
  return transformar(root, id, (n) => ({
    ...n,
    split: "none",
    qtdDivisorias: 0,
    children: undefined,
    content,
  }));
}

/** Volta o vão (e sub-árvore) a um vão vazio. */
export function limparVao(root: BayNode, id: string): BayNode {
  return transformar(root, id, (n) => vaoVazio(n.id));
}

export function acharVao(node: BayNode, id: string): BayNode | null {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const achou = acharVao(c, id);
    if (achou) return achou;
  }
  return null;
}

/**
 * Tamanhos (mm) de cada filho de um split, ao longo do eixo dividido.
 * "centralizado" (default): N+1 vãos iguais, descontada a espessura das
 * divisórias — comportamento original. "direita"/"esquerda": o filho da
 * ponta (último para "direita", primeiro para "esquerda") recebe
 * `recuoLateral`; os demais dividem o espaço restante igualmente entre si.
 */
export function tamanhosFilhos(node: BayNode, dimensaoTotal: number, t: number): number[] {
  const bays = node.qtdDivisorias + 1;
  const disponivel = dimensaoTotal - node.qtdDivisorias * t;
  const posicao = node.posicao ?? "centralizado";

  if (posicao === "centralizado" || bays < 2) {
    return Array(bays).fill(disponivel / bays);
  }

  const recuoLateral = Math.min(Math.max(node.recuoLateral ?? 0, 0), disponivel);
  const restante = (disponivel - recuoLateral) / (bays - 1);
  const tamanhos = Array(bays).fill(restante);
  if (posicao === "direita") tamanhos[bays - 1] = recuoLateral;
  else tamanhos[0] = recuoLateral;
  return tamanhos;
}

export interface BayRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  node: BayNode;
}

/**
 * Layout dos vãos-folha em coordenadas (mm) dentro de um retângulo interno.
 * Espelha a geometria da explosão: vertical = lado a lado; horizontal =
 * empilhado (o primeiro filho é o de cima na elevação frontal).
 */
export function layoutVaos(
  node: BayNode,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number
): BayRect[] {
  if (node.split === "vertical" && node.qtdDivisorias > 0 && node.children) {
    const larguras = tamanhosFilhos(node, w, t);
    let cx = x;
    const out: BayRect[] = [];
    node.children.forEach((c, i) => {
      out.push(...layoutVaos(c, cx, y, larguras[i], h, t));
      cx += larguras[i] + t;
    });
    return out;
  }
  if (node.split === "horizontal" && node.qtdDivisorias > 0 && node.children) {
    const alturas = tamanhosFilhos(node, h, t);
    let cy = y;
    const out: BayRect[] = [];
    node.children.forEach((c, i) => {
      out.push(...layoutVaos(c, x, cy, w, alturas[i], t));
      cy += alturas[i] + t;
    });
    return out;
  }
  return [{ id: node.id, x, y, w, h, node }];
}

export interface DivisoriaRect {
  parentId: string;
  indice: number; // índice da divisória dentro do grupo (0..qtdDivisorias-1)
  axis: "vertical" | "horizontal";
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Layout (mm) de cada LINHA divisória existente na árvore (recursivo —
 * inclui divisórias em sub-vãos aninhados), usado pro hit-test do modo
 * "Selecionar divisões" do canvas e pra excluir uma divisória específica.
 */
export function layoutDivisorias(
  node: BayNode,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number
): DivisoriaRect[] {
  if (node.split === "vertical" && node.qtdDivisorias > 0 && node.children) {
    const larguras = tamanhosFilhos(node, w, t);
    const out: DivisoriaRect[] = [];
    let cx = x;
    node.children.forEach((c, i) => {
      out.push(...layoutDivisorias(c, cx, y, larguras[i], h, t));
      cx += larguras[i];
      if (i < node.children!.length - 1) {
        out.push({ parentId: node.id, indice: i, axis: "vertical", x: cx, y, w: t, h });
        cx += t;
      }
    });
    return out;
  }
  if (node.split === "horizontal" && node.qtdDivisorias > 0 && node.children) {
    const alturas = tamanhosFilhos(node, h, t);
    const out: DivisoriaRect[] = [];
    let cy = y;
    node.children.forEach((c, i) => {
      out.push(...layoutDivisorias(c, x, cy, w, alturas[i], t));
      cy += alturas[i];
      if (i < node.children!.length - 1) {
        out.push({ parentId: node.id, indice: i, axis: "horizontal", x, y: cy, w, h: t });
        cy += t;
      }
    });
    return out;
  }
  return [];
}

/**
 * Bounding box (mm) da união dos vãos-folha cujos ids estão em `ids` — usado
 * pra resolver a geometria de um `GrupoPortas` que cobre vãos selecionados
 * (tanto na explosão de peças quanto no desenho do canvas).
 */
export function retanguloVaos(
  node: BayNode,
  ids: Set<string>,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number
): { x: number; y: number; w: number; h: number } | null {
  const rects = layoutVaos(node, x, y, w, h, t).filter((r) => ids.has(r.id));
  if (rects.length === 0) return null;
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Rótulo curto do conteúdo para exibir no vão. Portas não aparecem aqui —
 * são independentes da árvore de vãos (ver GrupoPortas). */
export function rotuloConteudo(node: BayNode): string {
  const c = node.content;
  if (!c) return "vazio";

  const partes: string[] = [];
  if (c.frente.tipo === "gaveta") {
    partes.push(`${c.frente.qtd} gaveta(s)${c.frente.interna ? " int." : ""}`);
  }
  if (c.prateleiras && c.prateleiras.qtd > 0) partes.push(`${c.prateleiras.qtd} prat.`);

  return partes.length > 0 ? partes.join(" + ") : "vazio";
}
