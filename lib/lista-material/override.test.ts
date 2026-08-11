// Task 3.8 (back) — mock local de `@/lib/supabase/server`, mesmo padrão de
// `lib/orcamento/reabrir.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { definirOverrideQuantidade, listarOverridesQuantidade, removerOverrideQuantidade } from "./override";

const supabaseMock = vi.hoisted(() => {
  let usuarioAtual: { id: string } | null = { id: "user-1" };
  const respostas: Record<string, { data: unknown; error: unknown }> = {};
  const upserts: { tabela: string; valores: unknown; onConflict?: string }[] = [];
  const deletes: { tabela: string; eqs: [string, unknown][] }[] = [];
  const tabelasConsultadas: string[] = [];

  function tabela(nome: string) {
    tabelasConsultadas.push(nome);
    const eqsCapturados: [string, unknown][] = [];
    const builder = {
      select: () => builder,
      eq: (coluna: string, valor: unknown) => {
        eqsCapturados.push([coluna, valor]);
        return builder;
      },
      maybeSingle: async () => respostas[nome] ?? { data: null, error: null },
      upsert: (valores: unknown, opcoes?: { onConflict?: string }) => {
        upserts.push({ tabela: nome, valores, onConflict: opcoes?.onConflict });
        return Promise.resolve(respostas[`${nome}:upsert`] ?? { data: null, error: null });
      },
      delete: () => {
        const deleteBuilder = {
          eq: (coluna: string, valor: unknown) => {
            eqsCapturados.push([coluna, valor]);
            return deleteBuilder;
          },
          then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
            deletes.push({ tabela: nome, eqs: eqsCapturados });
            resolve(respostas[`${nome}:delete`] ?? { data: null, error: null });
          },
        };
        return deleteBuilder;
      },
      then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
        resolve(respostas[`${nome}:select`] ?? { data: null, error: null });
      },
    };
    return builder;
  }

  return {
    respostas,
    upserts,
    deletes,
    tabelasConsultadas,
    definirUsuario: (usuario: { id: string } | null) => {
      usuarioAtual = usuario;
    },
    resetar: () => {
      usuarioAtual = { id: "user-1" };
      for (const chave of Object.keys(respostas)) delete respostas[chave];
      upserts.length = 0;
      deletes.length = 0;
      tabelasConsultadas.length = 0;
    },
    cliente: {
      auth: { getUser: async () => ({ data: { user: usuarioAtual } }) },
      from: (nome: string) => tabela(nome),
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabaseMock.cliente,
}));

function armarPerfilEOrcamento(organizacaoId: string, congeladoEm: string | null) {
  supabaseMock.respostas.perfil = { data: { organizacao_id: organizacaoId }, error: null };
  supabaseMock.respostas.orcamento = { data: { id: "orc-1", congelado_em: congeladoEm }, error: null };
}

beforeEach(() => {
  supabaseMock.resetar();
});

afterEach(() => {
  supabaseMock.resetar();
});

