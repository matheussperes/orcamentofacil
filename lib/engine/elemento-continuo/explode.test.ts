import { describe, it, expect } from "vitest";
import {
  derivarDimensoesTampo,
  derivarDimensoesRodape,
  derivarDimensoesFechamento,
  derivarDimensoesTamponamento,
  explodeElementoContinuo,
  validarPosicao,
} from "./explode";
import type { ElementoContinuo, ModuloResolvido } from "./types";

const MATERIAL = { cor: "Branco TX", espessura: 15 };

function elemento(overrides: Partial<ElementoContinuo> = {}): ElementoContinuo {
  return {
    id: "ec-1",
    tipo: "tampo",
    alvo: { conjuntoId: "c1" },
    posicao: "superior",
    material: MATERIAL,
    ...overrides,
  };
}

const modulo = (largura: number, profundidade: number, altura = 720): ModuloResolvido => ({
  largura,
  profundidade,
  altura,
});

describe("Tampo — derivação de dimensão (Seção 3.4)", () => {
  it("sobre um Conjunto de 2 módulos de larguras diferentes: largura = soma; profundidade = maior + 30mm", () => {
    const itens = [modulo(600, 500), modulo(900, 560)];
    const el = elemento({ tipo: "tampo", posicao: "superior" });
    const dim = derivarDimensoesTampo(itens, el);
    expect(dim.largura).toBe(1500);
    expect(dim.profundidade).toBe(590); // 560 + 30
  });

  it("override sobrescreve largura/profundidade quando presente", () => {
    const itens = [modulo(600, 500)];
    const el = elemento({ tipo: "tampo", posicao: "superior", override: { largura: 1234, profundidade: 999 } });
    const dim = derivarDimensoesTampo(itens, el);
    expect(dim).toEqual({ largura: 1234, profundidade: 999 });
  });

  it("engrossado nível 2 (engrossada, lado único) — reaproveita explodePlaca (Task 12.1), mesma peça-base + sarrafos", () => {
    const itens = [modulo(800, 500)];
    const el = elemento({
      tipo: "tampo",
      posicao: "superior",
      engrossamento: { tecnica: "engrossada", nivel: 2, lados: ["superior"] },
    });
    const r = explodeElementoContinuo(el, { itens });
    // largura = 800, profundidade = 530 (500+30)
    const base = r.pecas.find((p) => p.nome === "Placa (base, engrossada)");
    expect(base).toBeTruthy();
    expect(base?.largura_mm).toBe(800);
    expect(base?.altura_mm).toBe(530);
    const sarrafo = r.pecas.find((p) => p.nome === "Sarrafo engrossamento (superior)");
    expect(sarrafo).toBeTruthy();
    expect(sarrafo?.quantidade).toBe(2); // nível 2 = 2 camadas
    // eixo maior é a largura (800 > 530) — sarrafo do lado "superior" corre a
    // largura inteira. `push` de placa/explode.ts usa (altura=comprimento,
    // largura=larguraSarrafo) — aqui altura_mm carrega o comprimento (800).
    expect(sarrafo?.altura_mm).toBe(800);
    expect(sarrafo?.largura_mm).toBe(70); // SARRAFO_LARGURA_PADRAO (default)
  });
});

describe("Rodapé — derivação de dimensão (Seção 3.4)", () => {
  it("valores default: largura total -30mm, profundidade do módulo -130mm, altura 150mm", () => {
    const itens = [modulo(1000, 550)];
    const el = elemento({ tipo: "rodape", posicao: "base" });
    const dim = derivarDimensoesRodape(itens, el);
    expect(dim).toEqual({ largura: 970, profundidade: 420, altura: 150 });
  });

  it("override sobrescreve a altura, mantendo largura/profundidade derivadas", () => {
    const itens = [modulo(1000, 550)];
    const el = elemento({ tipo: "rodape", posicao: "base", override: { altura: 100 } });
    const dim = derivarDimensoesRodape(itens, el);
    expect(dim).toEqual({ largura: 970, profundidade: 420, altura: 100 });
  });

  it("explosão gera 1 peça altura x largura (profundidade não é dimensão de corte, ver A-07)", () => {
    const itens = [modulo(1000, 550)];
    const el = elemento({ tipo: "rodape", posicao: "base" });
    const r = explodeElementoContinuo(el, { itens });
    expect(r.pecas).toHaveLength(1);
    expect(r.pecas[0]).toMatchObject({ nome: "Rodapé", altura_mm: 150, largura_mm: 970 });
  });
});

