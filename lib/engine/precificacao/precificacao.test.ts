import { describe, expect, it } from "vitest";
import type { PrecosReferencia } from "../prices";
import type {
  EngineOutput,
  GrupoMdf,
  ItemQtd,
  Peca,
  ResultadoModulo,
} from "../types";
import {
  calcularCustoMaterial,
  calcularMontagemTotal,
  calcularPrecoMoveis,
  calcularResumoFinanceiro,
  ratearPrecificacao,
} from "./index";
import type { GrupoItens } from "./types";

// ---- Builders de fixture ----

function peca(cor: string, espessura_mm: number, area_m2: number): Peca {
  return {
    nome: "peca",
    quantidade: 1,
    material_tipo: "caixa",
    cor,
    espessura_mm,
    altura_mm: 100,
    largura_mm: 100,
    area_m2,
    fita_m: 0,
    temVeio: false,
    sentidoVeio: "comprimento",
  };
}

function modulo(
  moduloId: string,
  pecas: Peca[],
  opts: { ferragens?: ItemQtd[]; fitaM?: number } = {}
): ResultadoModulo {
  const areaMdfM2 = pecas.reduce((s, p) => s + p.area_m2, 0);
  return {
    moduloId,
    templateCodigo: "T",
    nome: moduloId,
    pecas,
    ferragens: opts.ferragens ?? [],
    areaMdfM2,
    fitaM: opts.fitaM ?? 0,
  };
}

function grupoMdf(
  cor: string,
  espessura_mm: number,
  area_m2: number,
  chapas: number
): GrupoMdf {
  return {
    cor,
    espessura_mm,
    area_m2,
    area_com_perda_m2: area_m2,
    chapas,
  };
}

function engine(
  modulos: ResultadoModulo[],
  mdf: GrupoMdf[],
  extras: { fitaTotalM?: number; ferragens?: ItemQtd[] } = {}
): EngineOutput {
  return {
    porModulo: modulos,
    globais: [],
    consolidado: {
      mdf,
      fitaTotalM: extras.fitaTotalM ?? 0,
      ferragens: extras.ferragens ?? [],
    },
    warnings: [],
  };
}

const PRECOS: PrecosReferencia = {
  chapaPorEspessura: { 6: 150, 15: 285, 18: 250 },
  fitaMetro: 2.5,
  ferragens: { dobradica_35: 8, corredica_par: 45 },
  montagemPorM2: 90,
  freteFixo: 200,
};

const BRANCO = "Branco TX";
const AMADEIRADO = "Louro Freijó";

function gruposIndividuais(ids: string[]): GrupoItens[] {
  return ids.map((id) => ({ id, itemIds: [id] }));
}

