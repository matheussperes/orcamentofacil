// Task 13.3d — testes puros do mapeamento domínio↔linhas/jsonb do Supabase.
// Deliberadamente SEM mockar `lib/supabase/server` (não há infraestrutura de
// mock do client Supabase no projeto ainda) — por isso a lógica de I/O
// (`carregar.ts`/`salvar.ts`) fica só validada por leitura de código +
// lint/tsc; o que é determinístico e testável sem rede (o mapeamento em si)
// está aqui.
import { describe, expect, it } from "vitest";
import {
  alturasDeJson,
  COR_FALLBACK,
  elementoContinuoDeLinha,
  linhaDeElementoContinuo,
  linhaDeParede,
  modulosDeJson,
  paredeDeLinha,
  type ElementoContinuoRow,
  type ParedeRow,
} from "./mapear";
import { alturasIniciais, paredeInicial } from "./estado";
import type { ElementoContinuo } from "@/lib/engine/elemento-continuo/types";
import type { ModuloOrcamento } from "@/lib/orcamento";

describe("alturasDeJson", () => {
  it("devolve o default quando o jsonb está vazio (organizacao.alturas_padrao nasce '{}')", () => {
    expect(alturasDeJson({})).toEqual(alturasIniciais());
  });

  it("devolve o default quando o valor não é um objeto (null/undefined/array)", () => {
    expect(alturasDeJson(null)).toEqual(alturasIniciais());
    expect(alturasDeJson(undefined)).toEqual(alturasIniciais());
    expect(alturasDeJson([1, 2, 3])).toEqual(alturasIniciais());
  });

  it("devolve o default quando falta alguma das 4 chaves (jsonb parcial)", () => {
    expect(alturasDeJson({ alturaRodape: 100, alturaBancada: 900 })).toEqual(alturasIniciais());
  });

  it("devolve as alturas salvas quando as 4 chaves estão presentes e são números", () => {
    const salvas = { alturaRodape: 120, alturaBancada: 950, alturaInstalacaoAereo: 1450, peDireito: 2800 };
    expect(alturasDeJson(salvas)).toEqual(salvas);
  });
});

describe("modulosDeJson", () => {
  it("devolve [] quando o valor não é array (orçamento novo, sem itens salvos)", () => {
    expect(modulosDeJson(null)).toEqual([]);
    expect(modulosDeJson(undefined)).toEqual([]);
    expect(modulosDeJson({})).toEqual([]);
  });

  it("devolve o array como veio quando já é um array", () => {
    const modulos: ModuloOrcamento[] = [
      { origem: "custom_box", box: { id: "a", nome: "X", tipo: "inferior", largura: 1, altura: 1, profundidade: 1, caixa: { cor: "c", espessura: 1 }, raiz: { id: "r", split: "none", qtdDivisorias: 0 }, portas: [], temFundo: false, puxador: "sem_puxador" } },
    ];
    expect(modulosDeJson(modulos)).toEqual(modulos);
  });
});

describe("paredeDeLinha", () => {
  it("devolve a parede/overrides padrão quando não existe linha (orçamento novo)", () => {
    const resultado = paredeDeLinha(null);
    expect(resultado.parede).toEqual(paredeInicial());
    expect(resultado.overrides).toEqual([]);
  });

  it("mapeia uma linha completa 1:1 pro shape de domínio (elemento já no formato novo)", () => {
    const row: ParedeRow = {
      id: "parede-uuid-1",
      altura: 2700,
      largura: 3200,
      elementos: [
        { id: "elemento-1", tipo: "janela", x: 100, y: 900, largura: 600, altura: 500, refX: "esquerda", refY: "chao" },
      ],
      itens: [{ itemId: "instancia-1", x: 0, faixa: "inferior" }],
      overrides_juncao: [{ itemIdA: "instancia-1", itemIdB: "instancia-2", forcar: "unido" }],
    };

    const resultado = paredeDeLinha(row);

    expect(resultado.parede).toEqual({
      id: "parede-uuid-1",
      altura: 2700,
      largura: 3200,
      elementos: row.elementos,
      itens: row.itens,
    });
    expect(resultado.overrides).toEqual(row.overrides_juncao);
  });

  it("migra elemento legado (sem id/refX/refY) na leitura, sem alterar x/y/largura/altura/tipo", () => {
    const row: ParedeRow = {
      id: "parede-uuid-legado",
      altura: 2700,
      largura: 3200,
      elementos: [{ tipo: "janela", x: 100, y: 900, largura: 600, altura: 500 }],
      itens: [],
      overrides_juncao: [],
    };

    const resultado = paredeDeLinha(row);

    expect(resultado.parede.elementos).toHaveLength(1);
    const [elemento] = resultado.parede.elementos;
    expect(elemento.tipo).toBe("janela");
    expect(elemento.x).toBe(100);
    expect(elemento.y).toBe(900);
    expect(elemento.largura).toBe(600);
    expect(elemento.altura).toBe(500);
    expect(elemento.refX).toBe("esquerda");
    expect(elemento.refY).toBe("chao");
    expect(typeof elemento.id).toBe("string");
    expect(elemento.id.length).toBeGreaterThan(0);
  });

  it("usa [] quando elementos/itens/overrides_juncao vêm null (default da tabela)", () => {
    const row: ParedeRow = {
      id: "parede-uuid-2",
      altura: 2700,
      largura: 3000,
      elementos: null,
      itens: null,
      overrides_juncao: null,
    };
    const resultado = paredeDeLinha(row);
    expect(resultado.parede.elementos).toEqual([]);
    expect(resultado.parede.itens).toEqual([]);
    expect(resultado.overrides).toEqual([]);
  });
});

