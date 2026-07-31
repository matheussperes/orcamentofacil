import { describe, expect, it } from "vitest";
import { ehGabaritoGlobal, gabaritoRowDeLinha } from "./tipos";
import { vaoVazio } from "@/lib/engine/box/types";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md).

function boxCru() {
  return {
    id: "seed",
    nome: "Balcão 2 Portas",
    tipo: "inferior",
    largura: 800,
    altura: 720,
    profundidade: 550,
    caixa: { cor: "Branco TX", espessura: 15 },
    raiz: vaoVazio("raiz"),
    portas: [],
    temFundo: true,
    puxador: "haste",
  };
}

describe("gabaritoRowDeLinha", () => {
  it("normaliza uma linha global (organizacao_id/origem_gabarito_id null) do PostgREST", () => {
    const linha = {
      id: "g1",
      organizacao_id: null,
      origem_gabarito_id: null,
      nome: "Balcão 2 Portas",
      categoria: "Cozinha",
      definicao: boxCru(),
      criado_em: "2026-01-01T00:00:00.000Z",
    };
    const row = gabaritoRowDeLinha(linha);
    expect(row.id).toBe("g1");
    expect(row.organizacaoId).toBeNull();
    expect(row.origemGabaritoId).toBeNull();
    expect(row.nome).toBe("Balcão 2 Portas");
    expect(row.categoria).toBe("Cozinha");
    expect(row.definicao.tipo).toBe("inferior");
    expect(row.definicao.largura).toBe(800);
  });

  it("normaliza uma linha própria de org, forkada de um gabarito global (origem_gabarito_id preenchido)", () => {
    const linha = {
      id: "g2",
      organizacao_id: "org-1",
      origem_gabarito_id: "g1",
      nome: "Balcão 2 Portas",
      categoria: "Cozinha",
      definicao: boxCru(),
      criado_em: "2026-01-02T00:00:00.000Z",
    };
    const row = gabaritoRowDeLinha(linha);
    expect(row.organizacaoId).toBe("org-1");
    expect(row.origemGabaritoId).toBe("g1");
  });

  it("aplica fallback de nome/categoria vazios (linha nunca deveria ter null nesses campos, mas não quebra)", () => {
    const row = gabaritoRowDeLinha({
      id: "g3",
      organizacao_id: null,
      origem_gabarito_id: null,
      nome: null,
      categoria: null,
      definicao: boxCru(),
      criado_em: null,
    });
    expect(row.nome).toBe("");
    expect(row.categoria).toBe("");
    expect(row.criadoEm).toBe(new Date(0).toISOString());
  });
});

describe("ehGabaritoGlobal", () => {
  it("true quando organizacaoId é null (base global, read-only)", () => {
    expect(ehGabaritoGlobal({ organizacaoId: null })).toBe(true);
  });

  it("false quando organizacaoId é de uma organização (próprio, editável)", () => {
    expect(ehGabaritoGlobal({ organizacaoId: "org-1" })).toBe(false);
  });
});
