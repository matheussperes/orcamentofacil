// Task 2.7-2.11 (front) — testes puros das funções extraídas de
// AmbientesLab.tsx pra edição de Elemento de parede. Mesmo espírito de
// ElevacaoParede.test.ts: sem jsdom no ambiente de teste (ver
// vitest.config.ts, `environment: "node"`), então só a lógica pura é
// exercitada aqui — os dois caminhos de entrada (lápis na lista, clique no
// 2D) e o preenchimento do formulário são verificados visualmente no
// browser.
import { describe, expect, it } from "vitest";
import {
  aplicarPresetElementoParede,
  definirAlturaOverride,
  moverIdNaLista,
  recalcularValorAoTrocarRef,
  remapearIdsAmbientes,
  removerAlturaOverride,
  salvarElementoNaLista,
  substituirParedeNaLista,
} from "./AmbientesLab";
import { valorParaCanonico } from "@/lib/engine/parede/referenciaMedida";
import type { ElementoParede } from "@/lib/engine/parede";
import type { ElementoParedePresetRow } from "@/lib/elemento-parede-preset/tipos";
import type { AmbienteItem, ParedeComMeta } from "@/lib/ambiente/estado";

describe("recalcularValorAoTrocarRef", () => {
  it("trocar refX sem editar o valor exibido preserva o canônico (nunca move o elemento)", () => {
    // parede 3000 de largura; janela 1200 de largura; refX "direita" 600
    const L = 3000;
    const largura = 1200;
    const canonicoAntes = valorParaCanonico(600, "direita", L, largura);

    const novoValorExibido = recalcularValorAoTrocarRef(600, "direita", "esquerda", L, largura);
    const canonicoDepois = valorParaCanonico(novoValorExibido, "esquerda", L, largura);

    expect(canonicoDepois).toBe(canonicoAntes);
  });

  it("trocar refY sem editar o valor exibido preserva o canônico (nunca move o elemento)", () => {
    // parede 2700 de altura; janela 1000 de altura; refY "teto" 1100
    const H = 2700;
    const altura = 1000;
    const canonicoAntes = valorParaCanonico(1100, "teto", H, altura);

    const novoValorExibido = recalcularValorAoTrocarRef(1100, "teto", "chao", H, altura);
    const canonicoDepois = valorParaCanonico(novoValorExibido, "chao", H, altura);

    expect(canonicoDepois).toBe(canonicoAntes);
  });
});

describe("salvarElementoNaLista", () => {
  const existente: ElementoParede = {
    id: "el-1",
    tipo: "janela",
    x: 100,
    y: 900,
    largura: 600,
    altura: 1000,
    refX: "esquerda",
    refY: "chao",
  };

  it("indiceEditando null: adiciona ao final, sem alterar os existentes", () => {
    const novo: ElementoParede = { ...existente, id: "el-2", tipo: "pedra" };
    const resultado = salvarElementoNaLista([existente], novo, null);

    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toEqual(existente);
    expect(resultado[1]).toEqual(novo);
  });

  it("indiceEditando definido: substitui o elemento naquele índice, não duplica", () => {
    const editado: ElementoParede = { ...existente, x: 500, refX: "direita" };
    const resultado = salvarElementoNaLista([existente], editado, 0);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toEqual(editado);
  });
});

describe("definirAlturaOverride", () => {
  it("seta um campo preservando os demais campos já presentes no override", () => {
    const resultado = definirAlturaOverride(
      { alturaRodape: 900, peDireito: 2100 },
      "alturaBancada",
      1000
    );

    expect(resultado).toEqual({ alturaRodape: 900, peDireito: 2100, alturaBancada: 1000 });
  });

  it("override inicial undefined: cria o objeto só com o campo setado", () => {
    const resultado = definirAlturaOverride(undefined, "alturaInstalacaoAereo", 1500);

    expect(resultado).toEqual({ alturaInstalacaoAereo: 1500 });
  });
});

describe("removerAlturaOverride", () => {
  it("remove a chave sem copiar valor numérico do perfil, preservando os demais campos", () => {
    const resultado = removerAlturaOverride(
      { alturaRodape: 900, alturaBancada: 1000, peDireito: 2100 },
      "alturaBancada"
    );

    expect(resultado).toEqual({ alturaRodape: 900, peDireito: 2100 });
    expect("alturaBancada" in resultado).toBe(false);
  });

  it("override inicial undefined: não quebra, resultado fica vazio", () => {
    const resultado = removerAlturaOverride(undefined, "peDireito");

    expect(resultado).toEqual({});
  });
});

