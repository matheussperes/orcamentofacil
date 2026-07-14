import type { Peca } from "../types";

// Plano de corte (Fase 3, Etapa 1 — doc 12). Algoritmo de empacotamento
// bidimensional "Shelf-First" (prateleiras): ordena as peças da maior para a
// menor e as posiciona lado a lado em linhas dentro da chapa. É um heurístico
// de VALIDAÇÃO visual (quantas chapas, % de aproveitamento) — não é um
// otimizador de corte industrial.

export const CHAPA_LARGURA_MM = 2750;
export const CHAPA_ALTURA_MM = 1840;

export interface PecaRetangular {
  id: string;
  nome: string;
  w: number; // largura (mm)
  h: number; // altura (mm)
}

export interface PecaPosicionada extends PecaRetangular {
  x: number;
  y: number;
}

export interface Chapa {
  index: number; // 1-based, para exibição
  pecas: PecaPosicionada[];
  aproveitamento: number; // 0..1
}

export interface GrupoChapas {
  cor: string;
  espessura_mm: number;
  larguraChapa: number;
  alturaChapa: number;
  chapas: Chapa[];
  pecasForaDaChapa: PecaRetangular[]; // maiores que a chapa em qualquer orientação
}

/** Expande peças (com quantidade agrupada) em retângulos individuais. */
function expandirPecas(pecas: Peca[]): PecaRetangular[] {
  const out: PecaRetangular[] = [];
  pecas.forEach((p, i) => {
    for (let q = 0; q < p.quantidade; q++) {
      out.push({
        id: `${i}-${q}`,
        nome: p.nome,
        w: p.largura_mm,
        h: p.altura_mm,
      });
    }
  });
  return out;
}

/**
 * Empacota um conjunto de retângulos (já do mesmo material) em chapas via
 * algoritmo shelf-first: ordena por altura decrescente e preenche prateleiras
 * da esquerda para a direita; quando uma peça não cabe na prateleira atual,
 * abre uma nova prateleira abaixo (ou uma nova chapa, se não houver espaço).
 */
export function empacotarChapas(
  entrada: PecaRetangular[],
  larguraChapa = CHAPA_LARGURA_MM,
  alturaChapa = CHAPA_ALTURA_MM
): { chapas: Chapa[]; foraDaChapa: PecaRetangular[] } {
  const cabe = (p: PecaRetangular) =>
    (p.w <= larguraChapa && p.h <= alturaChapa) ||
    (p.h <= larguraChapa && p.w <= alturaChapa);

  const foraDaChapa = entrada.filter((p) => !cabe(p));
  // Gira a peça se necessário para caber na largura da chapa.
  const validas = entrada
    .filter(cabe)
    .map((p) =>
      p.w <= larguraChapa && p.h <= alturaChapa
        ? p
        : { ...p, w: p.h, h: p.w }
    );

  const ordenadas = [...validas].sort((a, b) => b.h - a.h || b.w - a.w);

  const sheets: PecaPosicionada[][] = [[]];
  let shelfY = 0;
  let shelfX = 0;
  let shelfH = 0;

  for (const p of ordenadas) {
    if (shelfH === 0) {
      // Chapa (ou prateleira) vazia: abre a primeira prateleira com esta peça.
      shelfH = p.h;
    } else if (shelfX + p.w > larguraChapa) {
      // Não cabe na prateleira atual: tenta abrir uma nova abaixo.
      const novoY = shelfY + shelfH;
      if (novoY + p.h > alturaChapa) {
        sheets.push([]);
        shelfY = 0;
      } else {
        shelfY = novoY;
      }
      shelfX = 0;
      shelfH = p.h;
    }
    sheets[sheets.length - 1].push({ ...p, x: shelfX, y: shelfY });
    shelfX += p.w;
  }

  const chapas: Chapa[] = sheets
    .filter((pecas) => pecas.length > 0)
    .map((pecas, i) => ({
      index: i + 1,
      pecas,
      aproveitamento:
        pecas.reduce((s, p) => s + p.w * p.h, 0) / (larguraChapa * alturaChapa),
    }));

  return { chapas, foraDaChapa };
}

/** Agrupa peças por material (cor×espessura) e empacota cada grupo. */
export function planoDeCorte(
  pecas: Peca[],
  larguraChapa = CHAPA_LARGURA_MM,
  alturaChapa = CHAPA_ALTURA_MM
): GrupoChapas[] {
  const grupos = new Map<string, { cor: string; espessura_mm: number; pecas: Peca[] }>();
  for (const p of pecas) {
    const chave = `${p.cor}|${p.espessura_mm}`;
    const g = grupos.get(chave) ?? { cor: p.cor, espessura_mm: p.espessura_mm, pecas: [] };
    g.pecas.push(p);
    grupos.set(chave, g);
  }

  return [...grupos.values()]
    .sort((a, b) =>
      a.cor === b.cor ? a.espessura_mm - b.espessura_mm : a.cor.localeCompare(b.cor)
    )
    .map((g) => {
      const { chapas, foraDaChapa } = empacotarChapas(
        expandirPecas(g.pecas),
        larguraChapa,
        alturaChapa
      );
      return {
        cor: g.cor,
        espessura_mm: g.espessura_mm,
        larguraChapa,
        alturaChapa,
        chapas,
        pecasForaDaChapa: foraDaChapa,
      };
    });
}
