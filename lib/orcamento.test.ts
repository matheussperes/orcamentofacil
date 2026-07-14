import { describe, it, expect } from "vitest";
import {
  calcularOrcamentoMisto,
  idDoItem,
  paredeDoItem,
  larguraDoItem,
  type ModuloOrcamento,
} from "./orcamento";
import {
  MATERIAIS_PADRAO,
  PARAMETROS_FABRICA_PADRAO,
} from "./engine/defaults";
import { vaoVazio, type BoxModule } from "./engine/box/types";

const boxInferior: BoxModule = {
  id: "box-1",
  nome: "Balcão custom",
  tipo: "inferior",
  parede: "A",
  largura: 800,
  altura: 720,
  profundidade: 550,
  caixa: { cor: "Madeirado", espessura: 15 },
  raiz: vaoVazio("r"),
};

const itemTemplate: ModuloOrcamento = {
  origem: "template",
  modulo: {
    id: "t1",
    templateCodigo: "BASE_PORTAS",
    parede: "A",
    largura_mm: 600,
    altura_mm: 720,
    profundidade_mm: 550,
    config: { CONFIG_QTD_PORTAS: 2 },
  },
};

const itemBox: ModuloOrcamento = { origem: "custom_box", box: boxInferior };

describe("orçamento misto — lista unificada (template + caixa)", () => {
  const out = calcularOrcamentoMisto({
    ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
    parametros: PARAMETROS_FABRICA_PADRAO,
    itens: [itemTemplate, itemBox],
  });

  it("inclui os dois módulos no resultado", () => {
    expect(out.porModulo).toHaveLength(2);
    expect(out.porModulo.map((m) => m.nome)).toContain("Balcão custom");
  });

  it("consolida MDF de ambas as origens (inclui a cor do box)", () => {
    const cores = out.consolidado.mdf.map((g) => g.cor);
    expect(cores).toContain("Madeirado");
    expect(out.consolidado.mdf.length).toBeGreaterThan(1);
  });

  it("funciona só com caixas (sem templates)", () => {
    const so = calcularOrcamentoMisto({
      ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      itens: [itemBox],
    });
    expect(so.porModulo).toHaveLength(1);
    expect(so.consolidado.mdf.length).toBeGreaterThan(0);
  });

  it("funciona só com templates (sem caixas)", () => {
    const so = calcularOrcamentoMisto({
      ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      itens: [itemTemplate],
    });
    expect(so.porModulo).toHaveLength(1);
  });
});

describe("acessores do item unificado", () => {
  it("lêem id, parede e largura de cada origem corretamente", () => {
    expect(idDoItem(itemTemplate)).toBe("t1");
    expect(idDoItem(itemBox)).toBe("box-1");
    expect(paredeDoItem(itemTemplate)).toBe("A");
    expect(paredeDoItem(itemBox)).toBe("A");
    expect(larguraDoItem(itemTemplate)).toBe(600);
    expect(larguraDoItem(itemBox)).toBe(800);
  });

  it("usa 'A' como parede padrão quando ausente", () => {
    const semParede: ModuloOrcamento = {
      origem: "custom_box",
      box: { ...boxInferior, parede: undefined },
    };
    expect(paredeDoItem(semParede)).toBe("A");
  });
});