// =====================================================================
// TESTE 1 — Exemplo trabalhado do briefing (Seção 5.2), número a número.
// Áreas de peça branca: 7,4 / 11,3 / 0,3 (total 19,0).
// =====================================================================
describe("exemplo trabalhado do briefing — chapas alocadas", () => {
  const mods = [
    modulo("cozinha", [peca(BRANCO, 18, 7.4)]),
    modulo("guarda_roupas", [peca(BRANCO, 18, 11.3)]),
    modulo("banheiro", [peca(BRANCO, 18, 0.3)]),
  ];
  const grupos = gruposIndividuais(["cozinha", "guarda_roupas", "banheiro"]);

  // preço final R$ 19.000 via modo fixo, sem montagem/frete → precoMoveis rateado por custo
  const config = {
    precificacao: { modo: "fixo" as const, valor: 19000 },
    montagem: { modo: "manual" as const, valor: 0 },
    freteTotal: 0,
  };

  it("Caso 1 — plano fecha em 19 chapas: alocação = 7,400 / 11,300 / 0,300", () => {
    const eng = engine(mods, [grupoMdf(BRANCO, 18, 19.0, 19)]);
    const snap = ratearPrecificacao(eng, grupos, config, PRECOS);
    const [coz, gr, ban] = snap.grupos;
    expect(coz.chapasAlocadas).toBeCloseTo(7.4, 3);
    expect(gr.chapasAlocadas).toBeCloseTo(11.3, 3);
    expect(ban.chapasAlocadas).toBeCloseTo(0.3, 3);
    // sem sobra: valores de móveis batem os redondos do exemplo
    expect(coz.valorRateado).toBe(7400);
    expect(gr.valorRateado).toBe(11300);
    expect(ban.valorRateado).toBe(300);
  });

  it("Caso 2 — plano fecha em 20 chapas: alocação = 7,789 / 11,895 / 0,316", () => {
    const eng = engine(mods, [grupoMdf(BRANCO, 18, 19.0, 20)]);
    const snap = ratearPrecificacao(eng, grupos, config, PRECOS);
    const [coz, gr, ban] = snap.grupos;
    expect(Math.abs(coz.chapasAlocadas - 7.789)).toBeLessThan(0.001);
    expect(Math.abs(gr.chapasAlocadas - 11.895)).toBeLessThan(0.001);
    expect(Math.abs(ban.chapasAlocadas - 0.316)).toBeLessThan(0.001);
    // total exato = 20 chapas
    expect(coz.chapasAlocadas + gr.chapasAlocadas + ban.chapasAlocadas).toBeCloseTo(
      20,
      6
    );
    // banheiro paga ~0,316 chapa ≈ R$ 79 (briefing) — custoAlocado da chapa
    // 20×250×0,3/19 = 78,947
    expect(ban.custoAlocado).toBeCloseTo(78.947, 2);
    // preço rateado por custo continua 7400/11300/300 (custo ∝ área; N cancela)
    expect(coz.valorRateado).toBe(7400);
    expect(gr.valorRateado).toBe(11300);
    expect(ban.valorRateado).toBe(300);
  });
});

// =====================================================================
// TESTE 2 — Invariante de arredondamento: soma das linhas == total, exato.
// =====================================================================
describe("arredondamento — soma das linhas == total exato", () => {
  it("R$ 19.000 em 3 grupos iguais (rateio ingênuo daria resíduo)", () => {
    const mods = [
      modulo("a", [peca(BRANCO, 18, 5)]),
      modulo("b", [peca(BRANCO, 18, 5)]),
      modulo("c", [peca(BRANCO, 18, 5)]),
    ];
    const eng = engine(mods, [grupoMdf(BRANCO, 18, 15, 3)]);
    const snap = ratearPrecificacao(
      eng,
      gruposIndividuais(["a", "b", "c"]),
      {
        precificacao: { modo: "fixo", valor: 19000 },
        montagem: { modo: "manual", valor: 0 },
        freteTotal: 0,
      },
      PRECOS
    );
    const soma = snap.grupos.reduce((s, g) => s + g.valorRateado, 0);
    expect(round2(soma)).toBe(snap.resumo.precoFinal);
    expect(snap.resumo.precoFinal).toBe(19000);
    // última linha absorve o resíduo (6333,33 / 6333,33 / 6333,34)
    expect(snap.grupos.map((g) => g.valorRateado)).toEqual([
      6333.33, 6333.33, 6333.34,
    ]);
  });

  it("invariante soma==total com móveis+montagem+frete todos ativos", () => {
    const mods = [
      modulo("a", [peca(BRANCO, 18, 3.1)], { fitaM: 4, ferragens: [{ item: "dobradica_35", quantidade: 3 }] }),
      modulo("b", [peca(BRANCO, 18, 6.9)], { fitaM: 7 }),
    ];
    const eng = engine(mods, [grupoMdf(BRANCO, 18, 10, 3)], {
      fitaTotalM: 11,
      ferragens: [{ item: "dobradica_35", quantidade: 3 }],
    });
    const snap = ratearPrecificacao(
      eng,
      gruposIndividuais(["a", "b"]),
      {
        precificacao: { modo: "multiplicador", fator: 2.5 },
        montagem: { modo: "percentual_material", percentual: 0.15 },
        freteTotal: 337.77,
      },
      PRECOS
    );
    const soma = round2(snap.grupos.reduce((s, g) => s + g.valorRateado, 0));
    expect(soma).toBe(snap.resumo.precoFinal);
    // cada componente também fecha exato
    const somaMoveis = round2(snap.grupos.reduce((s, g) => s + g.valorMoveis, 0));
    const somaFrete = round2(snap.grupos.reduce((s, g) => s + g.valorFrete, 0));
    const somaMont = round2(snap.grupos.reduce((s, g) => s + g.valorMontagem, 0));
    expect(somaMoveis).toBe(snap.precoMoveis);
    expect(somaFrete).toBe(snap.freteTotal);
    expect(somaMont).toBe(snap.montagemTotal);
  });
});

