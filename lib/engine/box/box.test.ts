import { describe, it, expect } from "vitest";
import { explodeBox, calcularOrcamentoBox } from "./index";
import { vaoVazio, type BayNode, type BoxModule, type FrenteConteudo, type GrupoPortas, type TipoPuxador } from "./types";
import type { Peca } from "../types";

const CAIXA = { cor: "Branco TX", espessura: 15 };

function caixaVazia(
  tipo: BoxModule["tipo"],
  raiz?: BayNode,
  opts: {
    portas?: GrupoPortas[];
    temFundo?: boolean;
    puxador?: TipoPuxador;
    largura?: number;
    altura?: number;
    profundidade?: number;
  } = {}
): BoxModule {
  return {
    id: "b1",
    nome: `Caixa ${tipo}`,
    tipo,
    largura: opts.largura ?? 800,
    altura: opts.altura ?? 720,
    profundidade: opts.profundidade ?? 550,
    caixa: CAIXA,
    raiz: raiz ?? vaoVazio("r"),
    portas: opts.portas ?? [],
    temFundo: opts.temFundo ?? false,
    puxador: opts.puxador ?? "haste",
  };
}

function espaco(
  id: string,
  frente: FrenteConteudo,
  opts: { prateleiras?: { qtd: number; recuo: number } } = {}
): BayNode {
  return {
    id,
    split: "none",
    qtdDivisorias: 0,
    content: { tipo: "espaco", frente, prateleiras: opts.prateleiras },
  };
}

function grupoPortas(alvo: GrupoPortas["alvo"], opts: Partial<Omit<GrupoPortas, "alvo">> = {}): GrupoPortas {
  return {
    id: opts.id ?? "grupo-1",
    alvo,
    tipoAbertura: opts.tipoAbertura ?? "abrir",
    sentido: opts.sentido ?? "direita",
    qtd: opts.qtd ?? 1,
    material: opts.material ?? CAIXA,
  };
}

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
    const portas = [grupoPortas({ tipo: "vaos", vaoIds: ["r"] }, { qtd: 1, material: CAIXA })];
    const rInferior = explodeBox(caixaVazia("inferior", espaco("r", { tipo: "vazio" }), { portas }));
    const rAereo = explodeBox(caixaVazia("aereo", espaco("r", { tipo: "vazio" }), { portas }));
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
    const raiz = espaco("r", { tipo: "vazio" }, { prateleiras: { qtd: 2, recuo: 20 } });
    const portas = [grupoPortas({ tipo: "vaos", vaoIds: ["r"] }, { qtd: 2, material: { cor: "Louro Freijó", espessura: 18 } })];
    const r = explodeBox(caixaVazia("inferior", raiz, { portas, temFundo: true }));
    expect(qtd(r, "Porta")).toBe(2);
    expect(qtd(r, "Prateleira")).toBe(2);
    expect(qtd(r, "Fundo")).toBe(1);
  });

  it("gaveta também pode ter prateleiras e fundo simultaneamente", () => {
    const raiz = espaco("r", { tipo: "gaveta", qtd: 2, profundidade: 500, interna: false, corFrente: "Madeirado", espessuraFrente: 18 });
    const r = explodeBox(caixaVazia("inferior", raiz, { temFundo: true }));
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
      espaco("cima", { tipo: "vazio" }),
      espaco("baixo", { tipo: "gaveta", qtd: 1, profundidade: 500, interna: false, corFrente: "Madeirado", espessuraFrente: 18 }),
    ],
  };
  const portas = [
    grupoPortas({ tipo: "vaos", vaoIds: ["cima"] }, { qtd: 1, sentido: "basculante_pia", material: { cor: "Madeirado", espessura: 18 } }),
  ];
  const r = explodeBox(caixaVazia("inferior", raiz, { portas }));

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