describe("Fechamento — derivação de dimensão (Seção 3.4)", () => {
  it("posição superior: sarrafo na largura total do bloco", () => {
    const itens = [modulo(600, 500, 700), modulo(900, 500, 720)];
    const el = elemento({ tipo: "fechamento", posicao: "superior" });
    const dim = derivarDimensoesFechamento(itens, el);
    expect(dim).toEqual({ comprimento: 1500, larguraSarrafo: 50 });
  });

  it("posição esquerda: sarrafo na altura total (maior altura do bloco)", () => {
    const itens = [modulo(600, 500, 700), modulo(900, 500, 720)];
    const el = elemento({ tipo: "fechamento", posicao: "esquerda" });
    const dim = derivarDimensoesFechamento(itens, el);
    expect(dim).toEqual({ comprimento: 720, larguraSarrafo: 50 });
  });

  it("explosão gera 1 peça sarrafo (comprimento x larguraSarrafo)", () => {
    const itens = [modulo(600, 500, 700)];
    const el = elemento({ tipo: "fechamento", posicao: "superior" });
    const r = explodeElementoContinuo(el, { itens });
    expect(r.pecas).toEqual([
      expect.objectContaining({ nome: "Fechamento", altura_mm: 600, largura_mm: 50 }),
    ]);
  });
});

describe("Tamponamento — deriva do módulo da extremidade (Seção 3.5)", () => {
  it("tipo inteiro, posição esquerda: profundidade = módulo + 25mm; altura = altura do módulo", () => {
    const moduloExtremidade = modulo(700, 500, 720);
    const el = elemento({ tipo: "tamponamento", posicao: "esquerda", tamponamentoTipo: "inteiro" });
    const dim = derivarDimensoesTamponamento(moduloExtremidade, el);
    expect(dim).toEqual({ altura: 720, profundidade: 525 });
  });

  it("override é IGNORADO por completo — dimensões continuam estritamente derivadas", () => {
    const moduloExtremidade = modulo(700, 500, 720);
    const el = elemento({
      tipo: "tamponamento",
      posicao: "esquerda",
      tamponamentoTipo: "inteiro",
      override: { altura: 9999, profundidade: 9999, largura: 9999 },
    });
    const dim = derivarDimensoesTamponamento(moduloExtremidade, el);
    expect(dim).toEqual({ altura: 720, profundidade: 525 });
  });

  it("tipo sarrafo: profundidade fixa 70mm, independente da profundidade do módulo", () => {
    const moduloExtremidade = modulo(700, 999, 720); // profundidade bem diferente de 70
    const el = elemento({ tipo: "tamponamento", posicao: "direita", tamponamentoTipo: "sarrafo" });
    const dim = derivarDimensoesTamponamento(moduloExtremidade, el);
    expect(dim.profundidade).toBe(70);
    expect(dim.altura).toBe(720);
  });

  it("posição base: a dimensão que seria a altura do módulo agora é a largura do módulo (mudança de eixo)", () => {
    const moduloExtremidade = modulo(700, 500, 720);
    const el = elemento({ tipo: "tamponamento", posicao: "base", tamponamentoTipo: "inteiro" });
    const dim = derivarDimensoesTamponamento(moduloExtremidade, el);
    expect(dim.altura).toBe(700); // largura do módulo, não a altura (720)
    expect(dim.profundidade).toBe(525);
  });

  it("explosão gera 1 peça (altura x profundidade derivadas)", () => {
    const moduloExtremidade = modulo(700, 500, 720);
    const el = elemento({ tipo: "tamponamento", posicao: "esquerda", tamponamentoTipo: "inteiro" });
    const r = explodeElementoContinuo(el, { moduloExtremidade });
    expect(r.pecas).toHaveLength(1);
    expect(r.pecas[0]).toMatchObject({ altura_mm: 720, largura_mm: 525 });
  });
});

describe("Validação de posição por tipo (Seção 3.4)", () => {
  it("posição inválida lança Error com as posições válidas na mensagem", () => {
    const el = elemento({ tipo: "tampo", posicao: "esquerda" });
    expect(() => validarPosicao(el)).toThrow(/tampo.*esquerda/i);
  });

  it("cada tipo aceita só suas posições válidas (tabela da Seção 3.4)", () => {
    expect(() => validarPosicao(elemento({ tipo: "tampo", posicao: "superior" }))).not.toThrow();
    expect(() => validarPosicao(elemento({ tipo: "rodape", posicao: "base" }))).not.toThrow();
    expect(() => validarPosicao(elemento({ tipo: "rodape", posicao: "superior" }))).toThrow();
    expect(() => validarPosicao(elemento({ tipo: "tamponamento", posicao: "topo" }))).not.toThrow();
    expect(() => validarPosicao(elemento({ tipo: "tamponamento", posicao: "superior" }))).toThrow();
    expect(() => validarPosicao(elemento({ tipo: "fechamento", posicao: "direita" }))).not.toThrow();
    expect(() => validarPosicao(elemento({ tipo: "fechamento", posicao: "base" }))).toThrow();
  });

  it("explodeElementoContinuo lança antes de calcular quando a posição é inválida", () => {
    const el = elemento({ tipo: "rodape", posicao: "topo" });
    expect(() => explodeElementoContinuo(el, { itens: [modulo(800, 500)] })).toThrow();
  });
});