// =====================================================================
// TESTE 3 — Segregação por material.
// =====================================================================
describe("segregação por material", () => {
  it("grupo só de branco não paga chapa amadeirada de outro grupo", () => {
    const mods = [
      modulo("branco_only", [peca(BRANCO, 18, 10)]),
      modulo("amadeirado_only", [peca(AMADEIRADO, 18, 10)]),
    ];
    // branco: 2 chapas × 250 = 500; amadeirado: 2 chapas × 500 = 1000
    const eng = engine(mods, [
      grupoMdf(BRANCO, 18, 10, 2),
      grupoMdf(AMADEIRADO, 18, 10, 2),
    ]);
    const precos: PrecosReferencia = {
      ...PRECOS,
      chapaEspecifica: [
        { cor: BRANCO, espessura: 18, preco: 250 },
        { cor: AMADEIRADO, espessura: 18, preco: 500 },
      ],
    };
    const snap = ratearPrecificacao(
      eng,
      gruposIndividuais(["branco_only", "amadeirado_only"]),
      {
        precificacao: { modo: "multiplicador", fator: 1 },
        montagem: { modo: "manual", valor: 0 },
        freteTotal: 0,
      },
      precos
    );
    const [branco, amadeirado] = snap.grupos;
    // branco paga só suas 2 chapas brancas = 500; amadeirado = 1000
    expect(branco.custoAlocado).toBeCloseTo(500, 6);
    expect(amadeirado.custoAlocado).toBeCloseTo(1000, 6);
    // com fator 1, precoMoveis = custoMaterial = 1500; rateio 500:1000
    expect(snap.resumo.custoMaterial).toBeCloseTo(1500, 6);
    expect(branco.valorRateado).toBe(500);
    expect(amadeirado.valorRateado).toBe(1000);
  });
});

// =====================================================================
// TESTE 4 — Os 4 modos de precificação.
// =====================================================================
describe("4 modos de precificação", () => {
  const ctx = { custoMaterial: 1000, totalChapasInteiro: 8 };
  it("multiplicador: fator × custoMaterial", () => {
    expect(calcularPrecoMoveis({ modo: "multiplicador", fator: 2.5 }, ctx)).toBe(2500);
  });
  it("percentual (fração): custoMaterial × (1 + p)", () => {
    expect(calcularPrecoMoveis({ modo: "percentual", percentual: 0.5 }, ctx)).toBe(1500);
  });
  it("por_chapa: valorChapa × totalChapasInteiro", () => {
    expect(calcularPrecoMoveis({ modo: "por_chapa", valorChapa: 300 }, ctx)).toBe(2400);
  });
  it("fixo: valor (ignora custo)", () => {
    expect(calcularPrecoMoveis({ modo: "fixo", valor: 4200 }, ctx)).toBe(4200);
  });
});

