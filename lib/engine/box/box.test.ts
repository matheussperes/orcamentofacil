import { describe, it, expect } from "vitest";
import { explodeBox, calcularOrcamentoBox } from "./index";
import { vaoVazio, larguraInstalacaoBox, type BayNode, type BoxModule, type FrenteConteudo, type TamponamentoLado } from "./types";
import type { Peca } from "../types";

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

function espaco(
  id: string,
  frente: FrenteConteudo,
  opts: { prateleiras?: { qtd: number; recuo: number }; fundo?: { espessura: number } } = {}
): BayNode {
  return {
    id,
    split: "none",
    qtdDivisorias: 0,
    content: { tipo: "espaco", frente, prateleiras: opts.prateleiras, fundo: opts.fundo },
  };
}

const ladoInativo = (): TamponamentoLado => ({
  ativo: false,
  sarrafo: false,
  material: { cor: "Madeirado", espessura: 25 },
});

const nomes = (r: { pecas: { nome: string }[] }) => r.pecas.map((p) => p.nome);
const qtd = (r: { pecas: { nome: string; quantidade: number }[] }, nome: string) =>
  r.pecas.filter((p) => p.nome === nome).reduce((s, p) => s + p.quantidade, 0);
const ferr = (r: { ferragens: { item: string; quantidade: number }[] }, item: string) =>
  r.ferragens.find((f) => f.item === item)?.quantidade ?? 0;
const peca = (r: { pecas: Peca[] }, nome: string) => r.pecas.find((p) => p.nome === nome);

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

  it("travessa é deitada (rasa): não reduz a altura útil do vão como um tampo faria", () => {
    // Mesmo box (L=800,H=720,P=550,t=15), mesma porta em inferior x aereo:
    // a altura da porta deve ser IDÊNTICA nos dois casos, pois a travessa
    // (deitada, como a base) só consome a espessura t, igual ao tampo.
    const portaContent: FrenteConteudo = {
      tipo: "portas", qtd: 1, sentidos: ["direita"], material: CAIXA,
    };
    const rInferior = explodeBox(caixaVazia("inferior", espaco("r", portaContent)));
    const rAereo = explodeBox(caixaVazia("aereo", espaco("r", portaContent)));
    expect(peca(rInferior, "Porta")!.altura_mm).toBe(peca(rAereo, "Porta")!.altura_mm);
  });

  it("travessa: peça é rasa (70mm) e larga (largura interna), não alta", () => {
    const r = explodeBox(caixaVazia("inferior"));
    const t = peca(r, "Travessa Superior Frontal")!;
    expect(t.altura_mm).toBe(70); // profundidade que avança no móvel
    expect(t.largura_mm).toBe(770); // 800 - 2*15
  });
});

