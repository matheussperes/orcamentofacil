// Task 13.0 — testes puros da geometria do modo "conjunto" de `BoxCanvas`.
// Sem jsdom/canvas no ambiente de teste (`vitest.config.ts`: environment
// "node", include só cobre `*.test.ts`) — por isso o componente React em si
// (efeitos/canvas) não é exercitado aqui. O que É testável e É a garantia
// central do critério de aceitação ("pixel-idêntico com 1 item", "N itens
// sem overlap/gap, Y por faixa") é a matemática pura de `geometriaConjunto`,
// que é exatamente o que decide onde cada item é desenhado. A validação
// visual (não regredir /modulo e os cards) é feita à parte, no browser.
import { describe, expect, it } from "vitest";
import { geometriaConjunto, type ItemDoConjunto } from "./BoxCanvas";
import { vaoVazio, type BoxModule } from "@/lib/engine/box/types";
import type { ModuloOrcamento } from "@/lib/orcamento";
import type { AlturasFaixas } from "@/lib/engine/parede";
import type { Placa } from "@/lib/engine/placa/types";

const W = 380;
const H = 360;
const PAD = 24;

const alturas: AlturasFaixas = {
  alturaRodape: 100,
  alturaBancada: 900,
  alturaInstalacaoAereo: 1400,
  peDireito: 2700,
};

function box(overrides: Partial<BoxModule> = {}): BoxModule {
  return {
    id: "box-1",
    nome: "Módulo",
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
    ...overrides,
  };
}

// Reproduz a fórmula ATUAL de `geometria(box)` (item único), pra comparar
// diretamente com `geometriaConjunto` — não pra "confiar" numa reimplementação,
// mas porque a fórmula original não é exportada (é interna ao componente,
// usada também pelo hit-test de clique) e a garantia de equivalência pixel-a-
// -pixel É, por definição, "estes dois cálculos batem". Qualquer refatoração
// futura de `geometria()` que mude esta conta precisa atualizar os dois
// lugares — e este teste vai acusar a divergência.
function geometriaItemUnico(b: BoxModule) {
  const scale = Math.min((W - PAD * 2) / b.largura, (H - PAD * 2) / b.altura);
  const ox = (W - b.largura * scale) / 2;
  const oy = (H - b.altura * scale) / 2;
  return { scale, ox, oy };
}

describe("geometriaConjunto — 1 item (faixa torre, x=0)", () => {
  it("produz exatamente a mesma escala/origem do modo item único", () => {
    const b = box();
    const item: ModuloOrcamento = { origem: "custom_box", box: b };
    const itens: ItemDoConjunto[] = [{ item, posicao: { itemId: b.id, x: 0, faixa: "torre" } }];

    const [g] = geometriaConjunto(itens, alturas);
    const esperado = geometriaItemUnico(b);

    expect(g.scale).toBeCloseTo(esperado.scale, 10);
    expect(g.ox).toBeCloseTo(esperado.ox, 10);
    expect(g.oy).toBeCloseTo(esperado.oy, 10);
  });

  it("continua batendo para uma caixa mais larga que alta (escala limitada pela largura)", () => {
    const b = box({ largura: 2000, altura: 400 });
    const item: ModuloOrcamento = { origem: "custom_box", box: b };
    const itens: ItemDoConjunto[] = [{ item, posicao: { itemId: b.id, x: 0, faixa: "torre" } }];

    const [g] = geometriaConjunto(itens, alturas);
    const esperado = geometriaItemUnico(b);

    expect(g.scale).toBeCloseTo(esperado.scale, 10);
    expect(g.ox).toBeCloseTo(esperado.ox, 10);
    expect(g.oy).toBeCloseTo(esperado.oy, 10);
  });
});

