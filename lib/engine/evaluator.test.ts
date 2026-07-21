import { describe, it, expect } from "vitest";
import { evalFormula, variaveisDaFormula } from "./evaluator";

// Testes da mitigação compensatória da Task 1.2 (docs/Backlog.md) contra as
// vulnerabilidades sem fix disponível em expr-eval@2.0.2:
//   - GHSA-8gw3-rxh4-v6jx (Prototype Pollution)
//   - GHSA-jc85-fpwf-qm7x (execução de função não restrita)
describe("evalFormula — mitigação de prototype pollution (Task 1.2)", () => {
  it("bloqueia fórmula contendo __proto__ em vez de poluir Object.prototype", () => {
    expect(() =>
      evalFormula("__proto__.polluted = 1", { MEDIDA_LARGURA: 100 })
    ).toThrow(/__proto__|constructor|prototype/i);

    expect((Object.prototype as unknown as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("bloqueia fórmula contendo constructor.prototype", () => {
    expect(() =>
      evalFormula(
        "constructor.constructor('return 1')()",
        { MEDIDA_LARGURA: 100 }
      )
    ).toThrow(/__proto__|constructor|prototype/i);

    expect((Object.prototype as unknown as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("bloqueia chave de scope chamada __proto__", () => {
    const scopeMalicioso = JSON.parse(
      '{"__proto__": {"polluted": "sim"}, "MEDIDA_LARGURA": 100}'
    ) as Record<string, number>;

    expect(() => evalFormula("MEDIDA_LARGURA", scopeMalicioso)).toThrow(
      /__proto__|constructor|prototype/i
    );

    expect((Object.prototype as unknown as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("bloqueia chave de scope chamada constructor", () => {
    const scope = { constructor: 1, MEDIDA_LARGURA: 100 };

    expect(() => evalFormula("MEDIDA_LARGURA", scope)).toThrow(
      /__proto__|constructor|prototype/i
    );
  });

  it("continua avaliando fórmulas legítimas normalmente após a validação", () => {
    expect(evalFormula("MEDIDA_LARGURA / 2", { MEDIDA_LARGURA: 600 })).toBe(300);
    expect(evalFormula(42, {})).toBe(42);
    expect(evalFormula("100", {})).toBe(100);
  });

  it("variaveisDaFormula continua funcionando para fórmulas legítimas", () => {
    expect(variaveisDaFormula("MEDIDA_LARGURA + PARAM_X")).toEqual(
      expect.arrayContaining(["MEDIDA_LARGURA", "PARAM_X"])
    );
  });
});
