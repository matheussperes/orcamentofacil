import { describe, expect, it } from "vitest";
import { aplicarOverridesQuantidade } from "./aplicarOverrides";
import type { LinhaInsumo } from "@/lib/insumos";

const linhas: LinhaInsumo[] = [
  { item: "MDF Branco 15mm", categoria: "Chapas", qtd: "3 chapa(s) · 9,42 m²", quantidadeBase: 3, unit: 200, total: 600 },
  { item: "Fita de borda", categoria: "Acabamento", qtd: "29.0 m", quantidadeBase: 29, unit: 2, total: 58 },
];

describe("aplicarOverridesQuantidade", () => {
  it("sem overrides, devolve as linhas intactas", () => {
    expect(aplicarOverridesQuantidade(linhas, [])).toEqual(linhas);
  });

  it("recalcula total = quantidadeOverride * unit para o item com override", () => {
    const resultado = aplicarOverridesQuantidade(linhas, [{ itemChave: "MDF Branco 15mm", quantidade: 5 }]);
    expect(resultado[0].total).toBe(1000);
    expect(resultado[1].total).toBe(58);
  });

  it("não altera categoria, item ou unit", () => {
    const [linha] = aplicarOverridesQuantidade(linhas, [{ itemChave: "MDF Branco 15mm", quantidade: 5 }]);
    expect(linha.categoria).toBe("Chapas");
    expect(linha.item).toBe("MDF Branco 15mm");
    expect(linha.unit).toBe(200);
  });

  it("override de item que não existe mais em linhas é ignorado", () => {
    const resultado = aplicarOverridesQuantidade(linhas, [{ itemChave: "Puxador inox", quantidade: 10 }]);
    expect(resultado).toEqual(linhas);
  });
});
