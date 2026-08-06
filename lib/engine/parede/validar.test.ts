import { describe, it, expect } from "vitest";
import { alturasEfetivas, derivarY, validarParedeTier1, validarParedeTier2, type ResolvedorItens } from "./validar";
import type { AlturasFaixas, ElementoParede, Parede } from "./types";
import type { ModuloOrcamento } from "../../orcamento";
import type { Placa } from "../placa/types";

const MATERIAL = { cor: "Branco TX", espessura: 15 };

function placaItem(overrides: Partial<Placa> = {}): ModuloOrcamento {
  const placa: Placa = {
    id: "item-1",
    nome: "Item de teste",
    largura: 600,
    altura: 700,
    material: MATERIAL,
    orientacao: "horizontal",
    ...overrides,
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
    largura: 3000,
    altura: 2700,
    elementos: [],
    itens: [],
    ...overrides,
  };
}

describe("derivarY", () => {
  it("inferior começa na altura do rodapé, não no chão (A-08)", () => {
    expect(derivarY("inferior", ALTURAS)).toBe(150);
  });
  it("bancada começa na altura configurada da faixa", () => {
    expect(derivarY("bancada", ALTURAS)).toBe(900);
  });
  it("aereo começa na altura de instalação configurada", () => {
    expect(derivarY("aereo", ALTURAS)).toBe(1500);
  });
  it("torre começa na mesma borda inferior de 'inferior' (altura do rodapé, A-08)", () => {
    expect(derivarY("torre", ALTURAS)).toBe(150);
  });
});

describe("alturasEfetivas — herança do perfil + override campo a campo (Modelo de Domínio 3.2.1)", () => {
  it("parede sem override herda tudo do perfil da organização", () => {
    const parede = paredeBase();
    expect(alturasEfetivas(parede, ALTURAS)).toEqual(ALTURAS);
  });

  it("override mescla campo a campo — chave ausente continua herdada", () => {
    const parede = paredeBase({ alturasOverride: { alturaRodape: 150 } });
    expect(alturasEfetivas(parede, ALTURAS)).toEqual({ ...ALTURAS, alturaRodape: 150 });
  });

  it("override com múltiplas chaves mescla todas", () => {
    const parede = paredeBase({ alturasOverride: { alturaRodape: 150, alturaBancada: 950 } });
    expect(alturasEfetivas(parede, ALTURAS)).toEqual({ ...ALTURAS, alturaRodape: 150, alturaBancada: 950 });
  });
});

// Exemplos trabalhados do contrato da Task 0.4 — perfil = { rodape 100,
// bancada 900, aereo 1400, peDireito 2700 }, módulo inferior de 800mm.
describe("Task 0.4 — exemplos trabalhados (herança, override parcial, override coerente)", () => {
  const PERFIL: AlturasFaixas = {
    alturaRodape: 100,
    alturaBancada: 900,
    alturaInstalacaoAereo: 1400,
    peDireito: 2700,
  };

  it("Exemplo 1 — herança pura: Y=100, topo=900, encaixe exato, sem aviso", () => {
    const item = placaItem({ id: "a", largura: 600, altura: 800 });
    const parede = paredeBase({ itens: [{ itemId: "a", x: 0, faixa: "inferior" }] });

    const efetivas = alturasEfetivas(parede, PERFIL);
    expect(efetivas).toEqual(PERFIL);
    expect(derivarY("inferior", efetivas)).toBe(100);

    const warnings = validarParedeTier2(parede, PERFIL, mapaItens(item));
    expect(warnings.filter((w) => w.codigo === "FAIXA_COLIDE")).toHaveLength(0);
  });

  it("Exemplo 2 — override parcial (alturaRodape: 150): Y=150, topo=950 > 900 → FAIXA_COLIDE", () => {
    const item = placaItem({ id: "a", largura: 600, altura: 800 });
    const parede = paredeBase({
      alturasOverride: { alturaRodape: 150 },
      itens: [{ itemId: "a", x: 0, faixa: "inferior" }],
    });

    const efetivas = alturasEfetivas(parede, PERFIL);
    expect(efetivas).toEqual({ ...PERFIL, alturaRodape: 150 });
    expect(derivarY("inferior", efetivas)).toBe(150);

    const warnings = validarParedeTier2(parede, PERFIL, mapaItens(item));
    expect(warnings.some((w) => w.codigo === "FAIXA_COLIDE")).toBe(true);
  });

  it("Exemplo 3 — override coerente (rodape 150 + bancada 950): Y=150, topo=950, sem aviso", () => {
    const item = placaItem({ id: "a", largura: 600, altura: 800 });
    const parede = paredeBase({
      alturasOverride: { alturaRodape: 150, alturaBancada: 950 },
      itens: [{ itemId: "a", x: 0, faixa: "inferior" }],
    });

    const efetivas = alturasEfetivas(parede, PERFIL);
    expect(efetivas).toEqual({ ...PERFIL, alturaRodape: 150, alturaBancada: 950 });

    const warnings = validarParedeTier2(parede, PERFIL, mapaItens(item));
    expect(warnings.filter((w) => w.codigo === "FAIXA_COLIDE")).toHaveLength(0);
  });
});

