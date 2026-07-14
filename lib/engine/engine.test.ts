import { describe, it, expect } from "vitest";
import { calcularEngine } from "./engine";
import { calcularPreco } from "./pricing";
import { evalFormula } from "./evaluator";
import {
  COMERCIAL_PADRAO,
  MATERIAIS_PADRAO,
  PARAMETROS_FABRICA_PADRAO,
} from "./defaults";
import type { EngineInput } from "./types";

// Testes golden de engenharia (doc 09). Valores conferidos à mão para o
// módulo BASE_PORTAS 600×720×550, 2 portas, 1 prateleira, com os parâmetros
// de fábrica padrão. Alterar uma fórmula deve quebrar este teste.
function inputBasePortas600(): EngineInput {
  return {
    ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
    parametros: PARAMETROS_FABRICA_PADRAO,
    modulos: [
      {
        id: "m1",
        templateCodigo: "BASE_PORTAS",
        largura_mm: 600,
        altura_mm: 720,
        profundidade_mm: 550,
        config: { CONFIG_QTD_PORTAS: 2, CONFIG_QTD_PRATELEIRAS: 1 },
      },
    ],
  };
}

describe("motor — BASE_PORTAS 600×720×550 (golden)", () => {
  const out = calcularEngine(inputBasePortas600());
  const mod = out.porModulo[0];

  it("explode em 9 peças", () => {
    const total = mod.pecas.reduce((s, p) => s + p.quantidade, 0);
    expect(total).toBe(9);
  });

  it("gera 4 dobradiças, 2 puxadores, 4 pés e 1 kit de parafuso", () => {
    const f = Object.fromEntries(mod.ferragens.map((x) => [x.item, x.quantidade]));
    expect(f.dobradica_35).toBe(4);
    expect(f.puxador).toBe(2);
    expect(f.pe_nivelador).toBe(4);
    expect(f.parafuso_kit_modulo).toBe(1);
  });

  it("consolida MDF por cor×espessura com áreas conferidas", () => {
    const g = Object.fromEntries(
      out.consolidado.mdf.map((x) => [`${x.cor}|${x.espessura_mm}`, x])
    );
    expect(g["Branco TX|15"].area_m2).toBeCloseTo(1.5216, 3);
    expect(g["Louro Freijó|18"].area_m2).toBeCloseTo(0.4241, 3);
    expect(g["Branco TX|6"].area_m2).toBeCloseTo(0.432, 3);
  });

  it("converte cada grupo em 1 chapa comercial", () => {
    for (const g of out.consolidado.mdf) expect(g.chapas).toBe(1);
  });

  it("não emite erros de validação física", () => {
    expect(out.warnings.filter((w) => w.severidade === "erro")).toHaveLength(0);
  });
});

describe("motor — validação e determinismo", () => {
  it("acusa medida fora dos limites do template", () => {
    const input = inputBasePortas600();
    input.modulos[0].altura_mm = 3000; // acima do máx (900)
    const out = calcularEngine(input);
    expect(out.warnings.some((w) => w.codigo === "LIMITE_ALTURA")).toBe(true);
  });

  it("é determinístico (mesma entrada → mesma saída)", () => {
    const a = JSON.stringify(calcularEngine(inputBasePortas600()));
    const b = JSON.stringify(calcularEngine(inputBasePortas600()));
    expect(a).toBe(b);
  });
});

describe("avaliador de fórmulas", () => {
  it("resolve funções e aritmética", () => {
    expect(evalFormula("max(2, ceil(714 / 450))", {})).toBe(2);
    expect(evalFormula("MEDIDA_LARGURA / 2 - 3", { MEDIDA_LARGURA: 600 })).toBe(297);
  });

  it("rejeita variável não declarada", () => {
    expect(() => evalFormula("PARAM_INEXISTENTE + 1", {})).toThrow();
  });
});

describe("pipeline financeiro — markup divisor", () => {
  it("preço final > custo direto e margem coerente", () => {
    const engine = calcularEngine(inputBasePortas600());
    const fin = calcularPreco(engine, COMERCIAL_PADRAO);
    expect(fin.custoDireto).toBeGreaterThan(0);
    expect(fin.precoFinal).toBeGreaterThan(fin.custoDireto);
    // sem desconto, margem efetiva ≈ margem configurada
    expect(fin.margemEfetiva).toBeCloseTo(COMERCIAL_PADRAO.margem, 2);
  });

  it("bloqueia quando o desconto derruba a margem abaixo da mínima", () => {
    const engine = calcularEngine(inputBasePortas600());
    const fin = calcularPreco(engine, { ...COMERCIAL_PADRAO, desconto: 0.25 });
    expect(fin.abaixoDaMargemMinima).toBe(true);
  });
});
