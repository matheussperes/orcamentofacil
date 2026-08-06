import { describe, expect, it } from "vitest";
import { calcularVizinhos, converterVaoParaX, converterXParaVao, type Vizinhos } from "./posicionamento";
import type { ResolvedorItens } from "./validar";
import type { ItemPosicionado, Parede } from "./types";
import type { ModuloOrcamento } from "../../orcamento";
import type { Placa } from "../placa/types";

const MATERIAL = { cor: "Branco TX", espessura: 15 };

function placaItem(id: string, largura: number, overrides: Partial<Placa> = {}): ModuloOrcamento {
  const placa: Placa = {
    id,
    nome: `Item ${id}`,
    largura,
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
    if (item.origem === "placa") m.set(item.placa.id, item);
  }
  return m;
}

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

// Os 4 exemplos trabalhados da Seção 3.1.1 (Modelo de Domínio) usam sempre a
// faixa "inferior" numa parede de 3000mm de largura.
describe("Seção 3.1.1 — exemplo trabalhado: inserção sequencial", () => {
  it("M1 largura 800, ref esquerda, vão 0 — encostado na parede, x=0", () => {
    const parede = paredeBase();
    const resolvedor = mapaItens();
    // Nenhum item ainda: vizinho esquerdo é a própria parede (borda 0).
    const vizinhos = calcularVizinhos(parede, resolvedor, { faixa: "inferior", x: 0, largura: 800 });
    expect(vizinhos.esquerdo).toEqual({ itemId: null, borda: 0 });

    const resultado = converterVaoParaX(0, "esquerda", 800, vizinhos);
    expect(resultado).toEqual({ ok: true, x: 0 });
  });

  it("M2 largura 600, ref esquerda, vão 0 — vizinho esquerdo M1 (borda 800), x=800", () => {
    const parede = paredeBase({ itens: [{ itemId: "M1", x: 0, faixa: "inferior" }] });
    const resolvedor = mapaItens(placaItem("M1", 800));

    // Item ainda não posicionado: x provisório "encostado na borda direita
    // da parede" (decisão documentada em posicionamento.ts) — reproduz o
    // vizinho esquerdo = item mais à direita já posicionado (M1).
    const vizinhos = calcularVizinhos(parede, resolvedor, {
      faixa: "inferior",
      x: parede.largura - 600,
      largura: 600,
    });
    expect(vizinhos.esquerdo).toEqual({ itemId: "M1", borda: 800 });

    const resultado = converterVaoParaX(0, "esquerda", 600, vizinhos);
    expect(resultado).toEqual({ ok: true, x: 800 });
  });

  it("M3 largura 400, ref esquerda, vão 50 — vizinho esquerdo M2 (borda 1400), x=1450", () => {
    const parede = paredeBase({
      itens: [
        { itemId: "M1", x: 0, faixa: "inferior" },
        { itemId: "M2", x: 800, faixa: "inferior" },
      ],
    });
    const resolvedor = mapaItens(placaItem("M1", 800), placaItem("M2", 600));

    const vizinhos = calcularVizinhos(parede, resolvedor, {
      faixa: "inferior",
      x: parede.largura - 400,
      largura: 400,
    });
    expect(vizinhos.esquerdo).toEqual({ itemId: "M2", borda: 1400 });

    const resultado = converterVaoParaX(50, "esquerda", 400, vizinhos);
    expect(resultado).toEqual({ ok: true, x: 1450 });
  });
});

