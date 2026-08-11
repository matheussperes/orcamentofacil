import { describe, it, expect } from "vitest";
import {
  empacotarChapas,
  planoDeCorte,
  guilhotinavel,
  CHAPA_LARGURA_MM,
  CHAPA_ALTURA_MM,
  type PecaPosicionada,
  type PecaRetangular,
} from "./cutting";
import type { Peca } from "../types";

function sobrepoe(a: PecaPosicionada, b: PecaPosicionada): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function semSobreposicao(pecas: PecaPosicionada[]): boolean {
  for (let i = 0; i < pecas.length; i++) {
    for (let j = i + 1; j < pecas.length; j++) {
      if (sobrepoe(pecas[i], pecas[j])) return false;
    }
  }
  return true;
}

function dentroDaChapa(pecas: PecaPosicionada[], w: number, h: number): boolean {
  return pecas.every((p) => p.x >= 0 && p.y >= 0 && p.x + p.w <= w && p.y + p.h <= h);
}

/** Duas peças que "se enfrentam" (projeção sobrepõe num eixo) guardam distância ≥ kerf no outro eixo — Seção 8.2/V2. */
function respeitaKerf(pecas: PecaPosicionada[], kerf: number): boolean {
  for (let i = 0; i < pecas.length; i++) {
    for (let j = i + 1; j < pecas.length; j++) {
      const a = pecas[i];
      const b = pecas[j];
      const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
      const overlapY = a.y < b.y + b.h && b.y < a.y + a.h;
      if (overlapX && !overlapY) {
        const gap = a.y >= b.y + b.h ? a.y - (b.y + b.h) : b.y - (a.y + a.h);
        if (gap > 0 && gap < kerf) return false;
      }
      if (overlapY && !overlapX) {
        const gap = a.x >= b.x + b.w ? a.x - (b.x + b.w) : b.x - (a.x + a.w);
        if (gap > 0 && gap < kerf) return false;
      }
    }
  }
  return true;
}

describe("empacotarChapas — guilhotina com retângulos livres + busca por permutação (§8.3)", () => {
  it("empacota 4 peças 800×600 numa única chapa, sem sobreposição e dentro dos limites", () => {
    // Algoritmo mudou de shelf-first (3 numa prateleira, 4ª abre outra) para
    // guilhotina com retângulos livres + busca — o arranjo exato não é mais
    // "3 na mesma prateleira" (a busca pode preferir empilhar verticalmente
    // se isso deixar retângulos livres mais aproveitáveis). O que continua
    // sendo invariante é: cabe numa chapa só, sem sobrepor, dentro dos limites.
    const entrada = Array.from({ length: 4 }, (_, i) => ({
      id: String(i),
      nome: "Painel",
      w: 800,
      h: 600,
      temVeio: false,
    }));
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(0);
    expect(chapas).toHaveLength(1);
    expect(chapas[0].pecas).toHaveLength(4);
    expect(semSobreposicao(chapas[0].pecas)).toBe(true);
    expect(dentroDaChapa(chapas[0].pecas, CHAPA_LARGURA_MM, CHAPA_ALTURA_MM)).toBe(true);
  });

  it("calcula o aproveitamento como área ocupada / área da chapa", () => {
    const entrada = [{ id: "1", nome: "P", w: 1000, h: 1000, temVeio: false }];
    const { chapas } = empacotarChapas(entrada, 2750, 1840);
    expect(chapas[0].aproveitamento).toBeCloseTo((1000 * 1000) / (2750 * 1840), 6);
  });

  it("gira a peça quando necessário para caber na chapa", () => {
    // 1000×2600 não cabe na orientação original (altura 2600 > 1840), mas
    // cabe girada (2600×1000, já que 2600 <= 2750 e 1000 <= 1840).
    const entrada = [{ id: "1", nome: "Rotada", w: 1000, h: 2600, temVeio: false }];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(0);
    expect(chapas).toHaveLength(1);
    expect(chapas[0].pecas[0]).toMatchObject({ w: 2600, h: 1000 });
  });

  it("marca como fora-da-chapa peças maiores que a chapa em qualquer orientação", () => {
    const entrada = [{ id: "1", nome: "Gigante", w: 3000, h: 3000, temVeio: false }];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(1);
    expect(chapas.every((c) => c.pecas.length === 0)).toBe(true);
  });

  it("abre uma nova chapa quando 3 peças de largura cheia não cabem empilhadas numa só", () => {
    // Peças de 2750×620 (largura = largura da chapa inteira): cada uma só
    // pode empilhar, nunca lado a lado. 2 cabem (1240mm) mas a 3ª não
    // (1860>1840) — geometricamente impossível caber as 3 numa chapa só,
    // com ou sem busca.
    const entrada = Array.from({ length: 3 }, (_, i) => ({
      id: String(i),
      nome: "Full",
      w: 2750,
      h: 620,
      temVeio: false,
    }));
    const { chapas } = empacotarChapas(entrada);
    expect(chapas).toHaveLength(2);
    expect(chapas[0].pecas).toHaveLength(2);
    expect(chapas[1].pecas).toHaveLength(1);
  });
});

