import { describe, it, expect } from "vitest";
import { calcularEngine } from "./engine";
import { calcularPreco } from "./pricing";
import { evalFormula } from "./evaluator";
import {
  COMERCIAL_PADRAO,
  MATERIAIS_PADRAO,
  PARAMETROS_FABRICA_PADRAO,
} from "./defaults";
import type { EngineInput } from "./types";

// Testes golden de engenharia (doc 09). Valores conferidos à mão para o
// módulo BASE_PORTAS 600×720×550, 2 portas, 1 prateleira, com os parâmetros
// de fábrica padrão. Alterar uma fórmula deve quebrar este teste.
function inputBasePortas600(): EngineInput {
  return {
    ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
    parametros: PARAMETROS_FABRICA_PADRAO,
    modulos: [
      {
        id: "m1",
        templateCodigo: "BASE_PORTAS",
        largura_mm: 600,
        altura_mm: 720,
        profundidade_mm: 550,
        config: { CONFIG_QTD_PORTAS: 2, CONFIG_QTD_PRATELEIRAS: 1 },
      },
    ],
  };
}

describe("motor — BASE_PORTAS 600×720×550 (golden)", () => {
  const out = calcularEngine(inputBasePortas600());
  const mod = out.porModulo[0];

  it("explode em 9 peças", () => {
    const total = mod.pecas.reduce((s, p) => s + p.quantidade, 0);
    expect(total).toBe(9);
  });

  it("gera 4 dobradiças, 2 puxadores, 4 pés e 1 kit de parafuso", () => {
    const f = Object.fromEntries(mod.ferragens.map((x) => [x.item, x.quantidade]));
    expect(f.dobradica_35).toBe(4);
    expect(f.puxador).toBe(2);
    expect(f.pe_nivelador).toBe(4);
    expect(f.parafuso_kit_modulo).toBe(1);
  });

  it("agrupa as peças do módulo por espessura com áreas conferidas", () => {
    const porEsp = new Map<number, number>();
    for (const p of mod.pecas) {
      porEsp.set(p.espessura_mm, (porEsp.get(p.espessura_mm) ?? 0) + p.area_m2);
    }
    expect(porEsp.get(15)).toBeCloseTo(1.5216, 3); // caixaria + prateleira
    expect(porEsp.get(18)).toBeCloseTo(0.4241, 3); // portas
    expect(porEsp.get(6)).toBeCloseTo(0.432, 3); // fundo
  });

  it("converte cada grupo consolidado em 1 chapa comercial", () => {
    for (const g of out.consolidado.mdf) expect(g.chapas).toBe(1);
  });

  it("não emite erros de validação física", () => {
    expect(out.warnings.filter((w) => w.severidade === "erro")).toHaveLength(0);
  });
});

describe("motor — elementos contínuos (etapa global)", () => {
  // Dois módulos base na mesma parede formam UM tampo e UM rodapé contínuos.
  const input: EngineInput = {
    ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
    parametros: PARAMETROS_FABRICA_PADRAO,
    modulos: [
      { id: "a", templateCodigo: "BASE_PORTAS", parede: "A", largura_mm: 600, altura_mm: 720, profundidade_mm: 550, config: { CONFIG_QTD_PORTAS: 2 } },
      { id: "b", templateCodigo: "BASE_PORTAS", parede: "A", largura_mm: 600, altura_mm: 720, profundidade_mm: 550, config: { CONFIG_QTD_PORTAS: 2 } },
    ],
  };
  const out = calcularEngine(input);

  it("gera 1 tampo e 1 rodapé para a parede", () => {
    const tampos = out.globais.filter((g) => g.tipo === "tampo");
    const rodapes = out.globais.filter((g) => g.tipo === "rodape");
    expect(tampos).toHaveLength(1);
    expect(rodapes).toHaveLength(1);
    expect(tampos[0].modulos).toBe(2);
  });

  it("tampo cobre a largura somada (1200mm) na profundidade (550mm)", () => {
    const tampo = out.globais.find((g) => g.tipo === "tampo")!;
    expect(tampo.comprimento_mm).toBe(1200);
    expect(tampo.largura_mm).toBe(550);
    expect(tampo.area_m2).toBeCloseTo(0.66, 3);
  });

  it("rodapé desconta o recuo das duas pontas (1200 − 2×50 = 1100mm)", () => {
    const rodape = out.globais.find((g) => g.tipo === "rodape")!;
    expect(rodape.comprimento_mm).toBe(1100);
    expect(rodape.area_m2).toBeCloseTo(0.11, 3);
  });
});

