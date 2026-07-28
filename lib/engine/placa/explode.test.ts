import { describe, it, expect } from "vitest";
import { explodePlaca } from "./explode";
import type { Placa } from "./types";

// Reproduz peça a peça (contagem E dimensões exatas) os 6 exemplos de
// conferência da Seção 2.1 do Modelo de Domínio (placa 1000×500).

const MATERIAL_15 = { cor: "Branco TX", espessura: 15 };
const MATERIAL_18 = { cor: "Branco TX", espessura: 18 };

function placaBase(overrides: Partial<Placa> = {}): Placa {
  return {
    id: "placa-1",
    nome: "Placa de teste",
    largura: 1000,
    altura: 500,
    material: MATERIAL_15,
    orientacao: "horizontal",
    ...overrides,
  };
}

/** Soma as quantidades de peças que batem exatamente com altura×largura (em
 * qualquer ordem, já que "altura_mm"/"largura_mm" são só rótulos genéricos de
 * dimensão — não a orientação real da peça na parede). */
function qtdPorDimensao(pecas: { altura_mm: number; largura_mm: number; quantidade: number }[], a: number, b: number) {
  return pecas
    .filter(
      (p) => (p.altura_mm === a && p.largura_mm === b) || (p.altura_mm === b && p.largura_mm === a)
    )
    .reduce((s, p) => s + p.quantidade, 0);
}

describe("explodePlaca — engrossamento/dobra (6 exemplos da Seção 2.1)", () => {
  it("Exemplo 1: Engrossada 30mm (nível 1), 4 lados → 1×1000×500 + 2×1000×70 + 2×360×70", () => {
    const r = explodePlaca(
      placaBase({
        engrossamento: {
          tecnica: "engrossada",
          nivel: 1,
          lados: ["superior", "inferior", "esquerda", "direita"],
        },
      })
    );

    expect(qtdPorDimensao(r.pecas, 500, 1000)).toBe(1);
    expect(qtdPorDimensao(r.pecas, 1000, 70)).toBe(2);
    expect(qtdPorDimensao(r.pecas, 360, 70)).toBe(2);
    expect(r.pecas.reduce((s, p) => s + p.quantidade, 0)).toBe(5);
  });

  it("Exemplo 2: Dobrada 30mm (nível 1) → 2×1000×500", () => {
    const r = explodePlaca(placaBase({ engrossamento: { tecnica: "dobrada", nivel: 1 } }));

    expect(qtdPorDimensao(r.pecas, 500, 1000)).toBe(2);
    expect(r.pecas.reduce((s, p) => s + p.quantidade, 0)).toBe(2);
  });

  it("Exemplo 3: Engrossada 45mm (nível 2), 4 lados → 1×1000×500 + 4×1000×70 + 4×360×70", () => {
    const r = explodePlaca(
      placaBase({
        engrossamento: {
          tecnica: "engrossada",
          nivel: 2,
          lados: ["superior", "inferior", "esquerda", "direita"],
        },
      })
    );

    expect(qtdPorDimensao(r.pecas, 500, 1000)).toBe(1);
    expect(qtdPorDimensao(r.pecas, 1000, 70)).toBe(4);
    expect(qtdPorDimensao(r.pecas, 360, 70)).toBe(4);
    expect(r.pecas.reduce((s, p) => s + p.quantidade, 0)).toBe(9);
  });

  it("Exemplo 4: Dobrada 45mm (nível 2) → 3×1000×500", () => {
    const r = explodePlaca(placaBase({ engrossamento: { tecnica: "dobrada", nivel: 2 } }));

    expect(qtdPorDimensao(r.pecas, 500, 1000)).toBe(3);
  });

  it("Exemplo 5: Engrossada 60mm (nível 3), 4 lados → 1×1000×500 + 6×1000×70 + 6×360×70", () => {
    const r = explodePlaca(
      placaBase({
        engrossamento: {
          tecnica: "engrossada",
          nivel: 3,
          lados: ["superior", "inferior", "esquerda", "direita"],
        },
      })
    );

    expect(qtdPorDimensao(r.pecas, 500, 1000)).toBe(1);
    expect(qtdPorDimensao(r.pecas, 1000, 70)).toBe(6);
    expect(qtdPorDimensao(r.pecas, 360, 70)).toBe(6);
    expect(r.pecas.reduce((s, p) => s + p.quantidade, 0)).toBe(13);
  });

  it("Exemplo 6: Dobrada 60mm (nível 3) → 4×1000×500", () => {
    const r = explodePlaca(placaBase({ engrossamento: { tecnica: "dobrada", nivel: 3 } }));

    expect(qtdPorDimensao(r.pecas, 500, 1000)).toBe(4);
  });
});

describe("explodePlaca — engrossamento parcial (só 2 lados de 1000)", () => {
  it("nível 1, só superior+inferior → 1×1000×500 + 2×1000×70, SEM sarrafo de 360", () => {
    const r = explodePlaca(
      placaBase({
        engrossamento: {
          tecnica: "engrossada",
          nivel: 1,
          lados: ["superior", "inferior"],
        },
      })
    );

    expect(qtdPorDimensao(r.pecas, 500, 1000)).toBe(1);
    expect(qtdPorDimensao(r.pecas, 1000, 70)).toBe(2);
    expect(qtdPorDimensao(r.pecas, 360, 70)).toBe(0);
    expect(r.pecas.reduce((s, p) => s + p.quantidade, 0)).toBe(3);
  });
});