describe("box — frente + prateleiras + fundo combináveis (não precisa dividir)", () => {
  it("um vão com 2 portas TAMBÉM tem prateleiras internas e fundo, sem split", () => {
    const raiz = espaco(
      "r",
      { tipo: "portas", qtd: 2, sentidos: ["esquerda", "direita"], material: { cor: "Louro Freijó", espessura: 18 } },
      { prateleiras: { qtd: 2, recuo: 20 }, fundo: { espessura: 6 } }
    );
    const r = explodeBox(caixaVazia("inferior", raiz));
    expect(qtd(r, "Porta")).toBe(2);
    expect(qtd(r, "Prateleira")).toBe(2);
    expect(qtd(r, "Fundo")).toBe(1);
  });

  it("gaveta também pode ter prateleiras e fundo simultaneamente", () => {
    const raiz = espaco(
      "r",
      { tipo: "gaveta", qtd: 2, profundidade: 500, interna: false, corFrente: "Madeirado", espessuraFrente: 18 },
      { fundo: { espessura: 6 } }
    );
    const r = explodeBox(caixaVazia("inferior", raiz));
    expect(qtd(r, "Frente Gaveta Externa")).toBe(2);
    expect(qtd(r, "Fundo")).toBe(1);
  });

  it("vão vazio pode ter só prateleiras (nicho aberto)", () => {
    const raiz = espaco("r", { tipo: "vazio" }, { prateleiras: { qtd: 3, recuo: 0 } });
    const r = explodeBox(caixaVazia("aereo", raiz));
    expect(qtd(r, "Prateleira")).toBe(3);
    expect(nomes(r)).not.toContain("Porta");
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
      espaco("cima", { tipo: "portas", qtd: 1, sentidos: ["basculante"], material: { cor: "Madeirado", espessura: 18 } }),
      espaco("baixo", { tipo: "gaveta", qtd: 1, profundidade: 500, interna: false, corFrente: "Madeirado", espessuraFrente: 18 }),
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
        espaco("a", { tipo: "vazio" }, { prateleiras: { qtd: 1, recuo: 0 } }),
        espaco("b", { tipo: "vazio" }, { prateleiras: { qtd: 1, recuo: 0 } }),
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

describe("box — overrides de instância (portas e fundo)", () => {
  const raiz = espaco(
    "r",
    { tipo: "portas", qtd: 2, sentidos: ["esquerda", "direita"], material: { cor: "Branco TX", espessura: 15 } },
    { fundo: { espessura: 6 } }
  );

  it("overridePortas troca a cor/espessura de TODAS as portas do módulo", () => {
    const box: BoxModule = { ...caixaVazia("inferior", raiz), overridePortas: { cor: "Madeirado", espessura: 18 } };
    const r = explodeBox(box);
    const portas = r.pecas.filter((p) => p.nome === "Porta");
    expect(portas.every((p) => p.cor === "Madeirado" && p.espessura_mm === 18)).toBe(true);
  });

  it("overrideTemFundo=false remove o fundo mesmo que o gabarito tenha definido", () => {
    const box: BoxModule = { ...caixaVazia("inferior", raiz), overrideTemFundo: false };
    const r = explodeBox(box);
    expect(qtd(r, "Fundo")).toBe(0);
  });

  it("overrideTemFundo=true injeta fundo (6mm) mesmo em vão sem fundo definido", () => {
    const semFundo = espaco("r2", { tipo: "portas", qtd: 1, sentidos: ["direita"], material: CAIXA });
    const box: BoxModule = { ...caixaVazia("inferior", semFundo), overrideTemFundo: true };
    const r = explodeBox(box);
    expect(qtd(r, "Fundo")).toBe(1);
    expect(peca(r, "Fundo")!.espessura_mm).toBe(6);
  });

  it("sem override, respeita o que foi salvo no gabarito (com fundo)", () => {
    const r = explodeBox(caixaVazia("inferior", raiz));
    expect(qtd(r, "Fundo")).toBe(1);
  });
});

describe("box — tamponamento de instância por lado (soma à largura, doc 12)", () => {
  const ladoAtivo = (): TamponamentoLado => ({
    ativo: true,
    sarrafo: false,
    material: { cor: "Madeirado", espessura: 25 },
  });

  it("sem tamponamento, largura de instalação = largura de fabricação", () => {
    const box = caixaVazia("inferior");
    expect(larguraInstalacaoBox(box)).toBe(800);
  });

  it("soma a espessura apenas dos lados ativos (esquerdo/direito) à largura de instalação", () => {
    const box: BoxModule = {
      ...caixaVazia("inferior"),
      tamponamento: {
        esquerdo: ladoAtivo(), direito: ladoInativo(), superior: ladoInativo(), inferior: ladoInativo(),
      },
    };
    expect(larguraInstalacaoBox(box)).toBe(825); // 800 + 25
  });

  it("gera 1 peça inteiriça por lado ativo, sem alterar as peças internas da carcaça", () => {
    const box: BoxModule = {
      ...caixaVazia("inferior"),
      tamponamento: {
        esquerdo: ladoAtivo(), direito: ladoAtivo(), superior: ladoInativo(), inferior: ladoInativo(),
      },
    };
    const semTamponamento = explodeBox(caixaVazia("inferior"));
    const comTamponamento = explodeBox(box);
    const tamponamentos = comTamponamento.pecas.filter((p) => p.nome.startsWith("Tamponamento"));
    expect(tamponamentos).toHaveLength(2);
    expect(tamponamentos.every((p) => p.cor === "Madeirado" && p.espessura_mm === 25)).toBe(true);
    // Peças da carcaça (laterais/base/travessas) permanecem idênticas.
    const semNomes = semTamponamento.pecas.map((p) => `${p.nome}:${p.largura_mm}x${p.altura_mm}`).sort();
    const comNomesCarcaca = comTamponamento.pecas
      .filter((p) => !p.nome.startsWith("Tamponamento") && !p.nome.startsWith("Sarrafo"))
      .map((p) => `${p.nome}:${p.largura_mm}x${p.altura_mm}`)
      .sort();
    expect(comNomesCarcaca).toEqual(semNomes);
  });

  it("cada lado tem sua própria montagem (um sarrafo, outro inteiriço) e material", () => {
    const box: BoxModule = {
      ...caixaVazia("torre"),
      tamponamento: {
        esquerdo: { ativo: true, sarrafo: true, material: { cor: "Madeirado", espessura: 25 } },
        direito: { ativo: true, sarrafo: false, material: { cor: "Branco TX", espessura: 18 } },
        superior: ladoInativo(),
        inferior: ladoInativo(),
      },
    };
    const r = explodeBox(box);
    const sarrafosEsquerdo = r.pecas.filter((p) => p.nome.includes("Sarrafo tamponamento (esquerdo)"));
    expect(sarrafosEsquerdo.reduce((s, p) => s + p.quantidade, 0)).toBe(4);
    expect(sarrafosEsquerdo.every((p) => p.cor === "Madeirado")).toBe(true);

    const tampDireito = r.pecas.find((p) => p.nome === "Tamponamento direito");
    expect(tampDireito).toBeDefined();
    expect(tampDireito!.cor).toBe("Branco TX");
    expect(tampDireito!.espessura_mm).toBe(18);
  });
});
