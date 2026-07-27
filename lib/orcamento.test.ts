import { describe, it, expect } from "vitest";
import {
  calcularOrcamentoMisto,
  idDoItem,
  paredeDoItem,
  larguraDoItem,
  type ModuloOrcamento,
  type ElementoContinuoResolvido,
} from "./orcamento";
import {
  MATERIAIS_PADRAO,
  PARAMETROS_FABRICA_PADRAO,
} from "./engine/defaults";
import { vaoVazio, type BoxModule } from "./engine/box/types";
import type { ElementoContinuo } from "./engine/elemento-continuo/types";

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

// Task 12.7 — integração de ElementoContinuo (Task 12.4) ao pipeline de
// `calcularOrcamentoMisto`. `AlvoResolvido` é montado à mão (não depende de
// Conjunto/Parede reais — isso é responsabilidade da camada de cima, ver
// `lib/engine/elemento-continuo/types.ts`).
describe("orçamento misto — integração de Elemento Contínuo (Task 12.7)", () => {
  const MATERIAL = { cor: "Branco TX", espessura: 15 };

  const tampoSimples: ElementoContinuo = {
    id: "ec-tampo-1",
    tipo: "tampo",
    alvo: { conjuntoId: "c1" },
    posicao: "superior",
    material: MATERIAL,
  };

  const tamponamentoSimples: ElementoContinuo = {
    id: "ec-tamp-1",
    tipo: "tamponamento",
    alvo: { moduloId: "m1" },
    posicao: "esquerda",
    material: MATERIAL,
  };

  it("sem elementosContinuos (campo ausente) continua funcionando exatamente como antes", () => {
    const out = calcularOrcamentoMisto({
      ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      itens: [itemBox],
    });
    expect(out.porModulo).toHaveLength(1);
    expect(out.globais).toEqual([]);
    expect(out.consolidado.mdf.length).toBeGreaterThan(0);
  });

  it("um tampo simples sobre um alvo { itens } resolvido à mão aparece em porModulo e no consolidado", () => {
    const ecs: ElementoContinuoResolvido[] = [
      {
        elemento: tampoSimples,
        alvo: { itens: [{ largura: 800, profundidade: 500, altura: 720 }] },
      },
    ];
    const out = calcularOrcamentoMisto({
      ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      itens: [],
      elementosContinuos: ecs,
    });

    expect(out.porModulo).toHaveLength(1);
    const mod = out.porModulo[0];
    expect(mod.moduloId).toBe("ec-tampo-1");
    expect(mod.templateCodigo).toBe("TAMPO");
    expect(mod.nome).toBe("Tampo");
    expect(mod.pecas.length).toBeGreaterThan(0);
    expect(mod.areaMdfM2).toBeGreaterThan(0);

    // prova que passou pela consolidação normal: área do tampo entrou no MDF
    expect(out.consolidado.mdf.length).toBeGreaterThan(0);
    const grupo = out.consolidado.mdf.find((g) => g.cor === "Branco TX" && g.espessura_mm === 15);
    expect(grupo).toBeTruthy();
    expect(grupo!.area_m2).toBeCloseTo(mod.areaMdfM2, 4);
  });

  it("um tamponamento sobre { moduloExtremidade } aparece em porModulo e no consolidado", () => {
    const ecs: ElementoContinuoResolvido[] = [
      {
        elemento: tamponamentoSimples,
        alvo: { moduloExtremidade: { largura: 600, profundidade: 550, altura: 720 } },
      },
    ];
    const out = calcularOrcamentoMisto({
      ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      itens: [],
      elementosContinuos: ecs,
    });

    expect(out.porModulo).toHaveLength(1);
    const mod = out.porModulo[0];
    expect(mod.moduloId).toBe("ec-tamp-1");
    expect(mod.templateCodigo).toBe("TAMPONAMENTO");
    expect(mod.nome).toBe("Tamponamento");
    expect(mod.pecas).toHaveLength(1);
    expect(mod.pecas[0].altura_mm).toBe(720); // eixo vertical (esquerda/direita) = altura do módulo
    expect(out.consolidado.mdf.length).toBeGreaterThan(0);
  });

  it("mistura itens (box/placa) normais com elementosContinuos no mesmo cálculo — porModulo tem ambos, consolidado soma tudo", () => {
    const ecs: ElementoContinuoResolvido[] = [
      {
        elemento: tampoSimples,
        alvo: { itens: [{ largura: 800, profundidade: 550, altura: 720 }] },
      },
    ];
    const out = calcularOrcamentoMisto({
      ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      itens: [itemBox, { origem: "custom_box", box: boxAereo }],
      elementosContinuos: ecs,
    });

    expect(out.porModulo).toHaveLength(3);
    expect(out.porModulo.map((m) => m.moduloId)).toEqual(
      expect.arrayContaining(["box-1", "box-2", "ec-tampo-1"])
    );

    const somaAreaModulos = out.porModulo.reduce((s, m) => s + m.areaMdfM2, 0);
    const somaAreaConsolidado = out.consolidado.mdf.reduce((s, g) => s + g.area_m2, 0);
    expect(somaAreaConsolidado).toBeCloseTo(somaAreaModulos, 3);
  });

  it("posição inválida no elemento propaga o Error de validarPosicao (não é engolido)", () => {
    const elementoInvalido: ElementoContinuo = {
      ...tampoSimples,
      posicao: "base", // "tampo" só aceita "superior" (POSICOES_VALIDAS)
    };
    const ecs: ElementoContinuoResolvido[] = [
      {
        elemento: elementoInvalido,
        alvo: { itens: [{ largura: 800, profundidade: 500, altura: 720 }] },
      },
    ];
    expect(() =>
      calcularOrcamentoMisto({
        ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
        parametros: PARAMETROS_FABRICA_PADRAO,
        itens: [],
        elementosContinuos: ecs,
      })
    ).toThrow(/não aceita posição/);
  });
});
