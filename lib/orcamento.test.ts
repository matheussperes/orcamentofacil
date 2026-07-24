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
  portas: [],
  temFundo: false,
  puxador: "haste",
};

const boxAereo: BoxModule = {
  id: "box-2",
  nome: "Aéreo custom",
  tipo: "aereo",
  parede: "A",
  largura: 800,
  altura: 700,
  profundidade: 350,
  caixa: { cor: "Branco TX", espessura: 15 },
  raiz: vaoVazio("r2"),
  portas: [],
  temFundo: true,
  puxador: "haste",
};

const itemBox: ModuloOrcamento = { origem: "custom_box", box: boxInferior };

describe("orçamento misto — lista unificada (union de custom_box)", () => {
  const out = calcularOrcamentoMisto({
    ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
    parametros: PARAMETROS_FABRICA_PADRAO,
    itens: [itemBox, { origem: "custom_box", box: boxAereo }],
  });

  it("inclui todos os módulos no resultado", () => {
    expect(out.porModulo).toHaveLength(2);
    expect(out.porModulo.map((m) => m.nome)).toContain("Balcão custom");
  });

  it("consolida MDF de todas as caixas", () => {
    const cores = out.consolidado.mdf.map((g) => g.cor);
    expect(cores).toContain("Madeirado");
    expect(out.consolidado.mdf.length).toBeGreaterThan(1);
  });

  it("funciona com uma única caixa", () => {
    const so = calcularOrcamentoMisto({
      ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      itens: [itemBox],
    });
    expect(so.porModulo).toHaveLength(1);
    expect(so.consolidado.mdf.length).toBeGreaterThan(0);
  });

  it("funciona com lista vazia", () => {
    const vazio = calcularOrcamentoMisto({
      ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      itens: [],
    });
    expect(vazio.porModulo).toHaveLength(0);
    expect(vazio.consolidado.mdf).toHaveLength(0);
  });
});

describe("acessores do item unificado", () => {
  it("lêem id, parede e largura corretamente", () => {
    expect(idDoItem(itemBox)).toBe("box-1");
    expect(paredeDoItem(itemBox)).toBe("A");
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