// =====================================================================
// TESTE 5 — Os 3 modos de montagem + base de rateio correta.
// =====================================================================
describe("3 modos de montagem", () => {
  const ctx = { custoMaterial: 1000, totalChapasInteiro: 8 };
  it("percentual_material: custoMaterial × p", () => {
    expect(calcularMontagemTotal({ modo: "percentual_material", percentual: 0.15 }, ctx)).toBe(150);
  });
  it("por_chapa: valorChapa × totalChapasInteiro", () => {
    expect(calcularMontagemTotal({ modo: "por_chapa", valorChapa: 100 }, ctx)).toBe(800);
  });
  it("manual: valor", () => {
    expect(calcularMontagemTotal({ modo: "manual", valor: 555 }, ctx)).toBe(555);
  });

  it("montagem por_chapa rateia por CHAPAS alocadas, não por custo", () => {
    // 2 materiais com preço/área diferente: base custo ≠ base chapas.
    const mods = [
      modulo("g1", [peca(BRANCO, 18, 10)]),
      modulo("g2", [peca(AMADEIRADO, 18, 10)]),
    ];
    const eng = engine(mods, [
      grupoMdf(BRANCO, 18, 10, 2),
      grupoMdf(AMADEIRADO, 18, 10, 2),
    ]);
    const precos: PrecosReferencia = {
      ...PRECOS,
      chapaEspecifica: [
        { cor: BRANCO, espessura: 18, preco: 250 },
        { cor: AMADEIRADO, espessura: 18, preco: 500 },
      ],
    };
    // custoAlocado: g1=500, g2=1000 (ratio 1:2). chapasAlocadas: 2 e 2 (ratio 1:1).
    const snap = ratearPrecificacao(
      eng,
      gruposIndividuais(["g1", "g2"]),
      {
        precificacao: { modo: "fixo", valor: 0 }, // isola a montagem
        montagem: { modo: "por_chapa", valorChapa: 100 }, // total = 100×4 = 400
        freteTotal: 0,
      },
      precos
    );
    expect(snap.montagemTotal).toBe(400);
    // base chapas 1:1 → 200/200 (NÃO 133,33/266,67 que a base custo daria)
    expect(snap.grupos[0].valorMontagem).toBe(200);
    expect(snap.grupos[1].valorMontagem).toBe(200);
  });
});

// =====================================================================
// TESTE 6 — Congelamento / snapshot.
// =====================================================================
describe("congelamento (snapshot puro e determinístico)", () => {
  const mods = [
    modulo("a", [peca(BRANCO, 18, 5)]),
    modulo("b", [peca(BRANCO, 18, 5)]),
  ];
  const eng = engine(mods, [grupoMdf(BRANCO, 18, 10, 3)]);
  const config = {
    precificacao: { modo: "multiplicador" as const, fator: 2 },
    montagem: { modo: "percentual_material" as const, percentual: 0.1 },
    freteTotal: 150,
  };

  it("determinismo: mesmos inputs → mesmo resultado", () => {
    const s1 = ratearPrecificacao(eng, gruposIndividuais(["a", "b"]), config, PRECOS);
    const s2 = ratearPrecificacao(eng, gruposIndividuais(["a", "b"]), config, PRECOS);
    expect(s1).toEqual(s2);
  });

  it("invariante soma==total no snapshot", () => {
    const snap = ratearPrecificacao(eng, gruposIndividuais(["a", "b"]), config, PRECOS);
    const soma = round2(snap.grupos.reduce((s, g) => s + g.valorRateado, 0));
    expect(soma).toBe(snap.resumo.precoFinal);
  });

  it("adicionar um item muda os valores dos demais (por isso congela)", () => {
    const snap2 = ratearPrecificacao(eng, gruposIndividuais(["a", "b"]), config, PRECOS);
    // orçamento com um 3º item: consolidado muda (mais área/chapas)
    const mods3 = [...mods, modulo("c", [peca(BRANCO, 18, 5)])];
    const eng3 = engine(mods3, [grupoMdf(BRANCO, 18, 15, 4)]);
    const snap3 = ratearPrecificacao(
      eng3,
      gruposIndividuais(["a", "b", "c"]),
      config,
      PRECOS
    );
    const aAntes = snap2.grupos.find((g) => g.id === "a")!.valorRateado;
    const aDepois = snap3.grupos.find((g) => g.id === "a")!.valorRateado;
    expect(aDepois).not.toBe(aAntes);
  });
});

