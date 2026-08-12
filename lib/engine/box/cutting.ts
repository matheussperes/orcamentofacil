import type { Peca } from "../types";

// Plano de corte (Fase 3, Etapa 1 — doc 12). Task 3.1/3.3 (motor,
// Modelo-de-Dominio.md §8.1–8.6): guilhotina com lista de retângulos livres
// + busca por permutação (simulated annealing), substituindo o antigo
// shelf-first. Kerf (espessura de serra) é parâmetro do bin-packing (§8.2).
// 100% síncrono, função pura — nenhum I/O, nenhum `Date.now()`/`Math.random()`
// no caminho de cálculo (PRNG semeado determinístico, ver `criarRng`).

export const CHAPA_LARGURA_MM = 2750;
export const CHAPA_ALTURA_MM = 1840;

// §8.3: ordem de grandeza 5.000–20.000, calibrada para ficar em 1–2s numa
// máquina de referência. NUNCA limite de relógio — determinismo (V7)
// depende do orçamento ser em Nº DE ITERAÇÕES fixo, não em tempo decorrido.
export const MAX_ITERACOES = 5000;

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
  // Task 3.4 (RF-29, Modelo-de-Dominio.md §8.1 nota 3): quantos cortes de
  // guilhotina/passadas de serra separam esta chapa em `pecas.length` peças
  // isoladas. Prova: cada corte de guilhotina divide UMA região em EXATAMENTE
  // DUAS sub-regiões (`guilhotinavel()` acima já garante que essa divisão
  // sempre existe — invariante V5). Partindo de 1 região (N peças) até N
  // folhas (1 peça cada), é uma árvore binária com N folhas ⇒ N−1 nós
  // internos ⇒ sempre N−1 cortes, para QUALQUER geometria/ordem de corte.
  // Não precisa reconstruir a árvore: é contagem direta a partir de N.
  numCortes: number;
}

export interface GrupoChapas {
  cor: string;
  espessura_mm: number;
  larguraChapa: number;
  alturaChapa: number;
  chapas: Chapa[];
  pecasForaDaChapa: PecaRetangular[]; // maiores que a chapa em qualquer orientação
  meta?: MetaBuscaCorte; // §8.4 — efêmero, não persistido, aditivo
}

/**
 * Resultado da busca por permutação (§8.4) — efêmero, não persistido, não
 * entra no snapshot congelado nem no rateio. Só diagnóstico/UI.
 */
export interface MetaBuscaCorte {
  iteracoes: number; // quantas permutações foram avaliadas
  tempoMs: number; // diagnóstico — SEMPRE 0 aqui: medir parede quebraria a
  // pureza da função (regra do motor-engineer) e a igualdade estrutural do
  // teste de determinismo V7 entre duas execuções. Quem envolve a chamada
  // num Web Worker/UI e mede o tempo de parede real é a Task 3.1/3.3 (front).
  chapasDeterministico: number; // candidato inicial (a passada determinística)
  chapasFinal: number; // ≤ chapasDeterministico — invariante V6 (§8.5)
}

