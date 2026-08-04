// Task 0.7a (Modelo-de-Dominio.md 5.4.1) — mesmo padrão de mock local de
// `@/lib/supabase/server` já usado em `lib/ambiente/acoes.test.ts` (o
// projeto não tem infraestrutura de mock genérica do client Supabase ainda).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { congelarOrcamento } from "./congelar";
import { buscarOrcamentoPorId } from "./buscar";

const supabaseMock = vi.hoisted(() => {
  let usuarioAtual: { id: string } | null = { id: "user-1" };
  const respostas: Record<string, { data: unknown; error: unknown }> = {};
  const atualizacoes: { tabela: string; valores: Record<string, unknown>; eqs: [string, unknown][] }[] = [];

  function tabela(nome: string) {
    const eqsCapturados: [string, unknown][] = [];
    const builder = {
      select: () => builder,
      eq: (coluna: string, valor: unknown) => {
        eqsCapturados.push([coluna, valor]);
        return builder;
      },
      update: (valores: Record<string, unknown>) => {
        atualizacoes.push({ tabela: nome, valores, eqs: eqsCapturados });
        return builder;
      },
      maybeSingle: async () => respostas[nome] ?? { data: null, error: null },
      then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
        resolve({ data: null, error: null });
      },
    };
    return builder;
  }

  return {
    respostas,
    atualizacoes,
    definirUsuario: (usuario: { id: string } | null) => {
      usuarioAtual = usuario;
    },
    resetar: () => {
      usuarioAtual = { id: "user-1" };
      for (const chave of Object.keys(respostas)) delete respostas[chave];
      atualizacoes.length = 0;
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

beforeEach(() => {
  supabaseMock.resetar();
});

afterEach(() => {
  supabaseMock.resetar();
});

describe("buscarOrcamentoPorId — congeladoEm", () => {
  it("devolve congeladoEm: null para orçamento nunca congelado", async () => {
    supabaseMock.respostas.orcamento = {
      data: {
        id: "orc-1",
        status: "rascunho",
        prazo_entrega: null,
        frete: null,
        congelado_em: null,
        cliente: { nome: "Cliente A" },
      },
      error: null,
    };

    const resultado = await buscarOrcamentoPorId("orc-1");

    expect(resultado?.congeladoEm).toBeNull();
  });
});

describe("congelarOrcamento", () => {
  it("grava congelado_em = now() do servidor quando o orçamento pertence à organização do usuário", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    supabaseMock.respostas.orcamento = { data: { id: "orc-1" }, error: null };

    const antes = Date.now();
    const resultado = await congelarOrcamento("orc-1");
    const depois = Date.now();

    expect(resultado).toEqual({ ok: true });
    const update = supabaseMock.atualizacoes.find((u) => u.tabela === "orcamento" && "congelado_em" in u.valores);
    expect(update).toBeDefined();
    expect(update?.eqs).toEqual([
      ["id", "orc-1"],
      ["organizacao_id", "org-a"],
    ]);
    const gravado = new Date(update?.valores.congelado_em as string).getTime();
    expect(gravado).toBeGreaterThanOrEqual(antes);
    expect(gravado).toBeLessThanOrEqual(depois);
  });

  it("rejeita orçamento de outra organização sem gravar nada (defesa em profundidade, mesmo padrão IDOR de ambiente/acoes.ts)", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    // Posse falha: orçamento não encontrado para esta organização (é de outra).
    supabaseMock.respostas.orcamento = { data: null, error: null };

    const resultado = await congelarOrcamento("orcamento-de-outra-org");

    expect(resultado).toEqual({ ok: false, erro: "Este orçamento não existe mais." });
    expect(supabaseMock.atualizacoes).toEqual([]);
  });

  it("rejeita quando não há sessão autenticada", async () => {
    supabaseMock.definirUsuario(null);

    const resultado = await congelarOrcamento("orc-1");

    expect(resultado).toEqual({ ok: false, erro: "Sua sessão expirou. Faça login novamente." });
    expect(supabaseMock.atualizacoes).toEqual([]);
  });
});
