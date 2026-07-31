import { describe, expect, it } from "vitest";
import { rebalancearLinhas, type LinhaRateada } from "./rebalancear";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function somaValores(linhas: LinhaRateada[]): number {
  return round2(linhas.reduce((s, l) => s + l.valorRateado, 0));
}

describe("rebalancearLinhas", () => {
  it("2 linhas — override na PRIMEIRA: soma continua igual a precoFinal", () => {
    const linhas: LinhaRateada[] = [
      { id: "a", valorRateado: 600 },
      { id: "b", valorRateado: 400 },
    ];
    const precoFinal = 1000;
    const resultado = rebalancearLinhas(linhas, "a", 800, precoFinal);
    expect(somaValores(resultado)).toBe(precoFinal);
    expect(resultado.find((l) => l.id === "a")?.valorRateado).toBe(800);
    // única "outra" linha absorve o resíduo inteiro (200).
    expect(resultado.find((l) => l.id === "b")?.valorRateado).toBe(200);
    // ordem preservada.
    expect(resultado.map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("2 linhas — override na ÚLTIMA: soma continua igual a precoFinal", () => {
    const linhas: LinhaRateada[] = [
      { id: "a", valorRateado: 600 },
      { id: "b", valorRateado: 400 },
    ];
    const precoFinal = 1000;
    const resultado = rebalancearLinhas(linhas, "b", 100, precoFinal);
    expect(somaValores(resultado)).toBe(precoFinal);
    expect(resultado.find((l) => l.id === "b")?.valorRateado).toBe(100);
    expect(resultado.find((l) => l.id === "a")?.valorRateado).toBe(900);
  });

  it("3 linhas — override NO MEIO: redistribui proporcional ao peso das outras duas, soma exata", () => {
    const linhas: LinhaRateada[] = [
      { id: "a", valorRateado: 500 },
      { id: "b", valorRateado: 300 },
      { id: "c", valorRateado: 200 },
    ];
    const precoFinal = 1000;
    const resultado = rebalancearLinhas(linhas, "b", 100, precoFinal);
    expect(somaValores(resultado)).toBe(precoFinal);
    expect(resultado.find((l) => l.id === "b")?.valorRateado).toBe(100);
    // restante = 900, dividido proporcional a pesos [500, 200] (a e c) — a:
    // 900 * 500/700 = 642.857... -> 642.86 (não-última absorve resíduo só na
    // última posição do array de "outras", que aqui é "c").
    const a = resultado.find((l) => l.id === "a")!.valorRateado;
    const c = resultado.find((l) => l.id === "c")!.valorRateado;
    expect(round2(a + c)).toBe(900);
    expect(a).toBeCloseTo(642.86, 2);
  });

  it("3 linhas — override NA PONTA (primeira): soma exata, ordem preservada", () => {
    const linhas: LinhaRateada[] = [
      { id: "a", valorRateado: 500 },
      { id: "b", valorRateado: 300 },
      { id: "c", valorRateado: 200 },
    ];
    const precoFinal = 1000;
    const resultado = rebalancearLinhas(linhas, "a", 700, precoFinal);
    expect(somaValores(resultado)).toBe(precoFinal);
    expect(resultado.map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(resultado.find((l) => l.id === "a")?.valorRateado).toBe(700);
  });

  it("3 linhas — override NA PONTA (última): soma exata", () => {
    const linhas: LinhaRateada[] = [
      { id: "a", valorRateado: 500 },
      { id: "b", valorRateado: 300 },
      { id: "c", valorRateado: 200 },
    ];
    const precoFinal = 1000;
    const resultado = rebalancearLinhas(linhas, "c", 50, precoFinal);
    expect(somaValores(resultado)).toBe(precoFinal);
    expect(resultado.find((l) => l.id === "c")?.valorRateado).toBe(50);
  });

  it("múltiplos overrides em sequência (A depois B) rebalanceiam sobre o estado atual, soma sempre exata", () => {
    const precoFinal = 1000;
    const iniciais: LinhaRateada[] = [
      { id: "a", valorRateado: 500 },
      { id: "b", valorRateado: 300 },
      { id: "c", valorRateado: 200 },
    ];
    const depoisDeA = rebalancearLinhas(iniciais, "a", 400, precoFinal);
    expect(somaValores(depoisDeA)).toBe(precoFinal);

    const depoisDeB = rebalancearLinhas(depoisDeA, "b", 350, precoFinal);
    expect(somaValores(depoisDeB)).toBe(precoFinal);
    expect(depoisDeB.find((l) => l.id === "b")?.valorRateado).toBe(350);
    // "a" NÃO fica travado no valor da edição anterior (400) — a segunda
    // edição rebalanceia sobre o estado atual, incluindo "a" entre as
    // "outras" linhas dessa chamada (decisão documentada em rebalancear.ts).
    expect(depoisDeB.find((l) => l.id === "a")?.valorRateado).not.toBe(400);
  });

  it("pesos todos zero (linhas com valorRateado 0) divide igualmente entre as demais", () => {
    const linhas: LinhaRateada[] = [
      { id: "a", valorRateado: 0 },
      { id: "b", valorRateado: 0 },
      { id: "c", valorRateado: 0 },
    ];
    const precoFinal = 300;
    const resultado = rebalancearLinhas(linhas, "a", 100, precoFinal);
    expect(somaValores(resultado)).toBe(precoFinal);
    expect(resultado.find((l) => l.id === "b")?.valorRateado).toBe(100);
    expect(resultado.find((l) => l.id === "c")?.valorRateado).toBe(100);
  });

  it("id inexistente devolve o array original sem alteração", () => {
    const linhas: LinhaRateada[] = [
      { id: "a", valorRateado: 500 },
      { id: "b", valorRateado: 500 },
    ];
    const resultado = rebalancearLinhas(linhas, "nao-existe", 999, 1000);
    expect(resultado).toBe(linhas);
  });
});