describe("planoDeCorte — agrupamento por material", () => {
  it("agrupa peças por cor×espessura em grupos separados", () => {
    const pecas: Peca[] = [
      { nome: "Lateral", quantidade: 2, material_tipo: "caixa", cor: "Branco TX", espessura_mm: 15, altura_mm: 720, largura_mm: 550, area_m2: 0, fita_m: 0, temVeio: false, sentidoVeio: "comprimento" },
      { nome: "Porta", quantidade: 2, material_tipo: "frente", cor: "Louro Freijó", espessura_mm: 18, altura_mm: 700, largura_mm: 400, area_m2: 0, fita_m: 0, temVeio: false, sentidoVeio: "comprimento" },
    ];
    const grupos = planoDeCorte(pecas);
    expect(grupos).toHaveLength(2);
    const brancoTx = grupos.find((g) => g.cor === "Branco TX")!;
    expect(brancoTx.espessura_mm).toBe(15);
    expect(brancoTx.chapas.reduce((s, c) => s + c.pecas.length, 0)).toBe(2);
  });

  it("expande a quantidade em peças individuais", () => {
    const pecas: Peca[] = [
      { nome: "Prateleira", quantidade: 5, material_tipo: "prateleira", cor: "Branco TX", espessura_mm: 15, altura_mm: 300, largura_mm: 400, area_m2: 0, fita_m: 0, temVeio: false, sentidoVeio: "comprimento" },
    ];
    const [grupo] = planoDeCorte(pecas);
    const total = grupo.chapas.reduce((s, c) => s + c.pecas.length, 0);
    expect(total).toBe(5);
  });

  it("adiciona `meta` (§8.4) a cada grupo — aditivo, não quebra consumidor que ignora o campo", () => {
    const pecas: Peca[] = [
      { nome: "Prateleira", quantidade: 3, material_tipo: "prateleira", cor: "Branco TX", espessura_mm: 15, altura_mm: 300, largura_mm: 400, area_m2: 0, fita_m: 0, temVeio: false, sentidoVeio: "comprimento" },
    ];
    const [grupo] = planoDeCorte(pecas);
    expect(grupo.meta).toBeDefined();
    expect(grupo.meta!.chapasFinal).toBeLessThanOrEqual(grupo.meta!.chapasDeterministico);
  });
});