describe("box — overrides de instância (portas) e fundo global", () => {
  const raiz = espaco("r", { tipo: "vazio" });
  const portas = [grupoPortas({ tipo: "vaos", vaoIds: ["r"] }, { qtd: 2, material: { cor: "Branco TX", espessura: 15 } })];

  it("overridePortas troca a cor/espessura de TODAS as portas do módulo", () => {
    const box: BoxModule = { ...caixaVazia("inferior", raiz, { portas }), overridePortas: { cor: "Madeirado", espessura: 18 } };
    const r = explodeBox(box);
    const p = r.pecas.filter((p) => p.nome === "Porta");
    expect(p.every((p) => p.cor === "Madeirado" && p.espessura_mm === 18)).toBe(true);
  });

  it("temFundo=false não gera peça Fundo", () => {
    const box = caixaVazia("inferior", raiz, { portas, temFundo: false });
    const r = explodeBox(box);
    expect(qtd(r, "Fundo")).toBe(0);
  });

  it("temFundo=true gera 1 fundo (6mm) do tamanho da caixa (não do vão)", () => {
    const box = caixaVazia("inferior", raiz, { portas, temFundo: true });
    const r = explodeBox(box);
    expect(qtd(r, "Fundo")).toBe(1);
    expect(peca(r, "Fundo")!.espessura_mm).toBe(6);
  });
});

describe("box — fundo global (largura×altura da caixa, split por divisão vertical > 1800mm)", () => {
  it("largura <= 1800mm: 1 fundo só, do tamanho largura×altura da caixa, mesmo com divisões", () => {
    const raiz: BayNode = {
      id: "r", split: "vertical", qtdDivisorias: 1,
      children: [espaco("a", { tipo: "vazio" }), espaco("b", { tipo: "vazio" })],
    };
    const box = caixaVazia("inferior", raiz, { temFundo: true, largura: 1600, altura: 720 });
    const r = explodeBox(box);
    expect(qtd(r, "Fundo")).toBe(1);
    const f = peca(r, "Fundo")!;
    expect(f.largura_mm).toBe(1600);
    expect(f.altura_mm).toBe(720);
  });

  it("largura > 1800mm e sem divisão vertical: continua 1 fundo só (oversized)", () => {
    const box = caixaVazia("inferior", undefined, { temFundo: true, largura: 2100, altura: 2700 });
    const r = explodeBox(box);
    expect(qtd(r, "Fundo")).toBe(1);
    const f = peca(r, "Fundo")!;
    expect(f.largura_mm).toBe(2100);
    expect(f.altura_mm).toBe(2700);
  });

  it("exemplo do usuário: 2700 altura × 2100 largura, 2 divisões verticais (3 vãos) -> 3 fundos de 2700×700", () => {
    const raiz: BayNode = {
      id: "r", split: "vertical", qtdDivisorias: 2,
      children: [espaco("a", { tipo: "vazio" }), espaco("b", { tipo: "vazio" }), espaco("c", { tipo: "vazio" })],
    };
    const box = caixaVazia("torre", raiz, { temFundo: true, largura: 2100, altura: 2700 });
    const r = explodeBox(box);
    expect(qtd(r, "Fundo")).toBe(3);
    const f = peca(r, "Fundo")!;
    expect(f.largura_mm).toBe(700);
    expect(f.altura_mm).toBe(2700);
  });

  it("bugfix: divisão vertical dentro de uma divisão horizontal NÃO divide o fundo (não atravessa a altura inteira)", () => {
    // Split horizontal no topo (2 filhos empilhados); só o filho de baixo
    // tem 1 divisão vertical (2 colunas). Essa divisória vertical só vai da
    // base até a divisória horizontal, não do chão ao teto da caixa — não
    // conta pra fragmentar o fundo.
    const raiz: BayNode = {
      id: "r", split: "horizontal", qtdDivisorias: 1,
      children: [
        espaco("cima", { tipo: "vazio" }),
        {
          id: "baixo", split: "vertical", qtdDivisorias: 1,
          children: [espaco("baixo-a", { tipo: "vazio" }), espaco("baixo-b", { tipo: "vazio" })],
        },
      ],
    };
    const box = caixaVazia("torre", raiz, { temFundo: true, largura: 2000, altura: 2200 });
    const r = explodeBox(box);
    expect(qtd(r, "Fundo")).toBe(1);
    const f = peca(r, "Fundo")!;
    expect(f.largura_mm).toBe(2000);
    expect(f.altura_mm).toBe(2200);
  });

  it("só a divisão vertical de altura inteira (na raiz) fragmenta o fundo, mesmo com mais divisões dentro de um dos lados", () => {
    // Raiz vertical (2 colunas, atravessa a altura inteira) -> 2 fundos.
    // A coluna "b" ainda é dividida horizontalmente por dentro, mas isso não
    // soma nenhuma coluna extra (seção anterior já cobre esse caso).
    const raiz: BayNode = {
      id: "r", split: "vertical", qtdDivisorias: 1,
      children: [
        espaco("a", { tipo: "vazio" }),
        {
          id: "b", split: "horizontal", qtdDivisorias: 1,
          children: [espaco("b-cima", { tipo: "vazio" }), espaco("b-baixo", { tipo: "vazio" })],
        },
      ],
    };
    const box = caixaVazia("torre", raiz, { temFundo: true, largura: 2000, altura: 2200 });
    const r = explodeBox(box);
    expect(qtd(r, "Fundo")).toBe(2);
    expect(peca(r, "Fundo")!.largura_mm).toBe(1000);
  });
});