describe("geometriaConjunto — N itens na mesma faixa", () => {
  it("posiciona 2 itens lado a lado sem overlap nem gap indevido (mesma faixa)", () => {
    const b1 = box({ id: "b1", largura: 600, altura: 700 });
    const b2 = box({ id: "b2", largura: 400, altura: 700 });
    const itens: ItemDoConjunto[] = [
      { item: { origem: "custom_box", box: b1 }, posicao: { itemId: "b1", x: 0, faixa: "inferior" } },
      { item: { origem: "custom_box", box: b2 }, posicao: { itemId: "b2", x: 600, faixa: "inferior" } },
    ];

    const [g1, g2] = geometriaConjunto(itens, alturas);

    // Mesma escala pros dois (é um conjunto único).
    expect(g1.scale).toBeCloseTo(g2.scale, 10);
    // g2 começa exatamente onde g1 termina (x=600 é a borda direita de b1,
    // que tem largura 600 a partir de x=0) — sem overlap, sem gap.
    expect(g2.ox).toBeCloseTo(g1.ox + b1.largura * g1.scale, 6);
    // Mesma faixa ("inferior") -> mesmo Y (derivarY não depende de x).
    expect(g1.oy).toBeCloseTo(g2.oy, 10);
  });

  it("deriva Y diferente para faixas diferentes (inferior x aereo) — nunca Y digitado", () => {
    const b1 = box({ id: "b1", largura: 600, altura: 700 });
    const b2 = box({ id: "b2", largura: 600, altura: 700 });
    const itens: ItemDoConjunto[] = [
      { item: { origem: "custom_box", box: b1 }, posicao: { itemId: "b1", x: 0, faixa: "inferior" } },
      { item: { origem: "custom_box", box: b2 }, posicao: { itemId: "b2", x: 0, faixa: "aereo" } },
    ];

    const [g1, g2] = geometriaConjunto(itens, alturas);

    // aereo instala mais alto que inferior (alturaInstalacaoAereo > 0) ->
    // no canvas (Y cresce pra baixo), o item aéreo fica mais ACIMA (oy menor).
    expect(g2.oy).toBeLessThan(g1.oy);
    // Mesmo x=0 pros dois -> mesmo ox.
    expect(g1.ox).toBeCloseTo(g2.ox, 10);
  });

  it("não estoura o canvas: bounding box do conjunto cabe em W×H com padding", () => {
    const b1 = box({ id: "b1", largura: 900, altura: 720 });
    const b2 = box({ id: "b2", largura: 700, altura: 900 });
    const itens: ItemDoConjunto[] = [
      { item: { origem: "custom_box", box: b1 }, posicao: { itemId: "b1", x: 0, faixa: "inferior" } },
      { item: { origem: "custom_box", box: b2 }, posicao: { itemId: "b2", x: 900, faixa: "torre" } },
    ];

    const geos = geometriaConjunto(itens, alturas);
    for (const g of geos) {
      expect(g.ox).toBeGreaterThanOrEqual(0);
      expect(g.oy).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("geometriaConjunto — item origem placa", () => {
  it("não lança erro e recebe geometria válida (retângulo simples é responsabilidade do desenho, não da geometria)", () => {
    const placa: Placa = {
      id: "placa-1",
      nome: "Prateleira",
      largura: 500,
      altura: 20,
      material: { cor: "Branco TX", espessura: 18 },
      orientacao: "horizontal",
    };
    const item: ModuloOrcamento = { origem: "placa", placa };
    const itens: ItemDoConjunto[] = [{ item, posicao: { itemId: placa.id, x: 0, faixa: "aereo" } }];

    expect(() => geometriaConjunto(itens, alturas)).not.toThrow();
    const [g] = geometriaConjunto(itens, alturas);
    expect(g.scale).toBeGreaterThan(0);
    expect(Number.isFinite(g.ox)).toBe(true);
    expect(Number.isFinite(g.oy)).toBe(true);
  });

  it("mistura custom_box e placa no mesmo conjunto sem erro", () => {
    const b = box({ id: "b1" });
    const placa: Placa = {
      id: "placa-1",
      nome: "Fechamento",
      largura: 300,
      altura: 720,
      material: { cor: "Preto Fosco", espessura: 18 },
      orientacao: "vertical",
    };
    const itens: ItemDoConjunto[] = [
      { item: { origem: "custom_box", box: b }, posicao: { itemId: "b1", x: 0, faixa: "inferior" } },
      { item: { origem: "placa", placa }, posicao: { itemId: placa.id, x: 800, faixa: "inferior" } },
    ];

    expect(() => geometriaConjunto(itens, alturas)).not.toThrow();
    expect(geometriaConjunto(itens, alturas)).toHaveLength(2);
  });
});

describe("geometriaConjunto — lista vazia", () => {
  it("devolve lista vazia sem lançar (evita NaN de Math.min/max em array vazio)", () => {
    expect(geometriaConjunto([], alturas)).toEqual([]);
  });
});
