import { describe, it, expect } from "vitest";
import { explodeBox, calcularOrcamentoBox } from "./index";
import { vaoVazio, type BayNode, type BoxModule } from "./types";

const CAIXA = { cor: "Branco TX", espessura: 15 };

function caixaVazia(tipo: BoxModule["tipo"], raiz?: BayNode): BoxModule {
  return {
    id: "b1",
    nome: `Caixa ${tipo}`,
    tipo,
    largura: 800,
    altura: 720,
    profundidade: 550,
    caixa: CAIXA,
    raiz: raiz ?? vaoVazio("r"),
  };
}

const nomes = (r: { pecas: { nome: string }[] }) => r.pecas.map((p) => p.nome);
const qtd = (r: { pecas: { nome: string; quantidade: number }[] }, nome: string) =>
  r.pecas.filter((p) => p.nome === nome).reduce((s, p) => s + p.quantidade, 0);
const ferr = (r: { ferragens: { item: string; quantidade: number }[] }, item: string) =>
  r.ferragens.find((f) => f.item === item)?.quantidade ?? 0;

describe("box — carcaça por tipo", () => {
  it("inferior: laterais + base + 2 travessas, sem tampo nem rodapé", () => {
    const r = explodeBox(caixaVazia("inferior"));
    expect(qtd(r, "Lateral")).toBe(2);
    expect(qtd(r, "Base")).toBe(1);
    expect(qtd(r, "Travessa Superior Frontal")).toBe(1);
    expect(qtd(r, "Travessa Superior Traseira")).toBe(1);
    expect(nomes(r)).not.toContain("Tampo");
    expect(nomes(r)).not.toContain("Rodapé Frontal");
  });

  it("aéreo: laterais + base + tampo, sem travessas", () => {
    const r = explodeBox(caixaVazia("aereo"));
    expect(qtd(r, "Tampo")).toBe(1);
    expect(nomes(r)).not.toContain("Travessa Superior Frontal");
  });

  it("torre: tampo + rodapé", () => {
    const r = explodeBox(caixaVazia("torre"));
    expect(qtd(r, "Tampo")).toBe(1);
    expect(qtd(r, "Rodapé Frontal")).toBe(1);
  });
});

describe("box — subdivisão horizontal com conteúdos distintos", () => {
  // Inferior com 1 divisória horizontal: vão de cima com porta basculante,
  // vão de baixo com 1 gaveta externa.
  const raiz: BayNode = {
    id: "r",
    split: "horizontal",
    qtdDivisorias: 1,
    children: [
      {
        id: "cima",
        split: "none",
        qtdDivisorias: 0,
        content: {
          tipo: "portas",
          qtd: 1,
          sentidos: ["basculante"],
          material: { cor: "Madeirado", espessura: 18 },
        },
      },
      {
        id: "baixo",
        split: "none",
        qtdDivisorias: 0,
        content: {
          tipo: "gaveta",
          qtd: 1,
          profundidade: 500,
          interna: false,
          corFrente: "Madeirado",
          espessuraFrente: 18,
        },
      },
    ],
  };
  const r = explodeBox(caixaVazia("inferior", raiz));

  it("gera 1 divisória horizontal, 1 porta e 1 frente de gaveta", () => {
    expect(qtd(r, "Divisória Horizontal")).toBe(1);
    expect(qtd(r, "Porta")).toBe(1);
    expect(qtd(r, "Frente Gaveta Externa")).toBe(1);
  });

  it("porta basculante gera pistão + 2 dobradiças; gaveta gera corrediça", () => {
    expect(ferr(r, "pistao")).toBe(1);
    expect(ferr(r, "dobradica_35")).toBe(2);
    expect(ferr(r, "corredica_par")).toBe(1);
    // puxador: 1 da basculante + 1 da gaveta externa
    expect(ferr(r, "puxador")).toBe(2);
  });
});

describe("box — matemática da subdivisão vertical", () => {
  it("divide a largura interna descontando a divisória", () => {
    // aéreo 1000 de largura, caixa 15mm → interna 970; 1 divisória → vãos de
    // (970 − 15)/2 = 477,5mm. Prateleira = vão − 2mm de folga = 475,5 → 476.
    const raiz: BayNode = {
      id: "r",
      split: "vertical",
      qtdDivisorias: 1,
      children: [
        { id: "a", split: "none", qtdDivisorias: 0, content: { tipo: "prateleira", qtd: 1, recuo: 0 } },
        { id: "b", split: "none", qtdDivisorias: 0, content: { tipo: "prateleira", qtd: 1, recuo: 0 } },
      ],
    };
    const box: BoxModule = { ...caixaVazia("aereo"), largura: 1000, altura: 700, profundidade: 300, raiz };
    const r = explodeBox(box);
    const prat = r.pecas.filter((p) => p.nome === "Prateleira");
    expect(prat).toHaveLength(2);
    expect(prat[0].largura_mm).toBe(476);
  });
});

describe("box — integração com o pipeline de custo", () => {
  it("produz EngineOutput consolidável", () => {
    const out = calcularOrcamentoBox([caixaVazia("inferior")], 0.12);
    expect(out.porModulo).toHaveLength(1);
    expect(out.consolidado.mdf.length).toBeGreaterThan(0);
    expect(out.consolidado.mdf[0].chapas).toBeGreaterThanOrEqual(1);
  });
});
