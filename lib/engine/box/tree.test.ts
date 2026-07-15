import { describe, it, expect } from "vitest";
import { dividirVao, excluirDivisoria, layoutVaos, retanguloVaos } from "./tree";
import { vaoVazio } from "./types";

describe("tree — divisão assimétrica (posição direita/esquerda)", () => {
  it("centralizado: N+1 vãos iguais", () => {
    const raiz = dividirVao(vaoVazio("r"), "r", "vertical", 1);
    const rects = layoutVaos(raiz, 0, 0, 1000, 500, 15);
    expect(rects).toHaveLength(2);
    expect(rects[0].w).toBeCloseTo(492.5);
    expect(rects[1].w).toBeCloseTo(492.5);
  });

  it("posicao direita: último vão recebe recuoLateral, os demais dividem o restante igualmente", () => {
    const raiz = dividirVao(vaoVazio("r"), "r", "vertical", 2, { posicao: "direita", recuoLateral: 200 });
    const rects = layoutVaos(raiz, 0, 0, 1000, 500, 15);
    // disponível = 1000 - 2*15 = 970; último = 200; os outros 2 dividem 770 -> 385 cada
    expect(rects).toHaveLength(3);
    expect(rects[2].w).toBeCloseTo(200);
    expect(rects[0].w).toBeCloseTo(385);
    expect(rects[1].w).toBeCloseTo(385);
  });

  it("posicao esquerda: primeiro vão recebe recuoLateral", () => {
    const raiz = dividirVao(vaoVazio("r"), "r", "horizontal", 1, { posicao: "esquerda", recuoLateral: 100 });
    const rects = layoutVaos(raiz, 0, 0, 500, 1000, 15);
    expect(rects[0].h).toBeCloseTo(100);
    expect(rects[1].h).toBeCloseTo(1000 - 15 - 100);
  });
});

describe("tree — excluirDivisoria", () => {
  it("funde os 2 vãos separados pela divisória num único vão vazio", () => {
    const dividido = dividirVao(vaoVazio("r"), "r", "vertical", 2);
    const idAntes = dividido.children![0].id;
    const depois = excluirDivisoria(dividido, "r", 0);
    expect(depois.qtdDivisorias).toBe(1);
    expect(depois.children).toHaveLength(2);
    expect(depois.children![0].id).toBe(idAntes);
    expect(depois.children![0].content).toEqual({ tipo: "espaco", frente: { tipo: "vazio" } });
  });

  it("remover a última divisória colapsa o nó de volta a um vão-folha vazio", () => {
    const dividido = dividirVao(vaoVazio("r"), "r", "vertical", 1);
    const depois = excluirDivisoria(dividido, "r", 0);
    expect(depois.split).toBe("none");
    expect(depois.id).toBe("r");
  });

  it("índice fora do intervalo não altera a árvore", () => {
    const dividido = dividirVao(vaoVazio("r"), "r", "vertical", 1);
    const depois = excluirDivisoria(dividido, "r", 5);
    expect(depois).toEqual(dividido);
  });
});

describe("tree — retanguloVaos", () => {
  it("bounding box da união de vãos selecionados", () => {
    const raiz = dividirVao(vaoVazio("r"), "r", "vertical", 2); // 3 vãos iguais
    const ids = raiz.children!.slice(0, 2).map((c) => c.id);
    const rect = retanguloVaos(raiz, new Set(ids), 0, 0, 900, 400, 15);
    expect(rect).not.toBeNull();
    expect(rect!.x).toBe(0);
    expect(rect!.w).toBeGreaterThan(500); // cobre os 2 primeiros vãos + a divisória entre eles
  });

  it("retorna null quando nenhum id selecionado existe na árvore", () => {
    const raiz = vaoVazio("r");
    expect(retanguloVaos(raiz, new Set(["inexistente"]), 0, 0, 800, 400, 15)).toBeNull();
  });
});