describe("validarParedeTier1", () => {
  it("item cabe na parede (largura e altura) — sem warnings", () => {
    const item = placaItem({ id: "a", largura: 600, altura: 700 });
    const parede = paredeBase({ itens: [{ itemId: "a", x: 0, faixa: "inferior" }] });

    const warnings = validarParedeTier1(parede, mapaItens(item));

    expect(warnings).toHaveLength(0);
  });

  it("item não cabe na largura da parede", () => {
    const item = placaItem({ id: "a", largura: 600, altura: 700 });
    const parede = paredeBase({ largura: 500, itens: [{ itemId: "a", x: 0, faixa: "inferior" }] });

    const warnings = validarParedeTier1(parede, mapaItens(item));

    expect(warnings).toHaveLength(1);
    expect(warnings[0].codigo).toBe("PAREDE_LARGURA_EXCEDIDA");
    expect(warnings[0].severidade).toBe("erro");
  });

  it("item não cabe na altura da parede", () => {
    const item = placaItem({ id: "a", largura: 600, altura: 2800 });
    const parede = paredeBase({ altura: 2700, itens: [{ itemId: "a", x: 0, faixa: "torre" }] });

    const warnings = validarParedeTier1(parede, mapaItens(item));

    expect(warnings).toHaveLength(1);
    expect(warnings[0].codigo).toBe("PAREDE_ALTURA_EXCEDIDA");
  });

  it("dois itens na mesma faixa se sobrepondo horizontalmente", () => {
    const a = placaItem({ id: "a", largura: 600 });
    const b = placaItem({ id: "b", largura: 600 });
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 300, faixa: "inferior" }, // [0,600] x [300,900] colidem
      ],
    });

    const warnings = validarParedeTier1(parede, mapaItens(a, b));

    expect(warnings.some((w) => w.codigo === "ITENS_SOBREPOSTOS")).toBe(true);
  });

  it("dois itens na mesma faixa lado a lado, sem sobrepor — sem warnings", () => {
    const a = placaItem({ id: "a", largura: 600 });
    const b = placaItem({ id: "b", largura: 600 });
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 600, faixa: "inferior" }, // encostados, não sobrepõem
      ],
    });

    const warnings = validarParedeTier1(parede, mapaItens(a, b));

    expect(warnings).toHaveLength(0);
  });

  it("itens em faixas diferentes no mesmo x não geram ITENS_SOBREPOSTOS (Tier 1 não conhece Y)", () => {
    const a = placaItem({ id: "a", largura: 600, altura: 700 });
    const b = placaItem({ id: "b", largura: 600, altura: 600 });
    const parede = paredeBase({
      itens: [
        { itemId: "a", x: 0, faixa: "inferior" },
        { itemId: "b", x: 0, faixa: "aereo" },
      ],
    });

    const warnings = validarParedeTier1(parede, mapaItens(a, b));

    expect(warnings.filter((w) => w.codigo === "ITENS_SOBREPOSTOS")).toHaveLength(0);
  });

  it("item sem módulo correspondente gera ITEM_NAO_ENCONTRADO", () => {
    const parede = paredeBase({ itens: [{ itemId: "fantasma", x: 0, faixa: "inferior" }] });

    const warnings = validarParedeTier1(parede, mapaItens());

    expect(warnings).toHaveLength(1);
    expect(warnings[0].codigo).toBe("ITEM_NAO_ENCONTRADO");
  });
});

