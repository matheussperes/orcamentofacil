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

  it("vão maior que a tolerância entre eles -> nenhum conjunto (cada item fica isolado, sem vizinho unido)", () => {
    const a = placaItem("a", 600);
    const b = placaItem("b", 600);
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 700, faixa: "inferior" }, // vão de 100mm, bem acima da tolerância
      ],
    });

    const conjuntos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));

    // Conjunto nunca tem tamanho 1 (Modelo de Domínio 3.4: módulo isolado é
    // `{ moduloId }`, não um `conjuntoId` de 1 item) — item sem vizinho unido
    // simplesmente não aparece no resultado.
    expect(conjuntos).toHaveLength(0);
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

  it("briefing 6.2: uma porta entre dois itens da faixa inferior impede a junção", () => {
    const a = placaItem("a", 600, 700);
    const b = placaItem("b", 600, 700);
    const posicoes: ItemPosicionado[] = [
      { itemId: "a", x: 0, faixa: "inferior" },
      { itemId: "b", x: 602, faixa: "inferior" }, // vão de 2mm, dentro da tolerância — SE não houvesse a porta, juntaria
    ];

    // Controle: sem a porta, os dois itens juntam normalmente (confirma que
    // o vão de 2mm está dentro da tolerância e que a porta é o único fator
    // que separa o resultado abaixo).
    const semPorta = paredeBase({ elementos: [], itens: posicoes });
    expect(detectarConjuntos(semPorta, ALTURAS, mapaItens(a, b))).toHaveLength(1);

    const porta: ElementoParede = {
      tipo: "porta",
      x: 500,
      y: 0,
      largura: 200, // 500..700 — cobre o vão de encoste entre a (termina em 600) e b (começa em 602)
      altura: 2100, // porta típica: chão até ~2100mm, cobre o Y da faixa "inferior" (0..700)
    };
    const comPorta = paredeBase({ elementos: [porta], itens: posicoes });

    const conjuntos = detectarConjuntos(comPorta, ALTURAS, mapaItens(a, b));

    // A porta bloqueia a única junção possível entre os 2 itens — nenhum dos
    // dois tem vizinho unido, então nenhum Conjunto é formado (Conjunto
    // nunca tem tamanho 1 — ver decisão de design em detectar.ts).
    expect(conjuntos).toHaveLength(0);
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

  it("Task 2.7 (bug corrigido): uma tomada entre dois itens encostados NÃO impede a formação do Conjunto", () => {
    const a = placaItem("a", 600, 700);
    const b = placaItem("b", 600, 700);
    const tomada: ElementoParede = {
      tipo: "tomada",
      x: 500,
      y: 0,
      largura: 200, // cobre o vão de encoste entre a (termina em 600) e b (começa em 602)
      altura: 2100, // cobre o Y da faixa "inferior", igual à porta do teste acima
    };
    const parede = paredeBase({
      elementos: [tomada],
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 602, faixa: "inferior" },
      ],
    });

    const conjuntos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));

    // Antes da correção, qualquer ElementoParede quebrava o bloco (bug).
    // Tomada e ponto_hidraulico NÃO bloqueiam (Modelo de Domínio 3.2.2,
    // "Bloqueio de conjunto por tipo") — só porta/janela quebram.
    expect(conjuntos).toHaveLength(1);
    expect(conjuntos[0].itensIds).toEqual(["a", "b"]);
  });

  it("Task 2.7: uma pedra entre dois itens encostados NÃO impede a formação do Conjunto", () => {
    const a = placaItem("a", 600, 700);
    const b = placaItem("b", 600, 700);
    const pedra: ElementoParede = { tipo: "pedra", x: 500, y: 0, largura: 200, altura: 2100 };
    const parede = paredeBase({
      elementos: [pedra],
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 602, faixa: "inferior" },
      ],
    });

    const conjuntos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));

    expect(conjuntos).toHaveLength(1);
    expect(conjuntos[0].itensIds).toEqual(["a", "b"]);
  });

  // Regressão porta: já coberta acima em "briefing 6.2: uma porta entre dois
  // itens da faixa inferior impede a junção" — porta continua bloqueando.

  it("itens em faixas diferentes nunca formam conjunto entre si, mesmo fisicamente próximos", () => {
    const a = placaItem("a", 600);
    const b = placaItem("b", 600);
    const c = placaItem("c", 600); // acompanha "a" na faixa "inferior" só pra provar que a e c juntam, mas b (outra faixa) fica de fora
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 600, faixa: "bancada" }, // mesmo x de encoste de "a", faixa diferente
        { itemId: "c", x: 600, faixa: "inferior" }, // encosta em "a" na MESMA faixa
      ],
    });

    const conjuntos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b, c));

    // "a" e "c" (mesma faixa, encostados) formam 1 conjunto; "b" (outra
    // faixa, mesmo x) fica de fora — mesmo estando fisicamente colado em
    // "a", não é candidato a se juntar com ele.
    expect(conjuntos).toHaveLength(1);
    expect(conjuntos[0].faixa).toBe("inferior");
    expect(conjuntos[0].itensIds).toEqual(["a", "c"]);
    expect(conjuntos.some((conjunto) => conjunto.itensIds.includes("b"))).toBe(false);
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

    // "c" perde sua única junção (com "b") e fica sozinho — como Conjunto
    // nunca tem tamanho 1, "c" simplesmente desaparece do resultado; só o
    // grupo [a, b] (2+ itens) continua existindo como Conjunto.
    expect(ajustados).toHaveLength(1);
    expect(ajustados[0].itensIds).toEqual(["a", "b"]);
    expect(ajustados.some((conjunto) => conjunto.itensIds.includes("c"))).toBe(false);
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

    // Vão maior que a tolerância -> nenhum dos dois tem vizinho unido -> a
    // detecção automática não produz Conjunto nenhum (ver teste equivalente
    // em detectarConjuntos acima).
    const automaticos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));
    expect(automaticos).toHaveLength(0);

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
    expect(automaticos).toHaveLength(0); // porta bloqueia a única junção possível — nenhum Conjunto automático

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

    // "a" e "b" estão sozinhos em suas faixas -> nenhum Conjunto automático.
    const automaticos = detectarConjuntos(parede, ALTURAS, mapaItens(a, b));
    expect(automaticos).toHaveLength(0);

    const overrides: OverrideJuncao[] = [{ itemIdA: "a", itemIdB: "b", forcar: "unido" }];
    const ajustados = aplicarOverrides(automaticos, posicoes, overrides);

    // Se o filtro de faixa não existisse, o override "unido" juntaria "a" e
    // "b" num único Conjunto de 2 itens (union-find não sabe de faixa) — o
    // que violaria o escopo "uma parede, uma faixa" de Conjunto. Com o
    // filtro, o override é ignorado e o resultado continua vazio.
    expect(ajustados).toHaveLength(0);
  });
});
