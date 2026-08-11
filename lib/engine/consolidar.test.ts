import { describe, expect, it } from "vitest";
import { consolidarResultados, larguraFitaMm, pecaLinearParaPeca } from "./consolidar";
import type { Peca, PecaLinear, ResultadoModulo } from "./types";

// Task 1.7 — regressão: nº de chapas vem do bin-packing REAL
// (`planoDeCorte`), não de `Math.ceil(área / 5.06)`. Peças que não se
// encaixam bem juntas (baixo aproveitamento por chapa) fazem a área
// agregada subestimar quantas chapas físicas o plano de corte realmente usa
// — e é exatamente esse subdimensionamento que gerava custo "por chapa"
// abaixo do real.

function peca(overrides: Partial<Peca> = {}): Peca {
  return {
    nome: "Peça",
    quantidade: 1,
    material_tipo: "caixa",
    cor: "Branco TX",
    espessura_mm: 15,
    altura_mm: 950,
    largura_mm: 1400,
    area_m2: 1.33,
    fita_m: 0,
    temVeio: false,
    sentidoVeio: "comprimento",
    ...overrides,
  };
}

function modulo(pecas: Peca[]): ResultadoModulo {
  return {
    moduloId: "m1",
    templateCodigo: "T",
    nome: "Módulo",
    pecas,
    ferragens: [],
    areaMdfM2: pecas.reduce((s, p) => s + p.area_m2, 0),
    fitaM: 0,
  };
}

describe("consolidarResultados — chapas via bin-packing real", () => {
  it("conta 2 chapas (real) onde a fórmula de área antiga daria 1", () => {
    // 2× peça 1850×1000mm (área total 3,70 m² com perda 12% = 4,144 m²):
    // Math.ceil(4,144 / 5,06) = 1 chapa pela fórmula de área antiga.
    // Na chapa real (2750×1840mm) a peça só cabe numa orientação (1850
    // largura × 1000 altura — rotacionada, 1000×1850, não cabe: 1850>1840):
    // duas delas NÃO cabem lado a lado (1850+1850=3700>2750) nem empilhadas
    // (1000+1000=2000>1840), em NENHUMA combinação de orientação — o
    // bin-packing real (guilhotina + busca, Task 3.1/3.3) usa 2 chapas.
    //
    // Dimensões trocadas nesta rodada (Task 3.1/3.3-motor): as 1400×950mm
    // originais deste teste NÃO forçam mais 2 chapas com o algoritmo novo —
    // ele encontra uma combinação (uma peça rotacionada) que encaixa as
    // duas numa chapa só, o que é a correção esperada (empacota melhor, não
    // pior). 1850×1000mm é geometricamente impossível de unir em qualquer
    // combinação de orientação, então continua provando a divergência com a
    // fórmula de área independente de quão bom o algoritmo fique.
    const mod = modulo([peca({ quantidade: 2, largura_mm: 1850, altura_mm: 1000, area_m2: 3.7 })]);
    const out = consolidarResultados([mod], [], 0.12);

    expect(out.mdf).toHaveLength(1);
    expect(out.mdf[0].chapas).toBe(2);
    // Confirma a divergência com a fórmula de área antiga (documentação viva
    // do bug corrigido): ela daria 1.
    expect(Math.ceil(out.mdf[0].area_com_perda_m2 / (2.75 * 1.84))).toBe(1);
  });

  it("elementos contínuos (globais) entram no bin-packing via pecaLinearParaPeca", () => {
    const tampo: PecaLinear = {
      tipo: "tampo",
      parede: "p1",
      comprimento_mm: 1850,
      largura_mm: 1000,
      cor: "Branco TX",
      espessura_mm: 15,
      area_m2: 1.85,
      fita_m: 0,
      modulos: 1,
    };
    const mod = modulo([peca({ largura_mm: 1850, altura_mm: 1000, area_m2: 1.85 })]);
    const out = consolidarResultados([mod], [tampo], 0.12);

    expect(out.mdf).toHaveLength(1);
    // Mesma divergência do teste anterior, agora com uma peça vinda de
    // `globais`: 2 peças 1850×1000 não cabem numa chapa só (mesmo raciocínio
    // geométrico do teste acima).
    expect(out.mdf[0].chapas).toBe(2);
    expect(out.mdf[0].area_m2).toBeCloseTo(3.7, 4);
  });

  it("pecaLinearParaPeca converte tampo/rodapé com as dimensões trocadas (comprimento→largura_mm da Peca)", () => {
    const rodape: PecaLinear = {
      tipo: "rodape",
      parede: "p1",
      comprimento_mm: 2000,
      largura_mm: 100,
      cor: "Branco TX",
      espessura_mm: 15,
      area_m2: 0.2,
      fita_m: 2,
      modulos: 3,
    };
    const p = pecaLinearParaPeca(rodape);
    expect(p.nome).toBe("Rodapé contínuo");
    expect(p.largura_mm).toBe(2000);
    expect(p.altura_mm).toBe(100);
    expect(p.temVeio).toBe(false);
  });

  it("grupo sem peça alguma (defensivo) não deixa chapas undefined", () => {
    const out = consolidarResultados([], [], 0.1);
    expect(out.mdf).toEqual([]);
  });
});