describe("box — grupos de porta independentes da árvore", () => {
  const raizDividida: BayNode = {
    id: "r",
    split: "vertical",
    qtdDivisorias: 1,
    children: [espaco("a", { tipo: "vazio" }), espaco("b", { tipo: "vazio" })],
  };

  it("caixa_inteira ignora a divisão interna: 1 grupo cobre a largura toda", () => {
    const portas = [grupoPortas({ tipo: "caixa_inteira" }, { qtd: 2 })];
    const r = explodeBox(caixaVazia("inferior", raizDividida, { portas }));
    // largura interna = 800 - 2*15 = 770; 2 portas -> 770/2 - FOLGA_PORTA(3) = 382
    expect(peca(r, "Porta")!.largura_mm).toBe(382);
  });

  it("alvo vãos: porta cobre só a união dos vãos selecionados", () => {
    const portas = [grupoPortas({ tipo: "vaos", vaoIds: ["a"] }, { qtd: 1 })];
    const r = explodeBox(caixaVazia("inferior", raizDividida, { portas }));
    // vão "a": (770-15)/2 = 377,5 de largura útil, -3 de folga = 374,5 -> 375
    expect(peca(r, "Porta")!.largura_mm).toBe(375);
  });

  it("correr gera kit_porta_correr, sem dobradiça (mas com puxador, padrão haste)", () => {
    const portas = [grupoPortas({ tipo: "vaos", vaoIds: ["r"] }, { qtd: 2, tipoAbertura: "correr" })];
    const r = explodeBox(caixaVazia("inferior", espaco("r", { tipo: "vazio" }), { portas }));
    expect(ferr(r, "kit_porta_correr")).toBe(1);
    expect(ferr(r, "dobradica_35")).toBe(0);
    expect(ferr(r, "puxador")).toBe(2);
  });

  it("grupo alvo vãos sem correspondência na árvore não gera peça", () => {
    const portas = [grupoPortas({ tipo: "vaos", vaoIds: ["inexistente"] }, { qtd: 1 })];
    const r = explodeBox(caixaVazia("inferior", espaco("r", { tipo: "vazio" }), { portas }));
    expect(nomes(r)).not.toContain("Porta");
  });
});

