import { describe, it, expect } from "vitest";
import { TOLERANCIA_ENCOSTE_MM, aplicarOverrides, detectarConjuntos } from "./detectar";
import type { ResolvedorItens } from "../parede/validar";
import type { AlturasFaixas, ElementoParede, ItemPosicionado, Parede } from "../parede/types";
import type { ModuloOrcamento } from "../../orcamento";
import type { Placa } from "../placa/types";
import type { OverrideJuncao } from "./types";

const MATERIAL = { cor: "Branco TX", espessura: 15 };

function placaItem(id: string, largura: number, altura = 700): ModuloOrcamento {
  const placa: Placa = {
    id,
    nome: `Item ${id}`,
    largura,
    altura,
    material: MATERIAL,
    orientacao: "horizontal",
  };
  return { origem: "placa", placa };
}

function mapaItens(...itens: ModuloOrcamento[]): ResolvedorItens {
  const m = new Map<string, ModuloOrcamento>();
  for (const item of itens) {
    const id = item.origem === "custom_box" ? item.box.id : item.placa.id;
    m.set(id, item);
  }
  return m;
}

const ALTURAS: AlturasFaixas = {
  alturaRodape: 150,
  alturaBancada: 900,
  alturaInstalacaoAereo: 1500,
  peDireito: 2700,
};

function paredeBase(overrides: Partial<Parede> = {}): Parede {
  return {
    id: "parede-1",
    largura: 4000,
    altura: 2700,
    elementos: [],
    itens: [],
    ...overrides,
  };
}

function itensDaParede(...itens: ItemPosicionado[]): ItemPosicionado[] {
  return itens;
}

describe("detectarConjuntos", () => {
  it("dois itens encostados, mesma faixa, sem elemento entre eles -> 1 conjunto com os 2", () => {
    const a = placaItem("a", 600);
    const b = placaItem("b", 600);
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 600, faixa: "inferior" }, // encosta exatamente (vão 0)
      ],
    });

    const conjuntos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));

    expect(conjuntos).toHaveLength(1);
    expect(conjuntos[0].itensIds).toEqual(["a", "b"]);
    expect(conjuntos[0].faixa).toBe("inferior");
    expect(conjuntos[0].paredeId).toBe("parede-1");
  });

  it("vão dentro da tolerância (2mm) também encosta", () => {
    const a = placaItem("a", 600);
    const b = placaItem("b", 600);
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 600 + TOLERANCIA_ENCOSTE_MM, faixa: "inferior" },
      ],
    });

    const conjuntos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));

    expect(conjuntos).toHaveLength(1);
    expect(conjuntos[0].itensIds).toEqual(["a", "b"]);
  });

  it("vão maior que a tolerância entre eles -> 2 conjuntos separados (cada um com 1 item)", () => {
    const a = placaItem("a", 600);
    const b = placaItem("b", 600);
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 700, faixa: "inferior" }, // vão de 100mm, bem acima da tolerância
      ],
    });

    const conjuntos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));

    expect(conjuntos).toHaveLength(2);
    expect(conjuntos.map((c) => c.itensIds)).toEqual([["a"], ["b"]]);
  });

  it("três itens encostados em sequência -> 1 conjunto com os 3 (componente conectado transitivo)", () => {
    const a = placaItem("a", 600);
    const b = placaItem("b", 600);
    const c = placaItem("c", 600);
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 600, faixa: "inferior" },
        { itemId: "c", x: 1200, faixa: "inferior" },
      ],
    });

    const conjuntos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b, c));

    expect(conjuntos).toHaveLength(1);
    expect(conjuntos[0].itensIds).toEqual(["a", "b", "c"]);
  });

  it("briefing 6.2: uma porta entre dois itens da faixa inferior impede a junção -> 2 conjuntos, não 1", () => {
    const a = placaItem("a", 600, 700);
    const b = placaItem("b", 600, 700);
    const porta: ElementoParede = {
      tipo: "porta",
      x: 500,
      y: 0,
      largura: 200, // 500..700 — cobre o vão de encoste entre a (termina em 600) e b (começa em 602)
      altura: 2100, // porta típica: chão até ~2100mm, cobre o Y da faixa "inferior" (0..700)
    };
    const parede = paredeBase({
      elementos: [porta],
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 602, faixa: "inferior" }, // vão de 2mm, dentro da tolerância — SE não houvesse a porta, juntaria
      ],
    });

    const conjuntos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));

    expect(conjuntos).toHaveLength(2);
    expect(conjuntos.map((c) => c.itensIds)).toEqual([["a"], ["b"]]);
  });

  it("briefing 6.2: uma janela acima da bancada, entre dois itens da faixa inferior, NÃO impede a junção -> 1 conjunto", () => {
    const a = placaItem("a", 600, 700);
    const b = placaItem("b", 600, 700);
    const janela: ElementoParede = {
      tipo: "janela",
      x: 500,
      y: 1000, // acima da altura da bancada (900) e acima do topo dos itens "inferior" (Y=0..700)
      largura: 200,
      altura: 400,
    };
    const parede = paredeBase({
      elementos: [janela],
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 602, faixa: "inferior" },
      ],
    });

    const conjuntos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));

    expect(conjuntos).toHaveLength(1);
    expect(conjuntos[0].itensIds).toEqual(["a", "b"]);
  });

  it("itens em faixas diferentes nunca formam conjunto entre si, mesmo fisicamente próximos", () => {
    const a = placaItem("a", 600);
    const b = placaItem("b", 600);
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 600, faixa: "bancada" }, // mesmo x de encoste, faixa diferente
      ],
    });

    const conjuntos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));

    expect(conjuntos).toHaveLength(2);
    const faixas = conjuntos.map((c) => c.faixa).sort();
    expect(faixas).toEqual(["bancada", "inferior"]);
    for (const conjunto of conjuntos) {
      expect(conjunto.itensIds).toHaveLength(1);
    }
  });
});

