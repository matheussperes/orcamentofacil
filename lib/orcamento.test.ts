import { describe, it, expect } from "vitest";
import { calcularOrcamentoMisto } from "./orcamento";
import {
  MATERIAIS_PADRAO,
  PARAMETROS_FABRICA_PADRAO,
} from "./engine/defaults";
import { vaoVazio, type BoxModule } from "./engine/box/types";

const boxInferior: BoxModule = {
  id: "box-1",
  nome: "Balcão custom",
  tipo: "inferior",
  largura: 800,
  altura: 720,
  profundidade: 550,
  caixa: { cor: "Madeirado", espessura: 15 },
  raiz: vaoVazio("r"),
};

describe("orçamento misto — template + caixa", () => {
  const out = calcularOrcamentoMisto({
    ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
    parametros: PARAMETROS_FABRICA_PADRAO,
    templateModulos: [
      {
        id: "t1",
        templateCodigo: "BASE_PORTAS",
        parede: "A",
        largura_mm: 600,
        altura_mm: 720,
        profundidade_mm: 550,
        config: { CONFIG_QTD_PORTAS: 2 },
      },
    ],
    boxes: [boxInferior],
  });

  it("inclui os dois módulos no resultado", () => {
    expect(out.porModulo).toHaveLength(2);
    expect(out.porModulo.map((m) => m.nome)).toContain("Balcão custom");
  });

  it("consolida MDF de ambas as origens (inclui a cor do box)", () => {
    const cores = out.consolidado.mdf.map((g) => g.cor);
    expect(cores).toContain("Madeirado"); // veio da caixa do box
    expect(out.consolidado.mdf.length).toBeGreaterThan(1);
  });

  it("funciona só com caixas (sem templates)", () => {
    const so = calcularOrcamentoMisto({
      ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      templateModulos: [],
      boxes: [boxInferior],
    });
    expect(so.porModulo).toHaveLength(1);
    expect(so.consolidado.mdf.length).toBeGreaterThan(0);
  });
});