describe("Seção 3.1.1 — exemplo trabalhado: deleção do módulo do meio (Q-2)", () => {
  it("apagar M2: x(M1) e x(M3) ficam inalterados; vão exibido de M3 recalcula pra 650", () => {
    // Estado ANTES da deleção (resultado do exemplo de inserção acima):
    // M1 [0,800], M2 [800,1400], M3 [1450,1850].
    const antes: Parede = paredeBase({
      itens: [
        { itemId: "M1", x: 0, faixa: "inferior" },
        { itemId: "M2", x: 800, faixa: "inferior" },
        { itemId: "M3", x: 1450, faixa: "inferior" },
      ],
    });
    const resolvedorAntes = mapaItens(placaItem("M1", 800), placaItem("M2", 600), placaItem("M3", 400));
    const vaoAntes = converterXParaVao(antes, resolvedorAntes, { itemId: "M3", x: 1450, faixa: "inferior" });
    expect(vaoAntes?.esquerda).toBe(50); // exibia 50 antes da deleção

    // Depois: M2 removido de `parede.itens`. Nenhuma função de conversão
    // reescreve x — só o vão exibido muda porque o vizinho mudou.
    const depois: Parede = paredeBase({
      itens: [
        { itemId: "M1", x: 0, faixa: "inferior" },
        { itemId: "M3", x: 1450, faixa: "inferior" },
      ],
    });
    const resolvedorDepois = mapaItens(placaItem("M1", 800), placaItem("M3", 400));

    // Invariante de não-movimento: x de M1 e M3 continuam os mesmos.
    expect(depois.itens.find((i) => i.itemId === "M1")?.x).toBe(0);
    expect(depois.itens.find((i) => i.itemId === "M3")?.x).toBe(1450);

    const vaoDepois = converterXParaVao(depois, resolvedorDepois, { itemId: "M3", x: 1450, faixa: "inferior" });
    expect(vaoDepois).toEqual({ esquerda: 650, direita: 3000 - 1850 });
  });
});

describe("Seção 3.1.1 — exemplo trabalhado: entrada pela direita", () => {
  it("M4 largura 500, ref direita, vão 100, sem nada à direita de M3 — x=2400", () => {
    // Estado: M1 [0,800], M3 [1450,1850] (M2 já foi apagado no exemplo anterior).
    const parede = paredeBase({
      itens: [
        { itemId: "M1", x: 0, faixa: "inferior" },
        { itemId: "M3", x: 1450, faixa: "inferior" },
      ],
    });
    const resolvedor = mapaItens(placaItem("M1", 800), placaItem("M3", 400));

    // Item ainda não posicionado, entrando pela direita: x provisório
    // encostado na borda direita da parede (mesma decisão do exemplo de
    // inserção) — reproduz vizinho direito = a própria parede.
    const vizinhos = calcularVizinhos(parede, resolvedor, {
      faixa: "inferior",
      x: parede.largura - 500,
      largura: 500,
    });
    expect(vizinhos.direito).toEqual({ itemId: null, borda: 3000 });

    const resultado = converterVaoParaX(100, "direita", 500, vizinhos);
    expect(resultado).toEqual({ ok: true, x: 2400 });

    // Vão exibido à esquerda de M4, uma vez posicionado: 2400 - 1850 = 550.
    const paredeComM4: Parede = { ...parede, itens: [...parede.itens, { itemId: "M4", x: 2400, faixa: "inferior" }] };
    const resolvedorComM4 = mapaItens(placaItem("M1", 800), placaItem("M3", 400), placaItem("M4", 500));
    const vaoM4 = converterXParaVao(paredeComM4, resolvedorComM4, { itemId: "M4", x: 2400, faixa: "inferior" });
    expect(vaoM4?.esquerda).toBe(550);
  });
});

describe("validações da conversão de entrada (erro, não aviso)", () => {
  const vizinhosNeutros: Vizinhos = { esquerdo: { itemId: null, borda: 0 }, direito: { itemId: null, borda: 3000 } };

  it("vao < 0 rejeita com VAO_NEGATIVO", () => {
    const resultado = converterVaoParaX(-10, "esquerda", 500, vizinhosNeutros);
    expect(resultado).toEqual({ ok: false, codigo: "VAO_NEGATIVO", mensagem: expect.any(String) });
  });

  it("x < 0 após conversão (ref direita) rejeita com FORA_DA_PAREDE", () => {
    // vizinho direito bem próximo da borda esquerda da parede: qualquer vão
    // exigido empurra x pra negativo.
    const vizinhos: Vizinhos = { esquerdo: { itemId: null, borda: 0 }, direito: { itemId: null, borda: 100 } };
    const resultado = converterVaoParaX(50, "direita", 200, vizinhos);
    // x = 100 - 50 - 200 = -150
    expect(resultado).toEqual({ ok: false, codigo: "FORA_DA_PAREDE", mensagem: expect.any(String) });
  });
});