describe("aplicarOverrides", () => {
  it('override "quebrado" separa um conjunto de 3 itens em dois grupos', () => {
    const a = placaItem("a", 600);
    const b = placaItem("b", 600);
    const c = placaItem("c", 600);
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 600, faixa: "inferior" },
        { itemId: "c", x: 1200, faixa: "inferior" },
      ],
    });

    const automaticos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b, c));
    expect(automaticos).toHaveLength(1);
    expect(automaticos[0].itensIds).toEqual(["a", "b", "c"]);

    const overrides: OverrideJuncao[] = [{ itemIdA: "b", itemIdB: "c", forcar: "quebrado" }];
    const ajustados = aplicarOverrides(automaticos, parede.itens, overrides);

    expect(ajustados).toHaveLength(2);
    const grupos = ajustados.map((c) => c.itensIds).sort((x, y) => x.length - y.length);
    expect(grupos).toEqual([["c"], ["a", "b"]]);
  });

  it('override "unido" junta dois itens que a detecção automática não uniria (vão maior que a tolerância)', () => {
    const a = placaItem("a", 600);
    const b = placaItem("b", 600);
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 700, faixa: "inferior" }, // vão de 100mm — não junta sozinho
      ],
    });

    const automaticos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));
    expect(automaticos).toHaveLength(2);

    const overrides: OverrideJuncao[] = [{ itemIdA: "a", itemIdB: "b", forcar: "unido" }];
    const ajustados = aplicarOverrides(automaticos, parede.itens, overrides);

    expect(ajustados).toHaveLength(1);
    expect(ajustados[0].itensIds).toEqual(["a", "b"]);
    expect(ajustados[0].faixa).toBe("inferior");
  });

  it('override "unido" junta dois itens que a detecção automática não uniria por causa de elemento bloqueante', () => {
    const a = placaItem("a", 600, 700);
    const b = placaItem("b", 600, 700);
    const porta: ElementoParede = { tipo: "porta", x: 500, y: 0, largura: 200, altura: 2100 };
    const parede = paredeBase({
      elementos: [porta],
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 602, faixa: "inferior" },
      ],
    });

    const automaticos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));
    expect(automaticos).toHaveLength(2); // porta bloqueia, ver teste de detectarConjuntos acima

    const overrides: OverrideJuncao[] = [{ itemIdA: "a", itemIdB: "b", forcar: "unido" }];
    const ajustados = aplicarOverrides(automaticos, parede.itens, overrides);

    expect(ajustados).toHaveLength(1);
    expect(ajustados[0].itensIds).toEqual(["a", "b"]);
  });

  it("sem overrides, devolve os conjuntos automáticos inalterados", () => {
    const a = placaItem("a", 600);
    const b = placaItem("b", 600);
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 600, faixa: "inferior" },
      ],
    });

    const automaticos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));
    const ajustados = aplicarOverrides(automaticos, parede.itens, []);

    expect(ajustados).toHaveLength(1);
    expect(ajustados[0].itensIds).toEqual(["a", "b"]);
  });

  it("override entre itens de faixas diferentes é ignorado (Conjunto é escopado a uma única faixa)", () => {
    const a = placaItem("a", 600);
    const b = placaItem("b", 600);
    const posicoes = itensDaParede(
      { itemId: "a", x: 0, faixa: "inferior" },
      { itemId: "b", x: 0, faixa: "bancada" }
    );
    const parede = paredeBase({ itens: posicoes });

    const automaticos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));
    expect(automaticos).toHaveLength(2);

    const overrides: OverrideJuncao[] = [{ itemIdA: "a", itemIdB: "b", forcar: "unido" }];
    const ajustados = aplicarOverrides(automaticos, posicoes, overrides);

    expect(ajustados).toHaveLength(2);
    expect(ajustados.every((c) => c.itensIds.length === 1)).toBe(true);
  });
});