describe("explodePlaca — ripado (Seção 2.2)", () => {
  it("gera N ripas + espaçamento consistente com a fórmula geométrica", () => {
    // placa 1000×500, dimensão maior = 1000 (largura); 6 ripas de 100mm cada.
    const r = explodePlaca(
      placaBase({ ripado: { larguraRipa: 100, quantidade: 6 } })
    );

    const ripas = r.pecas.filter((p) => p.nome === "Ripa");
    expect(ripas).toHaveLength(1);
    expect(ripas[0].quantidade).toBe(6);
    // Cada ripa corre a dimensão menor (altura=500) e tem largura=larguraRipa.
    expect(qtdPorDimensao(r.pecas, 500, 100)).toBe(6);

    // espacamento = (dimMaior - N*larguraRipa) / (N-1) = (1000 - 600) / 5 = 80
    expect(r.espacamentoRipasMm).toBe(80);
  });

  it("com N=1 não há vão entre ripas (espaçamento 0)", () => {
    const r = explodePlaca(placaBase({ ripado: { larguraRipa: 100, quantidade: 1 } }));
    expect(r.espacamentoRipasMm).toBe(0);
    expect(qtdPorDimensao(r.pecas, 500, 100)).toBe(1);
  });
});

describe("explodePlaca — validação de nível máximo por espessura base", () => {
  it("nível 3 com base 18mm lança erro (engrossada)", () => {
    expect(() =>
      explodePlaca(
        placaBase({
          material: MATERIAL_18,
          engrossamento: {
            tecnica: "engrossada",
            nivel: 3,
            lados: ["superior", "inferior", "esquerda", "direita"],
          },
        })
      )
    ).toThrow();
  });

  it("nível 3 com base 18mm lança erro (dobrada)", () => {
    expect(() =>
      explodePlaca(
        placaBase({ material: MATERIAL_18, engrossamento: { tecnica: "dobrada", nivel: 3 } })
      )
    ).toThrow();
  });

  it("nível 3 com base 15mm funciona normalmente (não regride)", () => {
    expect(() =>
      explodePlaca(
        placaBase({
          material: MATERIAL_15,
          engrossamento: {
            tecnica: "engrossada",
            nivel: 3,
            lados: ["superior", "inferior", "esquerda", "direita"],
          },
        })
      )
    ).not.toThrow();

    const r = explodePlaca(
      placaBase({ material: MATERIAL_15, engrossamento: { tecnica: "dobrada", nivel: 3 } })
    );
    expect(qtdPorDimensao(r.pecas, 500, 1000)).toBe(4);
  });

  it("nível 1/2 com base 18mm funcionam normalmente", () => {
    expect(() =>
      explodePlaca(
        placaBase({ material: MATERIAL_18, engrossamento: { tecnica: "dobrada", nivel: 1 } })
      )
    ).not.toThrow();
    expect(() =>
      explodePlaca(
        placaBase({ material: MATERIAL_18, engrossamento: { tecnica: "dobrada", nivel: 2 } })
      )
    ).not.toThrow();
  });
});

describe("explodePlaca — placa simples (sem modificadores)", () => {
  it("gera 1 peça inteira nas dimensões de face", () => {
    const r = explodePlaca(placaBase());
    expect(r.pecas).toHaveLength(1);
    expect(qtdPorDimensao(r.pecas, 500, 1000)).toBe(1);
    expect(r.pecas[0].espessura_mm).toBe(15);
    expect(r.ferragens).toEqual([]);
  });
});

describe("explodePlaca — sentidoVeio (Seção 8, Task 13.1)", () => {
  it("omitir sentidoVeio mantém default 'comprimento' em toda peça (caso simples)", () => {
    const r = explodePlaca(placaBase());
    expect(r.pecas.length).toBeGreaterThan(0);
    expect(r.pecas.every((p) => p.sentidoVeio === "comprimento")).toBe(true);
  });

  it("sentidoVeio: 'largura' na Placa propaga para toda peça gerada (caso simples)", () => {
    const r = explodePlaca(placaBase({ sentidoVeio: "largura" }));
    expect(r.pecas.length).toBeGreaterThan(0);
    expect(r.pecas.every((p) => p.sentidoVeio === "largura")).toBe(true);
  });

  it("sentidoVeio: 'largura' propaga para todas as peças de um caso de engrossamento (múltiplas peças)", () => {
    const r = explodePlaca(
      placaBase({
        sentidoVeio: "largura",
        engrossamento: {
          tecnica: "engrossada",
          nivel: 1,
          lados: ["superior", "inferior", "esquerda", "direita"],
        },
      })
    );
    expect(r.pecas.reduce((s, p) => s + p.quantidade, 0)).toBe(5);
    expect(r.pecas.every((p) => p.sentidoVeio === "largura")).toBe(true);
  });

  it("omitir sentidoVeio num caso de engrossamento continua default 'comprimento' em todas as peças", () => {
    const r = explodePlaca(
      placaBase({
        engrossamento: {
          tecnica: "engrossada",
          nivel: 1,
          lados: ["superior", "inferior", "esquerda", "direita"],
        },
      })
    );
    expect(r.pecas.reduce((s, p) => s + p.quantidade, 0)).toBe(5);
    expect(r.pecas.every((p) => p.sentidoVeio === "comprimento")).toBe(true);
  });
});