describe("empacotarChapas — veio de chapa (Seção 8, Task 12.5)", () => {
  it("peça com veio que cabe só numa orientação é posicionada nela, mesmo quando a rotacionada também caberia", () => {
    const entrada = [{ id: "1", nome: "Com veio", w: 1500, h: 800, temVeio: true }];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(0);
    expect(chapas[0].pecas[0]).toMatchObject({ w: 1500, h: 800 });
  });

  it("peça com veio cuja única orientação fixa NÃO cabe vai pra foraDaChapa, nunca é forçada rotacionada", () => {
    const entrada = [{ id: "1", nome: "Com veio", w: 1000, h: 2600, temVeio: true }];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(1);
    expect(foraDaChapa[0]).toMatchObject({ w: 1000, h: 2600 });
    expect(chapas.every((c) => c.pecas.length === 0)).toBe(true);
  });

  it("peça sem veio continua girando livremente quando necessário (não-regressão)", () => {
    const entrada = [{ id: "1", nome: "Sem veio", w: 1000, h: 2600, temVeio: false }];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(0);
    expect(chapas[0].pecas[0]).toMatchObject({ w: 2600, h: 1000 });
  });

  it("mix de peças com/sem veio no mesmo lote: cada uma segue sua própria regra", () => {
    const entrada = [
      { id: "veio", nome: "Com veio", w: 1000, h: 2600, temVeio: true },
      { id: "sem-veio", nome: "Sem veio", w: 1000, h: 2600, temVeio: false },
    ];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(1);
    expect(foraDaChapa[0].id).toBe("veio");
    const todas = chapas.flatMap((c) => c.pecas);
    expect(todas).toHaveLength(1);
    expect(todas[0].id).toBe("sem-veio");
    expect(todas[0]).toMatchObject({ w: 2600, h: 1000 });
  });
});

describe("planoDeCorte — veio de chapa: mix no mesmo grupo cor×espessura (Seção 8)", () => {
  it("cada peça (com/sem veio) segue sua própria regra dentro do mesmo grupo", () => {
    const pecas: Peca[] = [
      {
        nome: "Lateral com veio",
        quantidade: 1,
        material_tipo: "caixa",
        cor: "Branco TX",
        espessura_mm: 15,
        altura_mm: 2600,
        largura_mm: 1000,
        area_m2: 0,
        fita_m: 0,
        temVeio: true,
        sentidoVeio: "largura",
      },
      {
        nome: "Lateral sem veio",
        quantidade: 1,
        material_tipo: "caixa",
        cor: "Branco TX",
        espessura_mm: 15,
        altura_mm: 2600,
        largura_mm: 1000,
        area_m2: 0,
        fita_m: 0,
        temVeio: false,
        sentidoVeio: "comprimento",
      },
    ];
    const [grupo] = planoDeCorte(pecas);
    expect(grupo.pecasForaDaChapa).toHaveLength(0);
    const todas = grupo.chapas.flatMap((c) => c.pecas);
    expect(todas).toHaveLength(2);
    expect(todas.every((p) => p.w === 2600 && p.h === 1000)).toBe(true);
  });
});

describe("guilhotinavel — invariante de guilhotina (§8.1)", () => {
  it("0 ou 1 peça é sempre guilhotinável (caso base)", () => {
    expect(guilhotinavel({ x: 0, y: 0, w: 100, h: 100 }, [])).toBe(true);
    const p: PecaPosicionada = { id: "1", nome: "P", w: 50, h: 50, temVeio: false, x: 0, y: 0 };
    expect(guilhotinavel({ x: 0, y: 0, w: 100, h: 100 }, [p])).toBe(true);
  });

  it("duas peças lado a lado, separáveis por um corte vertical, são guilhotináveis", () => {
    const pecas: PecaPosicionada[] = [
      { id: "1", nome: "A", w: 50, h: 100, temVeio: false, x: 0, y: 0 },
      { id: "2", nome: "B", w: 50, h: 100, temVeio: false, x: 50, y: 0 },
    ];
    expect(guilhotinavel({ x: 0, y: 0, w: 100, h: 100 }, pecas)).toBe(true);
  });

  it("arranjo em cata-vento (pinwheel) NÃO é guilhotinável — nenhum corte de ponta a ponta separa as 4 peças", () => {
    // Clássico contraexemplo: 4 retângulos ao redor de um vazio central,
    // cada um cruzando o "meio" da região — nenhuma linha reta (vertical ou
    // horizontal) atravessa a região inteira sem cortar alguma peça.
    const pecas: PecaPosicionada[] = [
      { id: "A", nome: "A", w: 3, h: 1, temVeio: false, x: 0, y: 0 }, // x[0,3] y[0,1]
      { id: "B", nome: "B", w: 1, h: 3, temVeio: false, x: 3, y: 0 }, // x[3,4] y[0,3]
      { id: "C", nome: "C", w: 3, h: 1, temVeio: false, x: 1, y: 3 }, // x[1,4] y[3,4]
      { id: "D", nome: "D", w: 1, h: 3, temVeio: false, x: 0, y: 1 }, // x[0,1] y[1,4]
    ];
    expect(semSobreposicao(pecas)).toBe(true);
    expect(guilhotinavel({ x: 0, y: 0, w: 4, h: 4 }, pecas)).toBe(false);
  });
});