describe("box — puxador (haste/perfil/sem_puxador)", () => {
  it("haste (padrão): 1 puxador por porta, nenhum perfil", () => {
    const portas = [grupoPortas({ tipo: "vaos", vaoIds: ["r"] }, { qtd: 2, sentido: "direita" })];
    const r = explodeBox(caixaVazia("inferior", espaco("r", { tipo: "vazio" }), { portas, puxador: "haste" }));
    expect(ferr(r, "puxador")).toBe(2);
    expect(ferr(r, "perfil_puxador_m")).toBe(0);
  });

  it("perfil: soma o comprimento da borda (altura da porta) em metros, sem puxador un.", () => {
    const portas = [grupoPortas({ tipo: "vaos", vaoIds: ["r"] }, { qtd: 2, sentido: "direita" })];
    const r = explodeBox(caixaVazia("inferior", espaco("r", { tipo: "vazio" }), { portas, puxador: "perfil" }));
    const alturaPorta = peca(r, "Porta")!.altura_mm;
    expect(ferr(r, "puxador")).toBe(0);
    expect(ferr(r, "perfil_puxador_m")).toBeCloseTo((alturaPorta * 2) / 1000, 2);
  });

  it("perfil na basculante usa a largura da porta (borda horizontal), não a altura", () => {
    const portas = [grupoPortas({ tipo: "vaos", vaoIds: ["r"] }, { qtd: 1, sentido: "basculante_pia" })];
    const r = explodeBox(caixaVazia("inferior", espaco("r", { tipo: "vazio" }), { portas, puxador: "perfil" }));
    const p = peca(r, "Porta")!;
    expect(ferr(r, "perfil_puxador_m")).toBeCloseTo(p.largura_mm / 1000, 2);
  });

  it("sem_puxador: nenhuma ferragem de puxador, em porta nem em gaveta externa", () => {
    const portas = [grupoPortas({ tipo: "vaos", vaoIds: ["r"] }, { qtd: 2, sentido: "direita" })];
    const raizGaveta = espaco("g", { tipo: "gaveta", qtd: 2, profundidade: 500, interna: false, corFrente: "Madeirado", espessuraFrente: 18 });
    const rPortas = explodeBox(caixaVazia("inferior", espaco("r", { tipo: "vazio" }), { portas, puxador: "sem_puxador" }));
    const rGaveta = explodeBox(caixaVazia("inferior", raizGaveta, { puxador: "sem_puxador" }));
    expect(ferr(rPortas, "puxador")).toBe(0);
    expect(ferr(rPortas, "perfil_puxador_m")).toBe(0);
    expect(ferr(rGaveta, "puxador")).toBe(0);
    expect(ferr(rGaveta, "perfil_puxador_m")).toBe(0);
  });

  it("gaveta externa com perfil: comprimento = largura da frente, por gaveta", () => {
    const raizGaveta = espaco("g", { tipo: "gaveta", qtd: 2, profundidade: 500, interna: false, corFrente: "Madeirado", espessuraFrente: 18 });
    const r = explodeBox(caixaVazia("inferior", raizGaveta, { puxador: "perfil" }));
    const frente = peca(r, "Frente Gaveta Externa")!;
    expect(ferr(r, "perfil_puxador_m")).toBeCloseTo((frente.largura_mm * 2) / 1000, 2);
  });

  it("gaveta interna (guarda-roupa) nunca gera ferragem de puxador, independente da config", () => {
    const raizInterna = espaco("g", { tipo: "gaveta", qtd: 2, profundidade: 500, interna: true });
    const r = explodeBox(caixaVazia("inferior", raizInterna, { puxador: "haste" }));
    expect(ferr(r, "puxador")).toBe(0);
    expect(ferr(r, "perfil_puxador_m")).toBe(0);
  });
});