describe("motor — configuração de material por módulo (V2-1)", () => {
  const base: EngineInput = {
    ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
    parametros: PARAMETROS_FABRICA_PADRAO,
    modulos: [
      {
        id: "m1",
        templateCodigo: "BASE_PORTAS",
        largura_mm: 600,
        altura_mm: 720,
        profundidade_mm: 550,
        config: { CONFIG_QTD_PORTAS: 2, CONFIG_QTD_PRATELEIRAS: 1 },
        configMaterial: {
          interno: { espessura: 15, acabamento: "Branco TX" },
          externo: { espessura: 18, acabamento: "Madeirado" },
          portas: { espessura: 18, acabamento: "Madeirado" },
          temFundo: true,
        },
      },
    ],
  };

  it("aplica cor/espessura por slot (externo, interno, portas)", () => {
    const mod = calcularEngine(base).porModulo[0];
    const lateral = mod.pecas.find((p) => p.nome === "Lateral")!; // caixa → externo
    const prateleira = mod.pecas.find((p) => p.nome === "Prateleira")!; // interno
    const porta = mod.pecas.find((p) => p.nome === "Porta")!; // portas
    expect(lateral.cor).toBe("Madeirado");
    expect(lateral.espessura_mm).toBe(18);
    expect(prateleira.cor).toBe("Branco TX");
    expect(prateleira.espessura_mm).toBe(15);
    expect(porta.cor).toBe("Madeirado");
  });

  it("toggle 'tem fundo = false' remove as peças de fundo", () => {
    const semFundo = JSON.parse(JSON.stringify(base)) as EngineInput;
    semFundo.modulos[0].configMaterial!.temFundo = false;
    const mod = calcularEngine(semFundo).porModulo[0];
    expect(mod.pecas.some((p) => p.material_tipo === "fundo")).toBe(false);
  });
});

describe("motor — template override por requisição (V2-4)", () => {
  it("usa o template customizado passado na entrada", () => {
    const input: EngineInput = {
      ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      modulos: [
        { id: "m1", templateCodigo: "CUSTOM", largura_mm: 600, altura_mm: 700, profundidade_mm: 300 },
      ],
      templates: {
        CUSTOM: {
          codigo: "CUSTOM",
          versao: 1,
          nome: "Nicho custom",
          categoria: "complemento",
          limites: {
            largura: { min: 100, max: 2000 },
            altura: { min: 100, max: 2000 },
            profundidade: { min: 100, max: 600 },
          },
          config_padrao: {},
          componentes: [
            {
              nome: "Painel único",
              quantidade: "1",
              material_tipo: "caixa",
              dimensoes: { altura: "MEDIDA_ALTURA", largura: "MEDIDA_LARGURA" },
              fita_borda: { lados_altura: 2, lados_largura: 2 },
            },
          ],
          ferragens: [],
          participa_elementos_continuos: { tampo: false, rodape: false },
        },
      },
    };
    const mod = calcularEngine(input).porModulo[0];
    expect(mod.nome).toBe("Nicho custom");
    expect(mod.pecas).toHaveLength(1);
    expect(mod.pecas[0].area_m2).toBeCloseTo((600 * 700) / 1e6, 3);
  });
});

describe("motor — validação e determinismo", () => {
  it("acusa medida fora dos limites do template", () => {
    const input = inputBasePortas600();
    input.modulos[0].altura_mm = 3000; // acima do máx (900)
    const out = calcularEngine(input);
    expect(out.warnings.some((w) => w.codigo === "LIMITE_ALTURA")).toBe(true);
  });

  it("é determinístico (mesma entrada → mesma saída)", () => {
    const a = JSON.stringify(calcularEngine(inputBasePortas600()));
    const b = JSON.stringify(calcularEngine(inputBasePortas600()));
    expect(a).toBe(b);
  });
});

describe("avaliador de fórmulas", () => {
  it("resolve funções e aritmética", () => {
    expect(evalFormula("max(2, ceil(714 / 450))", {})).toBe(2);
    expect(evalFormula("MEDIDA_LARGURA / 2 - 3", { MEDIDA_LARGURA: 600 })).toBe(297);
  });

  it("rejeita variável não declarada", () => {
    expect(() => evalFormula("PARAM_INEXISTENTE + 1", {})).toThrow();
  });
});

describe("pipeline financeiro — markup divisor", () => {
  it("preço final > custo direto e margem coerente", () => {
    const engine = calcularEngine(inputBasePortas600());
    const fin = calcularPreco(engine, COMERCIAL_PADRAO);
    expect(fin.custoDireto).toBeGreaterThan(0);
    expect(fin.precoFinal).toBeGreaterThan(fin.custoDireto);
    // sem desconto, margem efetiva ≈ margem configurada
    expect(fin.margemEfetiva).toBeCloseTo(COMERCIAL_PADRAO.margem, 2);
  });

  it("bloqueia quando o desconto derruba a margem abaixo da mínima", () => {
    const engine = calcularEngine(inputBasePortas600());
    const fin = calcularPreco(engine, { ...COMERCIAL_PADRAO, desconto: 0.25 });
    expect(fin.abaixoDaMargemMinima).toBe(true);
  });
});
