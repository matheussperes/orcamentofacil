import { describe, expect, it } from "vitest";
import { calcularEngineOrcamento } from "./calcularEngineOrcamento";
import { estadoMockPreenchido } from "./estadoMockPreenchido";
import { estadoAmbientePadrao } from "./estado";

// Task 13.5 — trava o comportamento da extração (Task 13.4 tinha esse bloco
// inline em `CorteMaterialLab.tsx`; agora é compartilhado com
// `FinanceiroLab.tsx`). Não retesta `calcularOrcamentoMisto`/
// `detectarConjuntos`/`resolverAlvoElemento` em si (já cobertos em suas
// próprias suítes) — só que a composição continua funcionando.
describe("calcularEngineOrcamento", () => {
  it("calcula o EngineOutput agregado para um orçamento com itens", () => {
    const resultado = calcularEngineOrcamento(estadoMockPreenchido());
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.engine.porModulo).toHaveLength(2);
      expect(resultado.engine.porModulo.map((m) => m.moduloId).sort()).toEqual([
        "mock-balcao",
        "mock-gaveteiro",
      ]);
    }
  });

  it("devolve porModulo vazio para um orçamento sem itens (não é erro)", () => {
    const resultado = calcularEngineOrcamento(estadoAmbientePadrao());
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.engine.porModulo).toHaveLength(0);
    }
  });
});