describe("linhaDeParede", () => {
  it("monta a linha de insert/update com organizacao_id/ambiente_id + parede/overrides", () => {
    const parede = { id: "parede-1", altura: 2700, largura: 3000, elementos: [], itens: [] };
    const overrides = [{ itemIdA: "a", itemIdB: "b", forcar: "quebrado" as const }];

    const linha = linhaDeParede({
      organizacaoId: "org-1",
      ambienteId: "ambiente-1",
      parede,
      overrides,
    });

    expect(linha).toEqual({
      organizacao_id: "org-1",
      ambiente_id: "ambiente-1",
      altura: 2700,
      largura: 3000,
      elementos: [],
      itens: [],
      overrides_juncao: overrides,
    });
  });
});

describe("linhaDeElementoContinuo / elementoContinuoDeLinha", () => {
  const elemento: ElementoContinuo = {
    id: "elemento-continuo-1",
    tipo: "tampo",
    alvo: { conjuntoId: "conjunto-parede-1-inferior-0" },
    posicao: "superior",
    material: { cor: "Branco TX", espessura: 18 },
    override: { largura: 1200 },
  };

  it("linhaDeElementoContinuo mapeia tipo/alvo/posicao/espessura/override/engrossamento", () => {
    const linha = linhaDeElementoContinuo({
      organizacaoId: "org-1",
      orcamentoId: "orcamento-1",
      elemento,
    });

    expect(linha).toEqual({
      organizacao_id: "org-1",
      orcamento_id: "orcamento-1",
      tipo: "tampo",
      alvo: { conjuntoId: "conjunto-parede-1-inferior-0" },
      posicao: "superior",
      espessura: 18,
      override: { largura: 1200 },
      engrossamento: null,
    });
  });

  it("elementoContinuoDeLinha reconstrói o ElementoContinuo, com cor no fallback documentado (GAP DE SCHEMA)", () => {
    const row: ElementoContinuoRow = {
      id: "uuid-real-1",
      tipo: "tampo",
      alvo: { conjuntoId: "conjunto-parede-1-inferior-0" },
      posicao: "superior",
      espessura: 18,
      override: { largura: 1200 },
      engrossamento: null,
    };

    const reconstruido = elementoContinuoDeLinha(row);

    expect(reconstruido).toEqual({
      id: "uuid-real-1",
      tipo: "tampo",
      alvo: { conjuntoId: "conjunto-parede-1-inferior-0" },
      posicao: "superior",
      material: { cor: COR_FALLBACK, espessura: 18 },
      override: { largura: 1200 },
      engrossamento: undefined,
    });
  });

  it("elementoContinuoDeLinha usa espessura 18 quando a coluna vem null", () => {
    const row: ElementoContinuoRow = {
      id: "uuid-real-2",
      tipo: "rodape",
      alvo: { moduloId: "instancia-1" },
      posicao: "base",
      espessura: null,
      override: null,
      engrossamento: null,
    };
    const reconstruido = elementoContinuoDeLinha(row);
    expect(reconstruido.material.espessura).toBe(18);
    expect(reconstruido.override).toBeUndefined();
  });
});
