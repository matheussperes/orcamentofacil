import { describe, expect, it } from "vitest";
import { calcularRolosDeFita, montarLinhasInsumos } from "./insumos";
import { aplicarOverridesQuantidade } from "./lista-material/aplicarOverrides";
import { PRECOS_REFERENCIA } from "./engine/prices";
import type { EngineOutput, GrupoFita } from "./engine/types";

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

describe("montarLinhasInsumos — qtd de MDF sem m² (Task 3.7, RF-15)", () => {
  function engineComMdfEFerragens(): EngineOutput {
    return {
      porModulo: [],
      globais: [],
      consolidado: {
        mdf: [{ cor: "Branco TX", espessura_mm: 15, area_m2: 9.42, area_com_perda_m2: 10.5, chapas: 3 }],
        fitaTotalM: 5,
        fitaPorCor: [{ cor: "Branco TX", larguraFitaMm: 22, metros: 5 }],
        ferragens: [{ item: "dobradica", quantidade: 8 }],
      },
      warnings: [],
    };
  }

  it("linha de MDF: qtd é o número inteiro de chapas, sem 'chapa(s)' nem 'm²'", () => {
    const engine = engineComMdfEFerragens();
    const { linhas } = montarLinhasInsumos(engine, PRECOS_REFERENCIA);
    const mdf = linhas.find((l) => l.categoria === "Chapas");
    expect(mdf?.qtd).toBe("3");
    expect(mdf?.qtd).not.toMatch(/chapa|m²/);
    expect(mdf?.quantidadeBase).toBe(3);
  });

  it("linha de fita permanece '{metros} m' (inalterada)", () => {
    const engine = engineComMdfEFerragens();
    const { linhas } = montarLinhasInsumos(engine, PRECOS_REFERENCIA);
    const fita = linhas.find((l) => l.categoria === "Acabamento");
    expect(fita?.qtd).toBe("5.0 m");
  });

  it("linha de ferragens permanece bare-number (inalterada)", () => {
    const engine = engineComMdfEFerragens();
    const { linhas } = montarLinhasInsumos(engine, PRECOS_REFERENCIA);
    const ferragem = linhas.find((l) => l.categoria === "Ferragens");
    expect(ferragem?.qtd).toBe("8");
  });

  it("total da linha de MDF não muda (chapas × preço da chapa 15mm, sem relação com a string qtd)", () => {
    const engine = engineComMdfEFerragens();
    const { linhas } = montarLinhasInsumos(engine, PRECOS_REFERENCIA);
    const mdf = linhas.find((l) => l.categoria === "Chapas");
    expect(mdf?.total).toBe(3 * PRECOS_REFERENCIA.chapaPorEspessura[15]);
  });
});

describe("calcularRolosDeFita (Task 3.6)", () => {
  const grupos: GrupoFita[] = [
    { cor: "Branco TX", larguraFitaMm: 22, metros: 20 },
    { cor: "Preto TX", larguraFitaMm: 35, metros: 21 },
  ];

  it("divisão exata: 20m com rolo de 10m -> 2 rolos", () => {
    const [g] = calcularRolosDeFita([{ cor: "Branco TX", larguraFitaMm: 22, metros: 20 }], 10);
    expect(g).toEqual({ cor: "Branco TX", larguraFitaMm: 22, metros: 20, tamanhoRoloM: 10, rolos: 2 });
  });

  it("divisão com resto arredonda para cima: 21m com rolo de 10m -> 3 rolos", () => {
    const [g] = calcularRolosDeFita([{ cor: "Preto TX", larguraFitaMm: 35, metros: 21 }], 10);
    expect(g.rolos).toBe(3);
  });

  it("múltiplos grupos de cor usam o mesmo tamanhoRoloM", () => {
    const resultado = calcularRolosDeFita(grupos, 10);
    expect(resultado).toEqual([
      { cor: "Branco TX", larguraFitaMm: 22, metros: 20, tamanhoRoloM: 10, rolos: 2 },
      { cor: "Preto TX", larguraFitaMm: 35, metros: 21, tamanhoRoloM: 10, rolos: 3 },
    ]);
  });

  it("tamanhoRoloM ausente (undefined) -> array vazio", () => {
    expect(calcularRolosDeFita(grupos, undefined)).toEqual([]);
  });

  it("tamanhoRoloM zero -> array vazio", () => {
    expect(calcularRolosDeFita(grupos, 0)).toEqual([]);
  });

  it("tamanhoRoloM negativo -> array vazio", () => {
    expect(calcularRolosDeFita(grupos, -5)).toEqual([]);
  });
});