describe("aplicarPresetElementoParede", () => {
  const presetBase: ElementoParedePresetRow = {
    id: "preset-1",
    organizacaoId: "org-1",
    nome: "Janela padrão",
    larguraPadrao: 800,
    alturaPadrao: 1200,
    criadoEm: new Date(0).toISOString(),
  };

  it("preset com larguraPadrao/alturaPadrao definidos sobrescreve os campos atuais", () => {
    const resultado = aplicarPresetElementoParede({ novaLargura: 600, novaAltura: 1000 }, presetBase);

    expect(resultado).toEqual({ novoNome: "Janela padrão", novaLargura: 800, novaAltura: 1200 });
  });

  it("preset com larguraPadrao/alturaPadrao ausentes mantém os valores atuais do formulário", () => {
    const preset: ElementoParedePresetRow = { ...presetBase, larguraPadrao: null, alturaPadrao: null };
    const resultado = aplicarPresetElementoParede({ novaLargura: 600, novaAltura: 1000 }, preset);

    expect(resultado).toEqual({ novoNome: "Janela padrão", novaLargura: 600, novaAltura: 1000 });
  });

  it("nome do preset sempre copiado, independente de largura/altura estarem definidos", () => {
    const preset: ElementoParedePresetRow = { ...presetBase, larguraPadrao: null };
    const resultado = aplicarPresetElementoParede({ novaLargura: 600, novaAltura: 1000 }, preset);

    expect(resultado.novoNome).toBe("Janela padrão");
  });
});

describe("moverIdNaLista", () => {
  it("move 'cima' faz swap com o vizinho anterior", () => {
    const resultado = moverIdNaLista(["a", "b", "c"], "b", "cima");
    expect(resultado).toEqual(["b", "a", "c"]);
  });

  it("move 'baixo' faz swap com o vizinho seguinte", () => {
    const resultado = moverIdNaLista(["a", "b", "c"], "b", "baixo");
    expect(resultado).toEqual(["a", "c", "b"]);
  });

  it("primeiro item não se move 'cima' (sem efeito na ponta)", () => {
    const ids = ["a", "b", "c"];
    expect(moverIdNaLista(ids, "a", "cima")).toEqual(ids);
  });

  it("último item não se move 'baixo' (sem efeito na ponta)", () => {
    const ids = ["a", "b", "c"];
    expect(moverIdNaLista(ids, "c", "baixo")).toEqual(ids);
  });

  it("id inexistente devolve a lista original, sem alterar nada", () => {
    const ids = ["a", "b", "c"];
    expect(moverIdNaLista(ids, "z", "cima")).toEqual(ids);
  });
});

function paredeDeTeste(overrides: Partial<ParedeComMeta> = {}): ParedeComMeta {
  return {
    id: "parede-x",
    nome: "Parede X",
    ordem: 0,
    largura: 3000,
    altura: 2700,
    elementos: [],
    itens: [],
    ...overrides,
  };
}

function ambienteDeTeste(overrides: Partial<AmbienteItem> = {}): AmbienteItem {
  return { id: "ambiente-x", nome: "Ambiente X", ordem: 0, paredes: [paredeDeTeste()], ...overrides };
}

describe("substituirParedeNaLista", () => {
  it("substitui a parede identificada por ambienteId/paredeId pelo objeto informado", () => {
    const ambientes = [ambienteDeTeste()];
    const atualizada = paredeDeTeste({ nome: "Parede Renomeada", largura: 4000 });

    const resultado = substituirParedeNaLista(ambientes, "ambiente-x", atualizada);

    expect(resultado[0].paredes[0]).toEqual(atualizada);
  });

  it("não afeta paredes de outros ambientes nem outras paredes do mesmo ambiente", () => {
    const outraParede = paredeDeTeste({ id: "parede-y", nome: "Parede Y" });
    const ambientes = [
      ambienteDeTeste({ paredes: [paredeDeTeste(), outraParede] }),
      ambienteDeTeste({ id: "ambiente-z", paredes: [paredeDeTeste({ id: "parede-z" })] }),
    ];

    const resultado = substituirParedeNaLista(ambientes, "ambiente-x", paredeDeTeste({ nome: "Editada" }));

    expect(resultado[0].paredes[0].nome).toBe("Editada");
    expect(resultado[0].paredes[1]).toEqual(outraParede);
    expect(resultado[1].paredes[0].id).toBe("parede-z");
  });
});

describe("remapearIdsAmbientes", () => {
  it("substitui ids de ambiente e parede pelos ids reais informados no mapa", () => {
    const ambientes = [ambienteDeTeste()];

    const resultado = remapearIdsAmbientes(ambientes, {
      ambientes: { "ambiente-x": "uuid-ambiente-real" },
      paredes: { "parede-x": "uuid-parede-real" },
    });

    expect(resultado[0].id).toBe("uuid-ambiente-real");
    expect(resultado[0].paredes[0].id).toBe("uuid-parede-real");
  });

  it("mantém o id original quando não há entrada correspondente no mapa", () => {
    const ambientes = [ambienteDeTeste()];

    const resultado = remapearIdsAmbientes(ambientes, { ambientes: {}, paredes: {} });

    expect(resultado[0].id).toBe("ambiente-x");
    expect(resultado[0].paredes[0].id).toBe("parede-x");
  });
});
