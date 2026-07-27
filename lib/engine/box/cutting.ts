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
  w: number; // largura (mm) — eixo X da chapa, até `larguraChapa` (comprimento, Seção 8)
  h: number; // altura (mm) — eixo Y da chapa, até `alturaChapa` (largura-da-chapa, Seção 8)
  temVeio: boolean; // Seção 8 (Task 12.5): com veio, `empacotarChapas` não gira a peça
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

/**
 * Expande peças (com quantidade agrupada) em retângulos individuais.
 *
 * Seção 8 (Task 12.5) — veio de chapa: quando `p.temVeio`, `p.sentidoVeio`
 * FIXA a orientação aqui, antes do empacotamento, sem deixar
 * `empacotarChapas` decidir nada de rotação pra essa peça:
 * - `sentidoVeio: "comprimento"` → mantém a orientação já usada por este
 *   código antes desta task (`w = largura_mm`, `h = altura_mm`).
 * - `sentidoVeio: "largura"` → inverte (`w = altura_mm`, `h = largura_mm`).
 * Sem veio (`!p.temVeio`), a orientação de saída continua a mesma de sempre
 * — quem decide se gira é `empacotarChapas` (rotação livre), como já era.
 */
function expandirPecas(pecas: Peca[]): PecaRetangular[] {
  const out: PecaRetangular[] = [];
  pecas.forEach((p, i) => {
    const inverte = p.temVeio && p.sentidoVeio === "largura";
    const w = inverte ? p.altura_mm : p.largura_mm;
    const h = inverte ? p.largura_mm : p.altura_mm;
    for (let q = 0; q < p.quantidade; q++) {
      out.push({
        id: `${i}-${q}`,
        nome: p.nome,
        w,
        h,
        temVeio: p.temVeio,
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
  const cabeSemGirar = (p: PecaRetangular) => p.w <= larguraChapa && p.h <= alturaChapa;
  const cabeGirada = (p: PecaRetangular) => p.h <= larguraChapa && p.w <= alturaChapa;

  // Seção 8 (Task 12.5): com veio (`p.temVeio`), a orientação já foi FIXADA
  // em `expandirPecas` (conforme `sentidoVeio`) — a peça só pode ser
  // posicionada nessa orientação exata, nunca girada (giraria o veio
  // fisicamente). Sem veio, aceita a orientação original OU girada, como
  // sempre.
  const cabe = (p: PecaRetangular) => (p.temVeio ? cabeSemGirar(p) : cabeSemGirar(p) || cabeGirada(p));

  const foraDaChapa = entrada.filter((p) => !cabe(p));
  // Gira a peça se necessário para caber — só quando `!temVeio` (rotação
  // livre). Peças com veio que passaram no filtro `cabe` acima já cabem sem
  // girar (senão teriam ido pra `foraDaChapa`), então nunca entram neste `map`.
  const validas = entrada
    .filter(cabe)
    .map((p) => (!p.temVeio && !cabeSemGirar(p) ? { ...p, w: p.h, h: p.w } : p));

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
