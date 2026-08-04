import { describe, expect, it } from "vitest";
import { valorAtualDaLinha } from "./valorAtual";

describe("valorAtualDaLinha (Modelo-de-Dominio.md 5.4.1, R1/R2)", () => {
  it("R1 — não congelado, sem override: devolve o valor ao vivo", () => {
    const resultado = valorAtualDaLinha({
      linha: { id: "l1", valorRateado: 100 },
      congeladoEm: null,
      valoresOverride: null,
      valorAoVivo: 250,
    });
    expect(resultado).toBe(250);
  });

  it("R1 — não congelado, com override ativo: override tem prioridade sobre o rateio ao vivo", () => {
    const resultado = valorAtualDaLinha({
      linha: { id: "l1", valorRateado: 100 },
      congeladoEm: null,
      valoresOverride: { l1: 999 },
      valorAoVivo: 250,
    });
    expect(resultado).toBe(999);
  });

  it("R2 — congelado: ignora o rateio ao vivo mesmo quando ele dá outro número (I1)", () => {
    const resultado = valorAtualDaLinha({
      linha: { id: "l1", valorRateado: 4584 },
      congeladoEm: "2026-08-02T14:10:00Z",
      valoresOverride: null,
      valorAoVivo: 4813.2,
    });
    expect(resultado).toBe(4584);
  });

  it("R2 — congelado: ignora também um override manual pendente", () => {
    const resultado = valorAtualDaLinha({
      linha: { id: "l1", valorRateado: 4584 },
      congeladoEm: "2026-08-02T14:10:00Z",
      valoresOverride: { l1: 1 },
      valorAoVivo: 4813.2,
    });
    expect(resultado).toBe(4584);
  });

  it("R2 — congelado, valorRateado ainda null: cai em 0 em vez de undefined", () => {
    const resultado = valorAtualDaLinha({
      linha: { id: "l1", valorRateado: null },
      congeladoEm: "2026-08-02T14:10:00Z",
      valoresOverride: null,
      valorAoVivo: 300,
    });
    expect(resultado).toBe(0);
  });
});
