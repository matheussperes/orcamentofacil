import { describe, expect, it } from "vitest";
import { montarLinhasInsumos } from "./insumos";
import { aplicarOverridesQuantidade } from "./lista-material/aplicarOverrides";
import { PRECOS_REFERENCIA } from "./engine/prices";
import type { EngineOutput } from "./engine/types";

function engineBase(fitaPorCor: EngineOutput["consolidado"]["fitaPorCor"]): EngineOutput {
  return {
    porModulo: [],
    globais: [],
    consolidado: {
      mdf: [],
      fitaTotalM: fitaPorCor.reduce((s, g) => s + g.metros, 0),
      fitaPorCor,
      ferragens: [],
    },
    warnings: [],
  };
}

describe("montarLinhasInsumos — fita discriminada por cor (Task 3.5 front)", () => {
  it("gera uma linha por grupo de fitaPorCor, item no padrão 'Fita de borda {cor} {larguraFitaMm}mm'", () => {
    const engine = engineBase([
      { cor: "Branco TX", larguraFitaMm: 22, metros: 5 },
      { cor: "Preto TX", larguraFitaMm: 35, metros: 3 },
    ]);
    const { linhas } = montarLinhasInsumos(engine, PRECOS_REFERENCIA);
    const fitas = linhas.filter((l) => l.categoria === "Acabamento");
    expect(fitas).toHaveLength(2);
    expect(fitas[0].item).toBe("Fita de borda Branco TX 22mm");
    expect(fitas[1].item).toBe("Fita de borda Preto TX 35mm");
  });

  it("total de cada linha = metros × precos.fitaMetro, mesmo preço genérico para todas as cores", () => {
    const engine = engineBase([
      { cor: "Branco TX", larguraFitaMm: 22, metros: 5 },
      { cor: "Preto TX", larguraFitaMm: 35, metros: 3 },
    ]);
    const { linhas } = montarLinhasInsumos(engine, PRECOS_REFERENCIA);
    const fitas = linhas.filter((l) => l.categoria === "Acabamento");
    expect(fitas[0].unit).toBe(PRECOS_REFERENCIA.fitaMetro);
    expect(fitas[1].unit).toBe(PRECOS_REFERENCIA.fitaMetro);
    expect(fitas[0].total).toBe(5 * PRECOS_REFERENCIA.fitaMetro);
    expect(fitas[1].total).toBe(3 * PRECOS_REFERENCIA.fitaMetro);
  });

  it("soma dos totais de fita bate com fitaTotalM × precos.fitaMetro (nada perdido/duplicado na migração 1→N)", () => {
    const engine = engineBase([
      { cor: "Branco TX", larguraFitaMm: 22, metros: 5.4 },
      { cor: "Preto TX", larguraFitaMm: 35, metros: 3.1 },
      { cor: "Branco TX", larguraFitaMm: 35, metros: 1.2 },
    ]);
    const { linhas } = montarLinhasInsumos(engine, PRECOS_REFERENCIA);
    const somaFitas = linhas
      .filter((l) => l.categoria === "Acabamento")
      .reduce((s, l) => s + l.total, 0);
    const esperadoAgregado =
      Math.round(engine.consolidado.fitaTotalM * PRECOS_REFERENCIA.fitaMetro * 100) / 100;
    expect(Math.round(somaFitas * 100) / 100).toBe(esperadoAgregado);
  });

  it("sem peça com fita (fitaPorCor vazio), nenhuma linha de fita aparece", () => {
    const engine = engineBase([]);
    const { linhas } = montarLinhasInsumos(engine, PRECOS_REFERENCIA);
    expect(linhas.some((l) => l.categoria === "Acabamento")).toBe(false);
  });

  it("override de quantidade (Task 3.8) continua funcionando numa linha de fita discriminada", () => {
    const engine = engineBase([{ cor: "Branco TX", larguraFitaMm: 22, metros: 5 }]);
    const { linhas } = montarLinhasInsumos(engine, PRECOS_REFERENCIA);
    const resultado = aplicarOverridesQuantidade(linhas, [
      { itemChave: "Fita de borda Branco TX 22mm", quantidade: 10 },
    ]);
    const fita = resultado.find((l) => l.item === "Fita de borda Branco TX 22mm");
    expect(fita?.total).toBe(10 * PRECOS_REFERENCIA.fitaMetro);
  });
});
