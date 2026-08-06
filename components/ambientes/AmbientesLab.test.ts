// Task 2.7-2.11 (front) — testes puros das funções extraídas de
// AmbientesLab.tsx pra edição de Elemento de parede. Mesmo espírito de
// ElevacaoParede.test.ts: sem jsdom no ambiente de teste (ver
// vitest.config.ts, `environment: "node"`), então só a lógica pura é
// exercitada aqui — os dois caminhos de entrada (lápis na lista, clique no
// 2D) e o preenchimento do formulário são verificados visualmente no
// browser.
import { describe, expect, it } from "vitest";
import { aplicarPresetElementoParede, recalcularValorAoTrocarRef, salvarElementoNaLista } from "./AmbientesLab";
import { valorParaCanonico } from "@/lib/engine/parede/referenciaMedida";
import type { ElementoParede } from "@/lib/engine/parede";
import type { ElementoParedePresetRow } from "@/lib/elemento-parede-preset/tipos";

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