describe("§8.2 — kerf muda quantas peças cabem por chapa (exemplo trabalhado)", () => {
  it("40 peças 550×400, kerf 3 → N=3 chapas (16+16+8); kerf 0 → N=2 chapas (20+20)", () => {
    const entrada = Array.from({ length: 40 }, (_, i) => ({
      id: String(i),
      nome: "P",
      w: 550,
      h: 400,
      temVeio: false,
    }));

    const comKerf = empacotarChapas(entrada, 2750, 1840, 3);
    expect(comKerf.chapas).toHaveLength(3);
    expect(comKerf.foraDaChapa).toHaveLength(0);
    for (const c of comKerf.chapas) {
      expect(respeitaKerf(c.pecas, 3)).toBe(true);
      expect(semSobreposicao(c.pecas)).toBe(true);
    }

    const semKerf = empacotarChapas(entrada, 2750, 1840, 0);
    expect(semKerf.chapas).toHaveLength(2);
  });
});

describe("§8.3 exemplo 1 — bug do sarrafo (item 3.1 do backlog)", () => {
  it("painel 2600×1500 + sarrafo 70×1500 (kerf 3): N=1 chapa, não 2; aproveitamento 0,791502", () => {
    const entrada = [
      { id: "painel", nome: "Painel", w: 2600, h: 1500, temVeio: false },
      { id: "sarrafo", nome: "Sarrafo", w: 70, h: 1500, temVeio: false },
    ];
    const { chapas, foraDaChapa } = empacotarChapas(entrada, 2750, 1840, 3);
    expect(foraDaChapa).toHaveLength(0);
    expect(chapas).toHaveLength(1);
    expect(chapas[0].aproveitamento).toBeCloseTo(0.791502, 6);
    expect(semSobreposicao(chapas[0].pecas)).toBe(true);
    expect(guilhotinavel({ x: 0, y: 0, w: 2750, h: 1840 }, chapas[0].pecas)).toBe(true);
  });
});

describe("§8.3 exemplo 2 — por que uma passada só não basta", () => {
  it("P 1400×1000, Q 1400×840, R 1350×1840 (kerf 0): a busca acha 1 chapa, não fica presa em 2", () => {
    const entrada = [
      { id: "P", nome: "P", w: 1400, h: 1000, temVeio: false },
      { id: "Q", nome: "Q", w: 1400, h: 840, temVeio: false },
      { id: "R", nome: "R", w: 1350, h: 1840, temVeio: false },
    ];
    const { chapas, foraDaChapa } = empacotarChapas(entrada, 2750, 1840, 0);
    expect(foraDaChapa).toHaveLength(0);
    expect(chapas).toHaveLength(1);
    expect(chapas[0].aproveitamento).toBeCloseTo(1, 6);
  });
});

