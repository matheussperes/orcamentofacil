import { describe, expect, it } from "vitest";
import { consolidarResultados, pecaLinearParaPeca } from "./consolidar";
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
    // 2× peça 1400×950mm (área total 2,66 m² com perda 12% = 2,9792 m²):
    // Math.ceil(2,9792 / 5,06) = 1 chapa pela fórmula de área antiga.
    // Na chapa real (2750×1840mm), duas dessas peças NÃO cabem lado a lado
    // (1400+1400 = 2800 > 2750) nem empilhadas (950+950 = 1900 > 1840) —
    // o bin-packing real usa 2 chapas.
    const mod = modulo([peca({ quantidade: 2, area_m2: 2.66 })]);
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
      comprimento_mm: 1400,
      largura_mm: 950,
      cor: "Branco TX",
      espessura_mm: 15,
      area_m2: 1.33,
      fita_m: 0,
      modulos: 1,
    };
    const mod = modulo([peca({ area_m2: 1.33 })]);
    const out = consolidarResultados([mod], [tampo], 0.12);

    expect(out.mdf).toHaveLength(1);
    // Mesma divergência do teste anterior, agora com uma peça vinda de
    // `globais`: 2 peças 1400×950 não cabem numa chapa só.
    expect(out.mdf[0].chapas).toBe(2);
    expect(out.mdf[0].area_m2).toBeCloseTo(2.66, 4);
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
