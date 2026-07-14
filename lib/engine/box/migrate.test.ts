import { describe, it, expect } from "vitest";
import { migrarBayNode, migrarBoxModule } from "./migrate";
import { explodeBox } from "./explode";
import type { BayNode, BoxModule } from "./types";

// Reproduz o bug real: presets salvos ANTES da refatoração do BayContent
// (doc 13) ficam no localStorage do usuário no formato antigo. Sem migração,
// isso quebra a aplicação (TypeError: Cannot read properties of undefined
// (reading 'tipo')) ao tentar renderizar/calcular o preset.

describe("migrarBayNode — formatos antigos de conteúdo", () => {
  it("migra 'portas' antigo (tipo direto) para o novo formato aninhado em frente", () => {
    const antigo = {
      id: "r",
      split: "none",
      qtdDivisorias: 0,
      // Formato pré-refatoração: sem "frente", tipo direto na raiz do content.
      content: { tipo: "portas", qtd: 2, sentidos: ["esquerda", "direita"], material: { cor: "Branco TX", espessura: 18 } },
    } as unknown as BayNode;

    const novo = migrarBayNode(antigo);
    expect(novo.content).toMatchObject({
      tipo: "espaco",
      frente: { tipo: "portas", qtd: 2 },
    });
  });

  it("migra 'gaveta' antigo", () => {
    const antigo = {
      id: "r", split: "none", qtdDivisorias: 0,
      content: { tipo: "gaveta", qtd: 3, profundidade: 500, interna: false, corFrente: "Madeirado", espessuraFrente: 18 },
    } as unknown as BayNode;
    const novo = migrarBayNode(antigo);
    expect(novo.content).toMatchObject({ tipo: "espaco", frente: { tipo: "gaveta", qtd: 3 } });
  });

  it("migra 'prateleira' antigo para frente vazia + prateleiras", () => {
    const antigo = {
      id: "r", split: "none", qtdDivisorias: 0,
      content: { tipo: "prateleira", qtd: 2, recuo: 20 },
    } as unknown as BayNode;
    const novo = migrarBayNode(antigo);
    expect(novo.content).toMatchObject({
      tipo: "espaco",
      frente: { tipo: "vazio" },
      prateleiras: { qtd: 2, recuo: 20 },
    });
  });

  it("migra 'fundo' antigo para frente vazia + fundo", () => {
    const antigo = {
      id: "r", split: "none", qtdDivisorias: 0,
      content: { tipo: "fundo", espessura: 6 },
    } as unknown as BayNode;
    const novo = migrarBayNode(antigo);
    expect(novo.content).toMatchObject({ tipo: "espaco", frente: { tipo: "vazio" }, fundo: { espessura: 6 } });
  });

  it("não altera tamponamento (mesmo formato antes e depois)", () => {
    const node = {
      id: "r", split: "none", qtdDivisorias: 0,
      content: { tipo: "tamponamento", lado: "direito", material: { cor: "Branco TX", espessura: 15 }, sarrafo: false },
    } as unknown as BayNode;
    const novo = migrarBayNode(node);
    expect(novo.content).toEqual(node.content);
  });

  it("não altera conteúdo já no formato novo (idempotente)", () => {
    const node: BayNode = {
      id: "r", split: "none", qtdDivisorias: 0,
      content: { tipo: "espaco", frente: { tipo: "portas", qtd: 2, sentidos: ["direita", "esquerda"], material: { cor: "Branco TX", espessura: 18 } } },
    };
    expect(migrarBayNode(node)).toEqual(node);
  });

  it("migra recursivamente vãos divididos", () => {
    const antigo = {
      id: "r", split: "horizontal", qtdDivisorias: 1,
      children: [
        { id: "a", split: "none", qtdDivisorias: 0, content: { tipo: "portas", qtd: 1, sentidos: ["direita"], material: { cor: "Branco TX", espessura: 18 } } },
        { id: "b", split: "none", qtdDivisorias: 0, content: { tipo: "fundo", espessura: 6 } },
      ],
    } as unknown as BayNode;
    const novo = migrarBayNode(antigo);
    expect(novo.children![0].content).toMatchObject({ tipo: "espaco", frente: { tipo: "portas" } });
    expect(novo.children![1].content).toMatchObject({ tipo: "espaco", fundo: { espessura: 6 } });
  });
});

describe("migrarBoxModule — cenário real que quebrava a aplicação", () => {
  it("um preset salvo no formato antigo explode sem lançar exceção depois de migrado", () => {
    const boxAntigo = {
      id: "b1", nome: "Balcão salvo antes da refatoração", tipo: "inferior",
      largura: 800, altura: 720, profundidade: 550,
      caixa: { cor: "Branco TX", espessura: 15 },
      raiz: {
        id: "r", split: "none", qtdDivisorias: 0,
        content: { tipo: "portas", qtd: 2, sentidos: ["esquerda", "direita"], material: { cor: "Louro Freijó", espessura: 18 } },
      },
      // tamponamento no formato antigo: booleans + material/sarrafo compartilhado
      tamponamento: {
        esquerdo: true, direito: false, superior: false, inferior: false,
        sarrafo: false, material: { cor: "Madeirado", espessura: 18 },
      },
    } as unknown as BoxModule;

    const migrado = migrarBoxModule(boxAntigo);
    expect(() => explodeBox(migrado)).not.toThrow();

    const r = explodeBox(migrado);
    expect(r.pecas.some((p) => p.nome === "Porta")).toBe(true);
    expect(migrado.tamponamento?.esquerdo.ativo).toBe(true);
    expect(migrado.tamponamento?.esquerdo.material.cor).toBe("Madeirado");
  });

  it("explodeBox no formato ANTIGO (sem migrar) de fato lançava exceção — prova do bug", () => {
    const boxAntigo = {
      id: "b1", nome: "X", tipo: "inferior",
      largura: 800, altura: 720, profundidade: 550,
      caixa: { cor: "Branco TX", espessura: 15 },
      raiz: {
        id: "r", split: "none", qtdDivisorias: 0,
        content: { tipo: "portas", qtd: 2, sentidos: ["esquerda", "direita"], material: { cor: "Louro Freijó", espessura: 18 } },
      },
    } as unknown as BoxModule;

    expect(() => explodeBox(boxAntigo)).toThrow();
  });
});