describe("box — BayContent sem o branch de tamponamento estrutural (Task 12.4, Modelo de Domínio 3.6)", () => {
  it("explode normalmente uma árvore só com vãos 'espaco' (única forma restante de BayContent)", () => {
    const raiz: BayNode = {
      id: "r",
      split: "vertical",
      qtdDivisorias: 1,
      children: [
        espaco("a", { tipo: "vazio" }, { prateleiras: { qtd: 2, recuo: 20 } }),
        espaco("b", { tipo: "gaveta", qtd: 2, profundidade: 500, interna: false }),
      ],
    };
    const box = caixaVazia("inferior", raiz);
    expect(() => explodeBox(box)).not.toThrow();
    const r = explodeBox(box);
    expect(nomes(r)).not.toContain("Tamponamento");
    expect(r.pecas.some((p) => p.nome === "Prateleira")).toBe(true);
  });
});

describe("box — veio de chapa (Modelo de Domínio Seção 8, Task 12.5)", () => {
  const CAIXA_COM_VEIO = { cor: "Louro Freijó", espessura: 15, temVeio: true };

  it("BoxMaterial.temVeio: true propaga até Peca.temVeio (Lateral, caixa com veio)", () => {
    const box = caixaVazia("inferior");
    box.caixa = CAIXA_COM_VEIO;
    const r = explodeBox(box);
    expect(peca(r, "Lateral")!.temVeio).toBe(true);
    expect(peca(r, "Base")!.temVeio).toBe(true);
  });

  it("BoxMaterial sem temVeio (ausente) propaga temVeio: false (default 'sem veio')", () => {
    const r = explodeBox(caixaVazia("inferior")); // caixa = { cor, espessura } — sem temVeio
    expect(peca(r, "Lateral")!.temVeio).toBe(false);
  });

  it("Lateral (derivada de altura+profundidade do módulo, profundidade em largura_mm) → sentidoVeio 'largura'", () => {
    // caixaVazia default: altura=720, profundidade=550.
    const r = explodeBox(caixaVazia("inferior"));
    const lateral = peca(r, "Lateral")!;
    expect(lateral.altura_mm).toBe(720);
    expect(lateral.largura_mm).toBe(550);
    expect(lateral.sentidoVeio).toBe("largura");
  });

  it("Base (derivada de profundidade+largura do módulo, profundidade em altura_mm) → sentidoVeio 'comprimento'", () => {
    // caixaVazia default: profundidade=550, largura=800 (larguraInterna = 800 - 2*15 = 770).
    const r = explodeBox(caixaVazia("inferior"));
    const base = peca(r, "Base")!;
    expect(base.altura_mm).toBe(550);
    expect(base.largura_mm).toBe(770);
    expect(base.sentidoVeio).toBe("comprimento");
  });

  it("Prateleira (derivada de profundidade+largura do vão, profundidade em altura_mm) → sentidoVeio 'comprimento'", () => {
    const raiz = espaco("r", { tipo: "vazio" }, { prateleiras: { qtd: 1, recuo: 20 } });
    const r = explodeBox(caixaVazia("aereo", raiz));
    const prateleira = peca(r, "Prateleira")!;
    // Vão interno: W = 800 - 2*15 = 770 (menos 2mm de folga = 768);
    // D = profundidade = 550, recuo 20 → altura_mm = 550 - 20 = 530.
    expect(prateleira.altura_mm).toBe(530);
    expect(prateleira.largura_mm).toBe(768);
    expect(prateleira.sentidoVeio).toBe("comprimento");
  });

  it("todas as peças recebem sentidoVeio setado (nunca undefined), mesmo sem veio", () => {
    const r = explodeBox(caixaVazia("torre", espaco("r", { tipo: "vazio" }, { prateleiras: { qtd: 1, recuo: 20 } }), { temFundo: true }));
    for (const p of r.pecas) {
      expect(p.sentidoVeio === "comprimento" || p.sentidoVeio === "largura").toBe(true);
      expect(typeof p.temVeio).toBe("boolean");
    }
  });
});
