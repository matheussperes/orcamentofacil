import { describe, it, expect, vi } from "vitest";
import { migrarBayNode, migrarBoxModule } from "./migrate";
import { explodeBox } from "./explode";
import type { BayNode, BoxModule } from "./types";

// Reproduz o bug real: presets salvos ANTES da refatoração do BayContent
// (doc 13) ficam no localStorage do usuário no formato antigo. Sem migração,
// isso quebra a aplicação (TypeError: Cannot read properties of undefined
// (reading 'tipo')) ao tentar renderizar/calcular o preset.
//
// Nesta sessão, portas e fundo saíram do `content` por vão e viraram
// entidades globais (`box.portas`/`box.temFundo`) — `migrarBayNode` só cuida
// mais do FORMATO local do content (frente vazio/gaveta + prateleiras); a
// extração de portas/fundo legados é feita por `migrarBoxModule` (que tem
// acesso à árvore inteira e ao `box.tipo`, necessário pro mapeamento de
// "basculante").

describe("migrarBayNode — formatos antigos de conteúdo", () => {
  it("migra 'portas' antigo (tipo direto): o vão vira vazio (a porta é extraída à parte, ver migrarBoxModule)", () => {
    const antigo = {
      id: "r",
      split: "none",
      qtdDivisorias: 0,
      // Formato pré-refatoração: sem "frente", tipo direto na raiz do content.
      content: { tipo: "portas", qtd: 2, sentidos: ["esquerda", "direita"], material: { cor: "Branco TX", espessura: 18 } },
    } as unknown as BayNode;

    const novo = migrarBayNode(antigo);
    expect(novo.content).toEqual({ tipo: "espaco", frente: { tipo: "vazio" } });
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

  it("migra 'fundo' antigo: o vão vira vazio (fundo agora é global via box.temFundo)", () => {
    const antigo = {
      id: "r", split: "none", qtdDivisorias: 0,
      content: { tipo: "fundo", espessura: 6 },
    } as unknown as BayNode;
    const novo = migrarBayNode(antigo);
    expect(novo.content).toEqual({ tipo: "espaco", frente: { tipo: "vazio" } });
  });

  it("descarta bay de tamponamento estrutural com aviso (Modelo de Domínio 3.6 — saiu do BayContent, Task 12.4)", () => {
    const node = {
      id: "r", split: "none", qtdDivisorias: 0,
      content: { tipo: "tamponamento", lado: "direito", material: { cor: "Branco TX", espessura: 15 }, sarrafo: false },
    } as unknown as BayNode;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const novo = migrarBayNode(node);

    expect(novo.content).toEqual({ tipo: "espaco", frente: { tipo: "vazio" } });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/tamponamento/i);
    expect(warnSpy.mock.calls[0][0]).toContain("r"); // id do vão na mensagem
    warnSpy.mockRestore();
  });

  it("não altera conteúdo já no formato novo (idempotente)", () => {
    const node: BayNode = {
      id: "r", split: "none", qtdDivisorias: 0,
      content: { tipo: "espaco", frente: { tipo: "gaveta", qtd: 2, profundidade: 500, interna: false } },
    };
    expect(migrarBayNode(node)).toEqual(node);
  });

  it("migra recursivamente vãos divididos e define recuoFrontal/posicao default", () => {
    const antigo = {
      id: "r", split: "horizontal", qtdDivisorias: 1,
      children: [
        { id: "a", split: "none", qtdDivisorias: 0, content: { tipo: "portas", qtd: 1, sentidos: ["direita"], material: { cor: "Branco TX", espessura: 18 } } },
        { id: "b", split: "none", qtdDivisorias: 0, content: { tipo: "fundo", espessura: 6 } },
      ],
    } as unknown as BayNode;
    const novo = migrarBayNode(antigo);
    expect(novo.recuoFrontal).toBe(20);
    expect(novo.posicao).toBe("centralizado");
    expect(novo.children![0].content).toEqual({ tipo: "espaco", frente: { tipo: "vazio" } });
    expect(novo.children![1].content).toEqual({ tipo: "espaco", frente: { tipo: "vazio" } });
  });
});

describe("migrarBoxModule — portas/fundo legados viram entidades globais", () => {
  it("extrai porta presa a um vão-folha (formato antigo) para box.portas", () => {
    const boxAntigo = {
      id: "b1", nome: "X", tipo: "inferior",
      largura: 800, altura: 720, profundidade: 550,
      caixa: { cor: "Branco TX", espessura: 15 },
      raiz: {
        id: "r", split: "none", qtdDivisorias: 0,
        content: { tipo: "portas", qtd: 2, sentidos: ["esquerda", "direita"], material: { cor: "Louro Freijó", espessura: 18 } },
      },
    } as unknown as BoxModule;

    const migrado = migrarBoxModule(boxAntigo);
    expect(migrado.portas).toHaveLength(1);
    expect(migrado.portas[0]).toMatchObject({
      alvo: { tipo: "vaos", vaoIds: ["r"] },
      tipoAbertura: "abrir",
      sentido: "esquerda",
      qtd: 2,
    });
    expect(migrado.raiz.content).toEqual({ tipo: "espaco", frente: { tipo: "vazio" } });
  });

  it("mapeia 'basculante' pra basculante_aereo em módulo aéreo e basculante_pia nos demais", () => {
    const raizComBasculante = (): BayNode => ({
      id: "r", split: "none", qtdDivisorias: 0,
      content: { tipo: "portas", qtd: 1, sentidos: ["basculante"], material: { cor: "Branco TX", espessura: 18 } } as never,
    });
    const aereo = migrarBoxModule({
      id: "b1", nome: "X", tipo: "aereo", largura: 800, altura: 700, profundidade: 350,
      caixa: { cor: "Branco TX", espessura: 15 }, raiz: raizComBasculante(),
    } as unknown as BoxModule);
    const inferior = migrarBoxModule({
      id: "b2", nome: "Y", tipo: "inferior", largura: 800, altura: 720, profundidade: 550,
      caixa: { cor: "Branco TX", espessura: 15 }, raiz: raizComBasculante(),
    } as unknown as BoxModule);
    expect(aereo.portas[0].sentido).toBe("basculante_aereo");
    expect(inferior.portas[0].sentido).toBe("basculante_pia");
  });

  it("mapeia 'cava' (removida do modelo novo) pra 'direita'", () => {
    const box = {
      id: "b1", nome: "X", tipo: "inferior", largura: 800, altura: 720, profundidade: 550,
      caixa: { cor: "Branco TX", espessura: 15 },
      raiz: {
        id: "r", split: "none", qtdDivisorias: 0,
        content: { tipo: "portas", qtd: 1, sentidos: ["cava"], material: { cor: "Branco TX", espessura: 18 } },
      },
    } as unknown as BoxModule;
    expect(migrarBoxModule(box).portas[0].sentido).toBe("direita");
  });

  it("temFundo: derivado de overrideTemFundo legado quando presente", () => {
    const box = {
      id: "b1", nome: "X", tipo: "inferior", largura: 800, altura: 720, profundidade: 550,
      caixa: { cor: "Branco TX", espessura: 15 },
      raiz: { id: "r", split: "none", qtdDivisorias: 0, content: { tipo: "vazio" } },
      overrideTemFundo: false,
    } as unknown as BoxModule;
    expect(migrarBoxModule(box).temFundo).toBe(false);
  });

  it("temFundo: default true quando algum vão antigo tinha fundo e não há override", () => {
    const box = {
      id: "b1", nome: "X", tipo: "inferior", largura: 800, altura: 720, profundidade: 550,
      caixa: { cor: "Branco TX", espessura: 15 },
      raiz: { id: "r", split: "none", qtdDivisorias: 0, content: { tipo: "fundo", espessura: 6 } },
    } as unknown as BoxModule;
    expect(migrarBoxModule(box).temFundo).toBe(true);
  });

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

  it("preset com bay de tamponamento estrutural (BayContent) é migrado descartando esse conteúdo, sem quebrar o resto do preset", () => {
    const boxAntigo = {
      id: "b1", nome: "Guarda-roupa com tamponamento estrutural", tipo: "torre",
      largura: 1600, altura: 2200, profundidade: 550,
      caixa: { cor: "Branco TX", espessura: 15 },
      raiz: {
        id: "r", split: "vertical", qtdDivisorias: 1,
        children: [
          {
            id: "a", split: "none", qtdDivisorias: 0,
            content: { tipo: "espaco", frente: { tipo: "vazio" } },
          },
          {
            id: "b", split: "none", qtdDivisorias: 0,
            content: { tipo: "tamponamento", lado: "direito", material: { cor: "Branco TX", espessura: 15 }, sarrafo: false },
          },
        ],
      },
    } as unknown as BoxModule;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const migrado = migrarBoxModule(boxAntigo);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(migrado.raiz.children![0].content).toEqual({ tipo: "espaco", frente: { tipo: "vazio" } });
    expect(migrado.raiz.children![1].content).toEqual({ tipo: "espaco", frente: { tipo: "vazio" } });
    // resto do preset (largura/altura/profundidade/caixa) intacto
    expect(migrado.largura).toBe(1600);
    expect(migrado.caixa.cor).toBe("Branco TX");
    warnSpy.mockRestore();
    expect(() => explodeBox(migrado)).not.toThrow();
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