interface RetanguloLivre {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Regiao {
  x: number;
  y: number;
  w: number;
  h: number;
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
 * Invariante de guilhotina (§8.1) — verificador recursivo: um plano é
 * guilhotinável quando existe uma sequência de cortes de PONTA A PONTA
 * (vertical ou horizontal) que separa todas as peças, cada corte atravessando
 * a região inteira sem parar no meio de uma peça. Os candidatos de corte são
 * as bordas (início/fim) das peças — se existe algum corte válido interno à
 * região, existe um exatamente numa dessas bordas (basta deslizar até ela sem
 * cruzar nenhuma peça).
 */
export function guilhotinavel(regiao: Regiao, pecas: PecaPosicionada[]): boolean {
  if (pecas.length <= 1) return true;

  for (const c of candidatosDeCorte(regiao, pecas, "x")) {
    const esquerda = pecas.filter((p) => p.x + p.w <= c);
    const direita = pecas.filter((p) => p.x >= c);
    if (
      guilhotinavel({ x: regiao.x, y: regiao.y, w: c - regiao.x, h: regiao.h }, esquerda) &&
      guilhotinavel({ x: c, y: regiao.y, w: regiao.x + regiao.w - c, h: regiao.h }, direita)
    ) {
      return true;
    }
  }

  for (const c of candidatosDeCorte(regiao, pecas, "y")) {
    const abaixo = pecas.filter((p) => p.y + p.h <= c);
    const acima = pecas.filter((p) => p.y >= c);
    if (
      guilhotinavel({ x: regiao.x, y: regiao.y, w: regiao.w, h: c - regiao.y }, abaixo) &&
      guilhotinavel({ x: regiao.x, y: c, w: regiao.w, h: regiao.y + regiao.h - c }, acima)
    ) {
      return true;
    }
  }

  return false;
}

/** Bordas de peças, internas à região, que não cruzam nenhuma peça e deixam peça dos dois lados. */
function candidatosDeCorte(regiao: Regiao, pecas: PecaPosicionada[], eixo: "x" | "y"): number[] {
  const inicio = (p: PecaPosicionada) => (eixo === "x" ? p.x : p.y);
  const fim = (p: PecaPosicionada) => (eixo === "x" ? p.x + p.w : p.y + p.h);
  const regiaoInicio = eixo === "x" ? regiao.x : regiao.y;
  const regiaoFim = eixo === "x" ? regiao.x + regiao.w : regiao.y + regiao.h;

  const candidatos = new Set<number>();
  for (const p of pecas) {
    if (inicio(p) > regiaoInicio) candidatos.add(inicio(p));
    if (fim(p) < regiaoFim) candidatos.add(fim(p));
  }

  return [...candidatos].filter((c) => {
    const cruzaAlguma = pecas.some((p) => inicio(p) < c && fim(p) > c);
    if (cruzaAlguma) return false;
    const temAntes = pecas.some((p) => fim(p) <= c);
    const temDepois = pecas.some((p) => inicio(p) >= c);
    return temAntes && temDepois;
  });
}

/** PRNG determinístico (mulberry32) — nunca `Math.random()` livre (§8.3, determinismo é invariante). */
function criarRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semente derivada deterministicamente da entrada (geometria + parâmetros) — mesma entrada, mesma semente. */
function semente(pecas: PecaRetangular[], larguraChapa: number, alturaChapa: number, kerf: number): number {
  let s = (pecas.length * 2654435761 + larguraChapa * 97 + alturaChapa * 131 + kerf * 17) >>> 0;
  for (const p of pecas) {
    s = Math.imul(s ^ (p.w * 31 + p.h * 37 + (p.temVeio ? 1 : 0)), 2246822519) >>> 0;
  }
  return s >>> 0;
}

/** Ordem determinística de base (mesmo critério do antigo shelf-first: altura desc, largura desc). */
function ordenarBase(pecas: PecaRetangular[]): PecaRetangular[] {
  return [...pecas].sort((a, b) => b.h - a.h || b.w - a.w);
}

type DecisorEixo = (ctx: { livre: RetanguloLivre; w: number; h: number; indice: number }) => "horizontal" | "vertical";

/**
 * Heurística determinística de divisão (candidato inicial, §8.3 "escolhas de
 * divisão"): entre corte horizontal-primeiro e vertical-primeiro, escolhe o
 * que deixa o MAIOR retângulo livre único (mantém o espaço sobrando mais
 * reaproveitável, em vez de fragmentado).
 */
function escolherEixoPadrao({ livre, w, h }: { livre: RetanguloLivre; w: number; h: number }): "horizontal" | "vertical" {
  const areaHorizontalPrimeiro = livre.w * (livre.h - h);
  const areaVerticalPrimeiro = (livre.w - w) * livre.h;
  return areaVerticalPrimeiro > areaHorizontalPrimeiro ? "vertical" : "horizontal";
}

/** Divide o retângulo livre consumido pela peça em até 2 novos retângulos livres, descontando o kerf (§8.2). */
function dividir(livre: RetanguloLivre, w: number, h: number, kerf: number, eixo: "horizontal" | "vertical"): RetanguloLivre[] {
  const sobraW = livre.w - w - kerf;
  const sobraH = livre.h - h - kerf;
  const novos: RetanguloLivre[] = [];
  if (eixo === "horizontal") {
    if (sobraH > 0) novos.push({ x: livre.x, y: livre.y + h + kerf, w: livre.w, h: sobraH });
    if (sobraW > 0) novos.push({ x: livre.x + w + kerf, y: livre.y, w: sobraW, h });
  } else {
    if (sobraW > 0) novos.push({ x: livre.x + w + kerf, y: livre.y, w: sobraW, h: livre.h });
    if (sobraH > 0) novos.push({ x: livre.x, y: livre.y + h + kerf, w, h: sobraH });
  }
  return novos;
}

interface ChapaEmConstrucao {
  livres: RetanguloLivre[];
  pecas: PecaPosicionada[];
}

interface Candidato {
  chapaIdx: number;
  livreIdx: number;
  w: number;
  h: number;
  sobra: number;
  curto: number;
}

/**
 * Melhor encaixe (menor sobra de área; desempate por "short side fit") entre
 * todos os retângulos livres já abertos. `orientacoes` vem com a original
 * primeiro — dentro de UM MESMO retângulo livre a sobra é idêntica nas duas
 * orientações (mesma área), então usar "short side fit" pra escolher ENTRE
 * ELAS giraria a peça à toa (sem ganho real de aproveitamento) sempre que
 * houvesse empate; por isso aqui pega a primeira que couber (a original,
 * quando cabe) e só usa "short side fit" pra comparar retângulos DIFERENTES.
 */
function tentarEncontrar(construcao: ChapaEmConstrucao[], orientacoes: Array<{ w: number; h: number }>): Candidato | null {
  let melhor: Candidato | null = null;
  construcao.forEach((chapa, chapaIdx) => {
    chapa.livres.forEach((livre, livreIdx) => {
      const encaixe = orientacoes.find((o) => o.w <= livre.w && o.h <= livre.h);
      if (!encaixe) return;
      const sobra = livre.w * livre.h - encaixe.w * encaixe.h;
      const curto = Math.min(livre.w - encaixe.w, livre.h - encaixe.h);
      if (!melhor || sobra < melhor.sobra || (sobra === melhor.sobra && curto < melhor.curto)) {
        melhor = { chapaIdx, livreIdx, w: encaixe.w, h: encaixe.h, sobra, curto };
      }
    });
  });
  return melhor;
}

/** Task 3.4 — ver a prova completa no comentário de `Chapa.numCortes`. Extraída para ser testável isoladamente (inclui o caso de borda N=0). */
export function calcularNumCortes(numPecas: number): number {
  return Math.max(0, numPecas - 1);
}

interface Passada {
  chapas: Chapa[];
  numCortes: number;
}

/**
 * Executa UMA passada de colocação guilhotina + retângulos livres, na ordem
 * de inserção dada. Retângulos livres continuam disponíveis entre peças (a
 * causa raiz do bug 3.1, §8.3 exemplo 1) — a busca por um encaixe roda contra
 * TODOS os retângulos livres de TODAS as chapas já abertas, não só a última.
 * Avalia as duas orientações da peça sempre que `!temVeio` (peça com veio
 * nunca gira — invariante V3).
 */
function executarPassada(
  ordem: PecaRetangular[],
  larguraChapa: number,
  alturaChapa: number,
  kerf: number,
  escolherEixo: DecisorEixo
): Passada {
  const construcao: ChapaEmConstrucao[] = [];
  let numCortes = 0;

  ordem.forEach((p, indice) => {
    const orientacoes = p.temVeio ? [{ w: p.w, h: p.h }] : [{ w: p.w, h: p.h }, { w: p.h, h: p.w }];

    let candidato = tentarEncontrar(construcao, orientacoes);
    if (!candidato) {
      construcao.push({ livres: [{ x: 0, y: 0, w: larguraChapa, h: alturaChapa }], pecas: [] });
      const local = tentarEncontrar([construcao[construcao.length - 1]], orientacoes)!;
      candidato = { ...local, chapaIdx: construcao.length - 1 };
    }

    const chapa = construcao[candidato.chapaIdx];
    const livre = chapa.livres[candidato.livreIdx];
    chapa.livres.splice(candidato.livreIdx, 1);
    chapa.pecas.push({ ...p, x: livre.x, y: livre.y, w: candidato.w, h: candidato.h });

    const eixo = escolherEixo({ livre, w: candidato.w, h: candidato.h, indice });
    const novos = dividir(livre, candidato.w, candidato.h, kerf, eixo);
    chapa.livres.push(...novos);
    numCortes += novos.length;
  });

  const chapas: Chapa[] = construcao.map((c, i) => ({
    index: i + 1,
    pecas: c.pecas,
    aproveitamento: c.pecas.reduce((s, p) => s + p.w * p.h, 0) / (larguraChapa * alturaChapa),
    numCortes: calcularNumCortes(c.pecas.length),
  }));

  return { chapas, numCortes };
}

/** Critério de comparação em 3 níveis (§8.3): nº total de chapas → aproveitamento da última chapa → nº de cortes. Negativo = `a` é melhor. */
function comparar(a: Passada, b: Passada): number {
  if (a.chapas.length !== b.chapas.length) return a.chapas.length - b.chapas.length;
  const apA = a.chapas.length ? a.chapas[a.chapas.length - 1].aproveitamento : 0;
  const apB = b.chapas.length ? b.chapas[b.chapas.length - 1].aproveitamento : 0;
  if (apA !== apB) return apB - apA;
  return a.numCortes - b.numCortes;
}

/** Escalar aproximado do mesmo critério de 3 níveis — só para a probabilidade de aceitação do annealing (o "melhor" oficial usa `comparar`, exato). */
function pontuar(r: Passada): number {
  const apUlt = r.chapas.length ? r.chapas[r.chapas.length - 1].aproveitamento : 0;
  return r.chapas.length * 1_000_000 - apUlt * 1000 + r.numCortes;
}

function bitsParaEixo(bits: boolean[]): DecisorEixo {
  return ({ indice }) => (bits[indice] ? "vertical" : "horizontal");
}

/** Vizinho do estado atual: 1 swap na ordem OU 1 flip num bit de eixo de divisão. */
function vizinho(ordem: PecaRetangular[], bits: boolean[], rng: () => number): [PecaRetangular[], boolean[]] {
  const novaOrdem = [...ordem];
  const novosBits = [...bits];
  if (rng() < 0.5 && novaOrdem.length > 1) {
    const i = Math.floor(rng() * novaOrdem.length);
    let j = Math.floor(rng() * novaOrdem.length);
    if (j === i) j = (j + 1) % novaOrdem.length;
    [novaOrdem[i], novaOrdem[j]] = [novaOrdem[j], novaOrdem[i]];
  } else if (novosBits.length > 0) {
    const k = Math.floor(rng() * novosBits.length);
    novosBits[k] = !novosBits[k];
  }
  return [novaOrdem, novosBits];
}

/**
 * Busca por permutação (§8.3) — escolha: SIMULATED ANNEALING (não algoritmo
 * genético). Estado = ordem de inserção + 1 bit de eixo de divisão por peça;
 * vizinho = 1 swap de ordem OU 1 flip de bit; temperatura esfria linearmente
 * a `MAX_ITERACOES`; aceita piora com probabilidade de Metropolis
 * (`exp(-delta/temperatura)`) para escapar de mínimos locais. O melhor
 * resultado é rastreado À PARTE do passeio (elitista, via `comparar` exato)
 * — garante V6 (nunca pior que o candidato inicial) mesmo que o passeio
 * aceite piora temporária.
 */
function buscar(
  validas: PecaRetangular[],
  larguraChapa: number,
  alturaChapa: number,
  kerf: number
): { inicial: Passada; melhor: Passada } {
  const ordemBase = ordenarBase(validas);
  const inicial = executarPassada(ordemBase, larguraChapa, alturaChapa, kerf, escolherEixoPadrao);

  const rng = criarRng(semente(validas, larguraChapa, alturaChapa, kerf));

  let ordemAtual = ordemBase;
  let bitsAtual = ordemBase.map(() => rng() < 0.5);
  let atual = executarPassada(ordemAtual, larguraChapa, alturaChapa, kerf, bitsParaEixo(bitsAtual));

  let melhor = inicial;
  if (comparar(atual, melhor) < 0) melhor = atual;

  for (let it = 0; it < MAX_ITERACOES; it++) {
    const temperatura = 1 - it / MAX_ITERACOES;
    const [ordemViz, bitsViz] = vizinho(ordemAtual, bitsAtual, rng);
    const candidato = executarPassada(ordemViz, larguraChapa, alturaChapa, kerf, bitsParaEixo(bitsViz));

    const delta = pontuar(candidato) - pontuar(atual);
    if (delta <= 0 || rng() < Math.exp(-delta / Math.max(temperatura, 1e-6))) {
      ordemAtual = ordemViz;
      bitsAtual = bitsViz;
      atual = candidato;
    }
    if (comparar(candidato, melhor) < 0) melhor = candidato;
  }

  return { inicial, melhor };
}

/**
 * Empacota um conjunto de retângulos (já do mesmo material) em chapas via
 * guilhotina com lista de retângulos livres + busca por permutação
 * (simulated annealing). `kerf` (espessura de serra, §8.2) é opcional,
 * default `0` — reproduz exatamente o comportamento sem corte (compatível
 * com os call sites atuais, que não passam kerf).
 */
export function empacotarChapas(
  entrada: PecaRetangular[],
  larguraChapa = CHAPA_LARGURA_MM,
  alturaChapa = CHAPA_ALTURA_MM,
  kerf = 0
): { chapas: Chapa[]; foraDaChapa: PecaRetangular[]; meta: MetaBuscaCorte } {
  const cabeSemGirar = (p: PecaRetangular) => p.w <= larguraChapa && p.h <= alturaChapa;
  const cabeGirada = (p: PecaRetangular) => p.h <= larguraChapa && p.w <= alturaChapa;

  // Seção 8 (Task 12.5): com veio (`p.temVeio`), a orientação já foi FIXADA
  // em `expandirPecas` (conforme `sentidoVeio`) — a peça só pode ser
  // posicionada nessa orientação exata, nunca girada (giraria o veio
  // fisicamente). Sem veio, aceita a orientação original OU girada, como
  // sempre. Kerf não entra aqui: refilo de borda não é modelado (§8.2).
  const cabe = (p: PecaRetangular) => (p.temVeio ? cabeSemGirar(p) : cabeSemGirar(p) || cabeGirada(p));

  const foraDaChapa = entrada.filter((p) => !cabe(p));
  const validas = entrada.filter(cabe);

  if (validas.length === 0) {
    return { chapas: [], foraDaChapa, meta: { iteracoes: 0, tempoMs: 0, chapasDeterministico: 0, chapasFinal: 0 } };
  }

  const { inicial, melhor } = buscar(validas, larguraChapa, alturaChapa, kerf);

  return {
    chapas: melhor.chapas,
    foraDaChapa,
    meta: {
      iteracoes: MAX_ITERACOES,
      tempoMs: 0,
      chapasDeterministico: inicial.chapas.length,
      chapasFinal: melhor.chapas.length,
    },
  };
}

type FuncaoEmpacotar = (
  entrada: PecaRetangular[],
  larguraChapa: number,
  alturaChapa: number,
  kerf: number
) => { chapas: Chapa[]; foraDaChapa: PecaRetangular[]; meta: MetaBuscaCorte };

/** Agrupa peças por material (cor×espessura) e empacota cada grupo com a função de empacotamento dada. */
function agruparEEmpacotar(
  pecas: Peca[],
  larguraChapa: number,
  alturaChapa: number,
  kerf: number,
  empacotar: FuncaoEmpacotar
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
      const { chapas, foraDaChapa, meta } = empacotar(
        expandirPecas(g.pecas),
        larguraChapa,
        alturaChapa,
        kerf
      );
      return {
        cor: g.cor,
        espessura_mm: g.espessura_mm,
        larguraChapa,
        alturaChapa,
        chapas,
        pecasForaDaChapa: foraDaChapa,
        meta,
      };
    });
}