describe("vizinho ausente = a própria parede", () => {
  it("parede vazia: vizinho esquerdo e direito são a parede (bordas 0 e largura)", () => {
    const parede = paredeBase();
    const vizinhos = calcularVizinhos(parede, mapaItens(), { faixa: "bancada", x: 1000, largura: 500 });
    expect(vizinhos).toEqual<Vizinhos>({
      esquerdo: { itemId: null, borda: 0 },
      direito: { itemId: null, borda: 3000 },
    });
  });
});

describe("torre é vizinha das três faixas (inferior/bancada/aereo) e vice-versa", () => {
  it("um item 'bancada' enxerga uma torre como vizinho esquerdo", () => {
    const parede = paredeBase({ itens: [{ itemId: "TORRE", x: 0, faixa: "torre" }] });
    const resolvedor = mapaItens(placaItem("TORRE", 600));

    const vizinhos = calcularVizinhos(parede, resolvedor, { faixa: "bancada", x: 600, largura: 400 });
    expect(vizinhos.esquerdo).toEqual({ itemId: "TORRE", borda: 600 });
  });

  it("um item 'aereo' enxerga uma torre como vizinho esquerdo", () => {
    const parede = paredeBase({ itens: [{ itemId: "TORRE", x: 0, faixa: "torre" }] });
    const resolvedor = mapaItens(placaItem("TORRE", 600));

    const vizinhos = calcularVizinhos(parede, resolvedor, { faixa: "aereo", x: 600, largura: 400 });
    expect(vizinhos.esquerdo).toEqual({ itemId: "TORRE", borda: 600 });
  });

  it("a torre enxerga itens de inferior, bancada e aereo como candidatos (vice-versa)", () => {
    const parede = paredeBase({
      itens: [
        { itemId: "INF", x: 0, faixa: "inferior" },
        { itemId: "BAN", x: 600, faixa: "bancada" },
        { itemId: "AER", x: 1200, faixa: "aereo" },
      ],
    });
    const resolvedor = mapaItens(placaItem("INF", 600), placaItem("BAN", 600), placaItem("AER", 600));

    // Torre entrando a x=1800: vizinho esquerdo é o candidato de MAIOR borda
    // direita <= 1800 entre inferior/bancada/aereo/torre — aqui, AER (1800).
    const vizinhos = calcularVizinhos(parede, resolvedor, { faixa: "torre", x: 1800, largura: 500 });
    expect(vizinhos.esquerdo).toEqual({ itemId: "AER", borda: 1800 });
  });

  it("um item 'inferior' NÃO enxerga um item 'bancada' como vizinho (faixas diferentes, sem torre)", () => {
    const parede = paredeBase({ itens: [{ itemId: "BAN", x: 0, faixa: "bancada" }] });
    const resolvedor = mapaItens(placaItem("BAN", 600));

    const vizinhos = calcularVizinhos(parede, resolvedor, { faixa: "inferior", x: 600, largura: 400 });
    expect(vizinhos.esquerdo).toEqual({ itemId: null, borda: 0 });
  });
});

describe("converterXParaVao — item não resolvível", () => {
  it("devolve undefined quando o itemId não corresponde a nenhum módulo (mesmo tratamento silencioso do Tier 1)", () => {
    const parede = paredeBase({ itens: [{ itemId: "orfao", x: 0, faixa: "inferior" }] });
    const resultado = converterXParaVao(parede, mapaItens(), { itemId: "orfao", x: 0, faixa: "inferior" });
    expect(resultado).toBeUndefined();
  });
});