// Task 3.5 — fita de borda discriminada por cor (Modelo-de-Dominio.md Seção
// 2.1, tabela "menor fita ≥ espessura final"). Cada caso confere também a
// invariante: soma dos grupos discriminados == fitaTotalM.
describe("larguraFitaMm — regra de catálogo (menor fita ≥ espessura final)", () => {
  it("cobre todas as espessuras válidas do domínio", () => {
    expect(larguraFitaMm(6)).toBe(22);
    expect(larguraFitaMm(15)).toBe(22);
    expect(larguraFitaMm(18)).toBe(22);
    expect(larguraFitaMm(25)).toBe(35);
    expect(larguraFitaMm(30)).toBe(35);
    expect(larguraFitaMm(36)).toBe(65);
    expect(larguraFitaMm(45)).toBe(65);
    expect(larguraFitaMm(54)).toBe(65);
    expect(larguraFitaMm(60)).toBe(65);
  });

  it("espessura acima do catálogo (>65mm) não tem fita — erro explícito, não valor mágico", () => {
    expect(() => larguraFitaMm(72)).toThrow();
  });
});

describe("consolidarResultados — fita de borda por cor (Task 3.5)", () => {
  it("(a) um único material/cor: um grupo só, metros == fitaTotalM", () => {
    const mod = modulo([
      peca({ cor: "Branco TX", espessura_mm: 15, fita_m: 3 }),
      peca({ cor: "Branco TX", espessura_mm: 15, fita_m: 2 }),
    ]);
    const out = consolidarResultados([{ ...mod, fitaM: 5 }], [], 0.12);

    expect(out.fitaTotalM).toBe(5);
    expect(out.fitaPorCor).toEqual([{ cor: "Branco TX", larguraFitaMm: 22, metros: 5 }]);
    // invariante: soma dos grupos discriminados == fitaTotalM
    const soma = out.fitaPorCor.reduce((s, g) => s + g.metros, 0);
    expect(soma).toBe(out.fitaTotalM);
  });

  it("(b) duas cores diferentes: dois grupos, ordenados por cor", () => {
    const mod = modulo([
      peca({ cor: "Preto Fosco", espessura_mm: 18, fita_m: 4 }),
      peca({ cor: "Branco TX", espessura_mm: 15, fita_m: 6 }),
    ]);
    const out = consolidarResultados([{ ...mod, fitaM: 10 }], [], 0.12);

    expect(out.fitaTotalM).toBe(10);
    expect(out.fitaPorCor).toEqual([
      { cor: "Branco TX", larguraFitaMm: 22, metros: 6 },
      { cor: "Preto Fosco", larguraFitaMm: 22, metros: 4 },
    ]);
    const soma = out.fitaPorCor.reduce((s, g) => s + g.metros, 0);
    expect(soma).toBe(out.fitaTotalM);
  });

  it("(c) mesma cor em duas espessuras que caem em larguras de fita diferentes: discrimina por (cor, larguraFitaMm)", () => {
    // Branco TX em 18mm (fita 22mm) e em 30mm (fita 35mm — tampo simples,
    // Seção 3.4.1) são produtos de fita distintos, mesma cor.
    const mod = modulo([
      peca({ cor: "Branco TX", espessura_mm: 18, fita_m: 3 }),
      peca({ cor: "Branco TX", espessura_mm: 30, fita_m: 2 }),
    ]);
    const out = consolidarResultados([{ ...mod, fitaM: 5 }], [], 0.12);

    expect(out.fitaTotalM).toBe(5);
    expect(out.fitaPorCor).toEqual([
      { cor: "Branco TX", larguraFitaMm: 22, metros: 3 },
      { cor: "Branco TX", larguraFitaMm: 35, metros: 2 },
    ]);
    const soma = out.fitaPorCor.reduce((s, g) => s + g.metros, 0);
    expect(soma).toBe(out.fitaTotalM);
  });

  it("elementos contínuos (globais) entram na discriminação por cor junto com peças de módulo", () => {
    const tampo: PecaLinear = {
      tipo: "tampo",
      parede: "p1",
      comprimento_mm: 1800,
      largura_mm: 600,
      cor: "Branco TX",
      espessura_mm: 30,
      area_m2: 1.08,
      fita_m: 3.02,
      modulos: 1,
    };
    const mod = modulo([peca({ cor: "Branco TX", espessura_mm: 15, fita_m: 4 })]);
    const out = consolidarResultados([{ ...mod, fitaM: 4 }], [tampo], 0.12);

    expect(out.fitaTotalM).toBeCloseTo(7.02, 4);
    expect(out.fitaPorCor).toEqual([
      { cor: "Branco TX", larguraFitaMm: 22, metros: 4 },
      { cor: "Branco TX", larguraFitaMm: 35, metros: 3.02 },
    ]);
    const soma = out.fitaPorCor.reduce((s, g) => s + g.metros, 0);
    expect(soma).toBeCloseTo(out.fitaTotalM, 4);
  });
});