// =====================================================================
// TESTE 7 — Resumo financeiro de 6 campos.
// =====================================================================
describe("resumo financeiro — 6 campos", () => {
  it("lucroFinal e margemLucro corretos", () => {
    // precoFinal 1000, material 400, montagem 100, frete 50 → lucro 450, margem 0,45
    const r = calcularResumoFinanceiro(1000, 400, 100, 50);
    expect(r).toEqual({
      precoFinal: 1000,
      custoMaterial: 400,
      montagem: 100,
      frete: 50,
      lucroFinal: 450,
      margemLucro: 0.45,
    });
  });

  it("precoFinal = 0 não divide por zero", () => {
    const r = calcularResumoFinanceiro(0, 0, 0, 0);
    expect(r.margemLucro).toBe(0);
    expect(r.lucroFinal).toBe(0);
  });

  it("resumo dentro do snapshot: lucroFinal = precoMoveis − custoMaterial", () => {
    const mods = [modulo("a", [peca(BRANCO, 18, 5)])];
    const eng = engine(mods, [grupoMdf(BRANCO, 18, 5, 2)]); // custoMaterial = 2×250 = 500
    const snap = ratearPrecificacao(
      eng,
      gruposIndividuais(["a"]),
      {
        precificacao: { modo: "multiplicador", fator: 3 }, // precoMoveis = 1500
        montagem: { modo: "manual", valor: 200 },
        freteTotal: 100,
      },
      PRECOS
    );
    expect(snap.resumo.custoMaterial).toBe(500);
    expect(snap.resumo.precoFinal).toBe(1800); // 1500 + 200 + 100
    expect(snap.resumo.lucroFinal).toBe(1000); // precoMoveis − custoMaterial = 1500 − 500
  });
});

// =====================================================================
// Custo de material — decomposição (Seção 5.5).
// =====================================================================
describe("custo de material — decomposição", () => {
  it("chapas (N inteiro) + fita + ferragens", () => {
    const mods = [
      modulo("a", [peca(BRANCO, 18, 5)], {
        fitaM: 10,
        ferragens: [{ item: "dobradica_35", quantidade: 4 }],
      }),
    ];
    const eng = engine(mods, [grupoMdf(BRANCO, 18, 5, 2)], {
      fitaTotalM: 10,
      ferragens: [{ item: "dobradica_35", quantidade: 4 }],
    });
    const cm = calcularCustoMaterial(eng, PRECOS);
    expect(cm.custoChapas).toBe(500); // 2 × 250
    expect(cm.custoFita).toBe(25); // 10 × 2,5
    expect(cm.custoFerragens).toBe(32); // 4 × 8
    expect(cm.totalChapasInteiro).toBe(2);
    expect(cm.custoMaterial).toBe(557);
  });
});

// =====================================================================
// Grupos malformados — avisos.
// =====================================================================
describe("grupos malformados geram avisos", () => {
  it("item ausente do EngineOutput e item sem grupo", () => {
    const mods = [
      modulo("a", [peca(BRANCO, 18, 5)]),
      modulo("orfao", [peca(BRANCO, 18, 5)]),
    ];
    const eng = engine(mods, [grupoMdf(BRANCO, 18, 10, 3)]);
    const snap = ratearPrecificacao(
      eng,
      [{ id: "g", itemIds: ["a", "inexistente"] }],
      {
        precificacao: { modo: "fixo", valor: 1000 },
        montagem: { modo: "manual", valor: 0 },
        freteTotal: 0,
      },
      PRECOS
    );
    const codigos = snap.warnings.map((w) => w.codigo);
    expect(codigos).toContain("item_inexistente");
    expect(codigos).toContain("item_sem_grupo");
    // soma continua fechando no total
    const soma = round2(snap.grupos.reduce((s, g) => s + g.valorRateado, 0));
    expect(soma).toBe(snap.resumo.precoFinal);
  });
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