describe("§8.5 — invariantes V1 a V7", () => {
  const entradaMista = [
    { id: "a", nome: "A", w: 1400, h: 950, temVeio: false },
    { id: "b", nome: "B", w: 1400, h: 950, temVeio: false },
    { id: "c", nome: "C", w: 600, h: 400, temVeio: true },
    { id: "d", nome: "D", w: 900, h: 300, temVeio: false },
    { id: "e", nome: "E", w: 5000, h: 5000, temVeio: false }, // maior que a chapa em qualquer orientação
  ];

  it("V1 — conservação de peças: cada id aparece exatamente uma vez em chapas ∪ foraDaChapa", () => {
    const { chapas, foraDaChapa } = empacotarChapas(entradaMista, 2750, 1840, 3);
    const idsColocados = chapas.flatMap((c) => c.pecas.map((p) => p.id));
    const idsFora = foraDaChapa.map((p) => p.id);
    const todos = [...idsColocados, ...idsFora].sort();
    expect(todos).toEqual(entradaMista.map((p) => p.id).sort());
    // exatamente uma vez cada — sem duplicata nem perda
    expect(new Set(todos).size).toBe(entradaMista.length);
  });

  it("V2 — geometria: sem sobreposição, dentro da chapa, kerf respeitado entre peças enfrentadas", () => {
    const { chapas } = empacotarChapas(entradaMista, 2750, 1840, 3);
    for (const c of chapas) {
      expect(semSobreposicao(c.pecas)).toBe(true);
      expect(dentroDaChapa(c.pecas, 2750, 1840)).toBe(true);
      expect(respeitaKerf(c.pecas, 3)).toBe(true);
    }
  });

  it("V3 — veio respeitado: peça com temVeio sai com w/h idênticos à entrada", () => {
    // "c" (600×400, temVeio) cabe também rotacionada (400×600) — se o
    // algoritmo girasse peça com veio pra ganhar aproveitamento, o teste
    // pegaria aqui.
    const { chapas } = empacotarChapas(entradaMista, 2750, 1840, 3);
    const c = chapas.flatMap((ch) => ch.pecas).find((p) => p.id === "c")!;
    expect(c).toMatchObject({ w: 600, h: 400 });
  });

  it("V4 — aproveitamento coerente (tolerância 1e-6): 3 peças 2000×600, kerf 3 → 180/253", () => {
    const entrada = [
      { id: "0", nome: "P", w: 2000, h: 600, temVeio: false },
      { id: "1", nome: "P", w: 2000, h: 600, temVeio: false },
      { id: "2", nome: "P", w: 2000, h: 600, temVeio: false },
    ];
    const { chapas } = empacotarChapas(entrada, 2750, 1840, 3);
    expect(chapas).toHaveLength(1);
    const esperado = 180 / 253;
    expect(Math.abs(chapas[0].aproveitamento - esperado)).toBeLessThan(1e-6);
  });

  it("V5 — guilhotinável para toda chapa produzida", () => {
    const { chapas } = empacotarChapas(entradaMista, 2750, 1840, 3);
    for (const c of chapas) {
      expect(guilhotinavel({ x: 0, y: 0, w: 2750, h: 1840 }, c.pecas)).toBe(true);
    }
  });

  it("V6 — monotonicidade: chapasFinal ≤ chapasDeterministico, mesmos parâmetros", () => {
    const casos: PecaRetangular[][] = [
      entradaMista,
      gerarLote(40, 550, 400),
      [
        { id: "painel", nome: "Painel", w: 2600, h: 1500, temVeio: false },
        { id: "sarrafo", nome: "Sarrafo", w: 70, h: 1500, temVeio: false },
      ],
    ];
    for (const entrada of casos) {
      const { meta } = empacotarChapas(entrada, 2750, 1840, 3);
      expect(meta.chapasFinal).toBeLessThanOrEqual(meta.chapasDeterministico);
    }
  });

  it("V7 — determinismo: mesma entrada duas vezes → saída estruturalmente idêntica", () => {
    const r1 = empacotarChapas(entradaMista, 2750, 1840, 3);
    const r2 = empacotarChapas(entradaMista, 2750, 1840, 3);
    expect(r1).toEqual(r2);

    const p1 = planoDeCorte(pecasDeTeste(), 2750, 1840, 3);
    const p2 = planoDeCorte(pecasDeTeste(), 2750, 1840, 3);
    expect(p1).toEqual(p2);
  });
});

function gerarLote(n: number, w: number, h: number): PecaRetangular[] {
  return Array.from({ length: n }, (_, i) => ({ id: String(i), nome: "P", w, h, temVeio: false }));
}

function pecasDeTeste(): Peca[] {
  return [
    { nome: "Lateral", quantidade: 3, material_tipo: "caixa", cor: "Branco TX", espessura_mm: 15, altura_mm: 720, largura_mm: 550, area_m2: 0, fita_m: 0, temVeio: false, sentidoVeio: "comprimento" },
    { nome: "Fundo", quantidade: 2, material_tipo: "caixa", cor: "Branco TX", espessura_mm: 15, altura_mm: 400, largura_mm: 900, area_m2: 0, fita_m: 0, temVeio: false, sentidoVeio: "comprimento" },
  ];
}