describe("validarParedeTier2 — faixas colidindo (2a)", () => {
  it("item 'inferior' alto demais invade a faixa 'bancada' configurada", () => {
    // alturaBancada = 900; item inferior com 1000mm de altura ultrapassa o teto.
    const item = placaItem({ id: "a", largura: 600, altura: 1000 });
    const parede = paredeBase({ itens: [{ itemId: "a", x: 0, faixa: "inferior" }] });

    const warnings = validarParedeTier2(parede, ALTURAS, mapaItens(item));

    expect(warnings.some((w) => w.codigo === "FAIXA_COLIDE")).toBe(true);
  });

  it("item 'bancada' + altura da bancada não ultrapassa a altura de instalação do aéreo — sem warning", () => {
    // alturaBancada=900, alturaInstalacaoAereo=1500 → item de até 600mm cabe.
    const item = placaItem({ id: "a", largura: 600, altura: 600 });
    const parede = paredeBase({ itens: [{ itemId: "a", x: 0, faixa: "bancada" }] });

    const warnings = validarParedeTier2(parede, ALTURAS, mapaItens(item));

    expect(warnings.filter((w) => w.codigo === "FAIXA_COLIDE")).toHaveLength(0);
  });

  it("item 'bancada' alto demais ultrapassa a altura de instalação do aéreo", () => {
    const item = placaItem({ id: "a", largura: 600, altura: 700 });
    const parede = paredeBase({ itens: [{ itemId: "a", x: 0, faixa: "bancada" }] });

    const warnings = validarParedeTier2(parede, ALTURAS, mapaItens(item));

    expect(warnings.some((w) => w.codigo === "FAIXA_COLIDE")).toBe(true);
  });

  it("item 'aereo' ultrapassa peDireito mesmo cabendo dentro de uma parede.altura maior — Math.min usa peDireito", () => {
    // ALTURAS.peDireito=2700, parede física maior (3000mm). Y=1500 (aereo) + 1300 = 2800:
    // ultrapassa peDireito (2700) mas caberia em parede.altura (3000) se o teto fosse só a parede.
    const item = placaItem({ id: "a", largura: 600, altura: 1300 });
    const parede = paredeBase({ altura: 3000, itens: [{ itemId: "a", x: 0, faixa: "aereo" }] });

    const warnings = validarParedeTier2(parede, ALTURAS, mapaItens(item));

    expect(warnings.some((w) => w.codigo === "FAIXA_COLIDE")).toBe(true);
  });

  it("item 'aereo' cabe dentro de peDireito mas ultrapassa parede.altura menor — Math.min usa parede.altura", () => {
    // parede física menor (2400mm) que o peDireito do perfil (2700mm). Y=1500 (aereo) + 1000 = 2500:
    // caberia em peDireito (2700) mas ultrapassa a altura física da parede (2400).
    const item = placaItem({ id: "a", largura: 600, altura: 1000 });
    const parede = paredeBase({ altura: 2400, itens: [{ itemId: "a", x: 0, faixa: "aereo" }] });

    const warnings = validarParedeTier2(parede, ALTURAS, mapaItens(item));

    expect(warnings.some((w) => w.codigo === "FAIXA_COLIDE")).toBe(true);
  });
});

describe("validarParedeTier2 — item vs. elemento de parede (2b)", () => {
  const janela: ElementoParede = {
    id: "janela-1",
    tipo: "janela",
    x: 200,
    y: 900,
    largura: 800,
    altura: 1000,
    refX: "esquerda",
    refY: "chao",
  };

  it("item posicionado sobrepõe uma janela", () => {
    const item = placaItem({ id: "a", largura: 600, altura: 700 });
    const parede = paredeBase({
      elementos: [janela],
      itens: [{ itemId: "a", x: 0, faixa: "bancada" }], // Y=900, [0,600]x[900,1600] cruza a janela
    });

    const warnings = validarParedeTier2(parede, ALTURAS, mapaItens(item));

    expect(warnings.some((w) => w.codigo === "ITEM_SOBRE_ELEMENTO_PAREDE")).toBe(true);
  });

  it("item posicionado sobrepõe uma porta", () => {
    const porta: ElementoParede = {
      id: "porta-1",
      tipo: "porta",
      x: 0,
      y: 0,
      largura: 800,
      altura: 2100,
      refX: "esquerda",
      refY: "chao",
    };
    const item = placaItem({ id: "a", largura: 600, altura: 700 });
    const parede = paredeBase({
      elementos: [porta],
      itens: [{ itemId: "a", x: 200, faixa: "inferior" }], // Y=0, cruza a porta
    });

    const warnings = validarParedeTier2(parede, ALTURAS, mapaItens(item));

    expect(warnings.some((w) => w.codigo === "ITEM_SOBRE_ELEMENTO_PAREDE")).toBe(true);
  });

  it("item posicionado NÃO sobrepõe nenhum elemento — sem warnings", () => {
    const item = placaItem({ id: "a", largura: 600, altura: 700 });
    const parede = paredeBase({
      elementos: [janela],
      itens: [{ itemId: "a", x: 1500, faixa: "inferior" }], // Y=0..700, longe da janela (x 200..1000, y 900..1900)
    });

    const warnings = validarParedeTier2(parede, ALTURAS, mapaItens(item));

    expect(warnings.filter((w) => w.codigo === "ITEM_SOBRE_ELEMENTO_PAREDE")).toHaveLength(0);
  });
});
