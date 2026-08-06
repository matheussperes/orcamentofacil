import { describe, expect, it } from "vitest";
import { canonicoParaValor, valorParaCanonico } from "./referenciaMedida";

describe("valorParaCanonico / canonicoParaValor — exemplo trabalhado: janela cotada pela direita/teto", () => {
  // parede 3000 x 2700; janela 1200 x 1000; refX "direita" 600; refY "teto" 1100
  const L = 3000;
  const H = 2700;
  const largura = 1200;
  const altura = 1000;

  it("x = L - valor - largura = 1200", () => {
    expect(valorParaCanonico(600, "direita", L, largura)).toBe(1200);
  });

  it("y = H - valor - altura = 600", () => {
    expect(valorParaCanonico(1100, "teto", H, altura)).toBe(600);
  });

  it("reexibição na mesma referência devolve o valor original", () => {
    expect(canonicoParaValor(1200, "direita", L, largura)).toBe(600);
    expect(canonicoParaValor(600, "teto", H, altura)).toBe(1100);
  });
});

describe("valorParaCanonico / canonicoParaValor — exemplo trabalhado: pedra", () => {
  // parede 3000 x 2700; pedra 2400 x 30; refX "esquerda" 0; refY "chao" 870
  const L = 3000;
  const H = 2700;
  const largura = 2400;
  const altura = 30;

  it("x = valor = 0", () => {
    expect(valorParaCanonico(0, "esquerda", L, largura)).toBe(0);
  });

  it("y = valor = 870", () => {
    expect(valorParaCanonico(870, "chao", H, altura)).toBe(870);
  });

  it("reexibição na mesma referência devolve o valor original", () => {
    expect(canonicoParaValor(0, "esquerda", L, largura)).toBe(0);
    expect(canonicoParaValor(870, "chao", H, altura)).toBe(870);
  });
});

describe("ida-e-volta nas 4 combinações refX/refY", () => {
  const L = 3000;
  const H = 2700;
  const largura = 800;
  const altura = 1000;

  it.each([
    ["esquerda", 200],
    ["direita", 200],
  ] as const)("refX %s: valor %d sobrevive ao ciclo entrada/exibição", (referencia, valor) => {
    const canonico = valorParaCanonico(valor, referencia, L, largura);
    expect(canonicoParaValor(canonico, referencia, L, largura)).toBe(valor);
  });

  it.each([
    ["chao", 900],
    ["teto", 900],
  ] as const)("refY %s: valor %d sobrevive ao ciclo entrada/exibição", (referencia, valor) => {
    const canonico = valorParaCanonico(valor, referencia, H, altura);
    expect(canonicoParaValor(canonico, referencia, H, altura)).toBe(valor);
  });
});