/** Agrupa peças por material (cor×espessura) e empacota cada grupo. `kerf` (§8.2) opcional, default `0`. */
export function planoDeCorte(
  pecas: Peca[],
  larguraChapa = CHAPA_LARGURA_MM,
  alturaChapa = CHAPA_ALTURA_MM,
  kerf = 0
): GrupoChapas[] {
  return agruparEEmpacotar(pecas, larguraChapa, alturaChapa, kerf, empacotarChapas);
}

/**
 * Estimativa imediata (Task 3.1/3.3 front, Modelo-de-Dominio.md §8.3 "Web
 * Worker — o que muda"): só a passada determinística (candidato inicial da
 * busca, barata em ms), SEM a busca por permutação completa. Usada como
 * conteúdo provisório enquanto o Web Worker calcula `planoDeCorte` (busca
 * completa) em paralelo — nunca existe estado "sem plano de corte". Não
 * altera o algoritmo: reusa exatamente os mesmos passos (`ordenarBase` +
 * `executarPassada` com `escolherEixoPadrao`) que `buscar()` já usa como
 * primeiro candidato.
 */
export function empacotarChapasEstimativa(
  entrada: PecaRetangular[],
  larguraChapa = CHAPA_LARGURA_MM,
  alturaChapa = CHAPA_ALTURA_MM,
  kerf = 0
): { chapas: Chapa[]; foraDaChapa: PecaRetangular[]; meta: MetaBuscaCorte } {
  const cabeSemGirar = (p: PecaRetangular) => p.w <= larguraChapa && p.h <= alturaChapa;
  const cabeGirada = (p: PecaRetangular) => p.h <= larguraChapa && p.w <= alturaChapa;
  const cabe = (p: PecaRetangular) => (p.temVeio ? cabeSemGirar(p) : cabeSemGirar(p) || cabeGirada(p));

  const foraDaChapa = entrada.filter((p) => !cabe(p));
  const validas = entrada.filter(cabe);

  if (validas.length === 0) {
    return { chapas: [], foraDaChapa, meta: { iteracoes: 0, tempoMs: 0, chapasDeterministico: 0, chapasFinal: 0 } };
  }

  const passada = executarPassada(ordenarBase(validas), larguraChapa, alturaChapa, kerf, escolherEixoPadrao);

  return {
    chapas: passada.chapas,
    foraDaChapa,
    meta: {
      iteracoes: 0,
      tempoMs: 0,
      chapasDeterministico: passada.chapas.length,
      chapasFinal: passada.chapas.length,
    },
  };
}

/** Versão `planoDeCorte` que só roda a passada determinística — ver `empacotarChapasEstimativa`. */
export function planoDeCorteEstimativa(
  pecas: Peca[],
  larguraChapa = CHAPA_LARGURA_MM,
  alturaChapa = CHAPA_ALTURA_MM,
  kerf = 0
): GrupoChapas[] {
  return agruparEEmpacotar(pecas, larguraChapa, alturaChapa, kerf, empacotarChapasEstimativa);
}
