import type { BayContent, BayNode } from "./types";
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
  qtd: number
): BayNode {
  return transformar(root, id, (n) => ({
    ...n,
    split,
    qtdDivisorias: qtd,
    content: undefined,
    children: Array.from({ length: qtd + 1 }, () => vaoVazio(novoBayId())),
  }));
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
    const bays = node.qtdDivisorias + 1;
    const childW = (w - node.qtdDivisorias * t) / bays;
    return node.children.flatMap((c, i) =>
      layoutVaos(c, x + i * (childW + t), y, childW, h, t)
    );
  }
  if (node.split === "horizontal" && node.qtdDivisorias > 0 && node.children) {
    const bays = node.qtdDivisorias + 1;
    const childH = (h - node.qtdDivisorias * t) / bays;
    return node.children.flatMap((c, i) =>
      layoutVaos(c, x, y + i * (childH + t), w, childH, t)
    );
  }
  return [{ id: node.id, x, y, w, h, node }];
}

/** Rótulo curto do conteúdo para exibir no vão. */
export function rotuloConteudo(node: BayNode): string {
  const c = node.content;
  if (!c || c.tipo === "vazio") return "vazio";
  switch (c.tipo) {
    case "portas":
      return `${c.qtd} porta(s)`;
    case "gaveta":
      return `${c.qtd} gaveta(s)${c.interna ? " int." : ""}`;
    case "prateleira":
      return `${c.qtd} prat.`;
    case "fundo":
      return `fundo ${c.espessura}mm`;
    case "tamponamento":
      return `tamp. ${c.lado}`;
  }
}