describe("definirOverrideQuantidade", () => {
  it("orçamento aberto, quantidade válida: faz upsert escopado por org e por chave de conflito", async () => {
    armarPerfilEOrcamento("org-a", null);

    const resultado = await definirOverrideQuantidade("orc-1", "MDF Branco TX 15mm", 4);

    expect(resultado).toEqual({ ok: true });
    expect(supabaseMock.upserts).toEqual([
      {
        tabela: "lista_material_override",
        valores: expect.objectContaining({
          organizacao_id: "org-a",
          orcamento_id: "orc-1",
          item_chave: "MDF Branco TX 15mm",
          quantidade: 4,
        }),
        onConflict: "orcamento_id,item_chave",
      },
    ]);
  });

  it("rejeita quando o orçamento já está congelado, sem gravar nada", async () => {
    armarPerfilEOrcamento("org-a", "2026-08-02T14:10:00Z");

    const resultado = await definirOverrideQuantidade("orc-1", "Fita de borda", 10);

    expect(resultado).toEqual({
      ok: false,
      erro: "Este orçamento está congelado — reabra-o para editar a lista de material.",
      codigo: "ORCAMENTO_CONGELADO",
    });
    expect(supabaseMock.upserts).toEqual([]);
  });

  it("rejeita quantidade negativa sem consultar nada", async () => {
    const resultado = await definirOverrideQuantidade("orc-1", "Fita de borda", -1);

    expect(resultado).toEqual({
      ok: false,
      erro: "A quantidade precisa ser um número válido e não negativo.",
      codigo: "QUANTIDADE_INVALIDA",
    });
    expect(supabaseMock.tabelasConsultadas).toEqual([]);
    expect(supabaseMock.upserts).toEqual([]);
  });

  it("rejeita quantidade não finita (NaN/Infinity) sem consultar nada", async () => {
    const resultado = await definirOverrideQuantidade("orc-1", "Fita de borda", Infinity);

    expect(resultado.ok).toBe(false);
    expect(resultado.codigo).toBe("QUANTIDADE_INVALIDA");
    expect(supabaseMock.upserts).toEqual([]);
  });

  it("rejeita posse cruzada: orçamento não encontrado na organização do usuário, sem gravar nada", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    supabaseMock.respostas.orcamento = { data: null, error: null };

    const resultado = await definirOverrideQuantidade("orcamento-de-outra-org", "Fita de borda", 5);

    expect(resultado).toEqual({ ok: false, erro: "Este orçamento não existe mais." });
    expect(supabaseMock.upserts).toEqual([]);
  });
});

describe("removerOverrideQuantidade", () => {
  it("orçamento aberto: remove escopado por orçamento, item e organização", async () => {
    armarPerfilEOrcamento("org-a", null);

    const resultado = await removerOverrideQuantidade("orc-1", "MDF Branco TX 15mm");

    expect(resultado).toEqual({ ok: true });
    expect(supabaseMock.deletes).toEqual([
      {
        tabela: "lista_material_override",
        eqs: [
          ["orcamento_id", "orc-1"],
          ["item_chave", "MDF Branco TX 15mm"],
          ["organizacao_id", "org-a"],
        ],
      },
    ]);
  });

  it("rejeita quando o orçamento já está congelado, sem remover nada", async () => {
    armarPerfilEOrcamento("org-a", "2026-08-02T14:10:00Z");

    const resultado = await removerOverrideQuantidade("orc-1", "Fita de borda");

    expect(resultado).toEqual({
      ok: false,
      erro: "Este orçamento está congelado — reabra-o para editar a lista de material.",
      codigo: "ORCAMENTO_CONGELADO",
    });
    expect(supabaseMock.deletes).toEqual([]);
  });

  it("rejeita posse cruzada sem remover nada", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    supabaseMock.respostas.orcamento = { data: null, error: null };

    const resultado = await removerOverrideQuantidade("orcamento-de-outra-org", "Fita de borda");

    expect(resultado).toEqual({ ok: false, erro: "Este orçamento não existe mais." });
    expect(supabaseMock.deletes).toEqual([]);
  });
});

describe("listarOverridesQuantidade", () => {
  it("devolve os overrides ativos do orçamento", async () => {
    supabaseMock.respostas["lista_material_override:select"] = {
      data: [
        { item_chave: "MDF Branco TX 15mm", quantidade: 4 },
        { item_chave: "Fita de borda", quantidade: 12 },
      ],
      error: null,
    };

    const resultado = await listarOverridesQuantidade("orc-1");

    expect(resultado).toEqual([
      { itemChave: "MDF Branco TX 15mm", quantidade: 4 },
      { itemChave: "Fita de borda", quantidade: 12 },
    ]);
  });

  it("erro de leitura: devolve lista vazia em vez de propagar exceção", async () => {
    supabaseMock.respostas["lista_material_override:select"] = { data: null, error: { message: "falhou" } };

    const resultado = await listarOverridesQuantidade("orc-1");

    expect(resultado).toEqual([]);
  });
});
