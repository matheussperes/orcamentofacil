// Task 5.10-back (Modelo-de-Dominio.md 7.2) — mesmo padrão de mock local de
// `@/lib/supabase/server` já usado em `lib/orcamento/congelar.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atualizarEtapaEsteira, deveAvancarParaAguardandoAprovacao } from "./etapa-esteira";

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
  supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
});

afterEach(() => {
  supabaseMock.resetar();
});

describe("deveAvancarParaAguardandoAprovacao", () => {
  it("é true para as etapas anteriores a aguardando_aprovacao", () => {
    expect(deveAvancarParaAguardandoAprovacao("novo")).toBe(true);
    expect(deveAvancarParaAguardandoAprovacao("visita_agendada")).toBe(true);
    expect(deveAvancarParaAguardandoAprovacao("projeto_3d")).toBe(true);
  });

  it("é false para aguardando_aprovacao e fechado", () => {
    expect(deveAvancarParaAguardandoAprovacao("aguardando_aprovacao")).toBe(false);
    expect(deveAvancarParaAguardandoAprovacao("fechado")).toBe(false);
  });
});

describe("atualizarEtapaEsteira", () => {
  it("T1: move livremente entre não-terminais, nos dois sentidos", async () => {
    supabaseMock.respostas.orcamento = { data: { id: "orc-1", etapa_esteira: "novo" }, error: null };
    const resultadoIda = await atualizarEtapaEsteira("orc-1", "aguardando_aprovacao");
    expect(resultadoIda).toEqual({ ok: true });

    supabaseMock.atualizacoes.length = 0;
    supabaseMock.respostas.orcamento = { data: { id: "orc-1", etapa_esteira: "aguardando_aprovacao" }, error: null };
    const resultadoVolta = await atualizarEtapaEsteira("orc-1", "visita_agendada");
    expect(resultadoVolta).toEqual({ ok: true });
    const update = supabaseMock.atualizacoes.find((u) => u.tabela === "orcamento");
    expect(update?.valores.etapa_esteira).toBe("visita_agendada");
  });

  it("E-E1: rejeita mover PARA fechado", async () => {
    supabaseMock.respostas.orcamento = { data: { id: "orc-1", etapa_esteira: "aguardando_aprovacao" }, error: null };

    const resultado = await atualizarEtapaEsteira("orc-1", "fechado");

    expect(resultado).toEqual({
      ok: false,
      erro: "Este orçamento está fechado. Para voltar a editá-lo, use Reabrir.",
    });
    expect(supabaseMock.atualizacoes).toEqual([]);
  });

  it("E-E1: rejeita mover A PARTIR DE fechado", async () => {
    supabaseMock.respostas.orcamento = { data: { id: "orc-1", etapa_esteira: "fechado" }, error: null };

    const resultado = await atualizarEtapaEsteira("orc-1", "novo");

    expect(resultado).toEqual({
      ok: false,
      erro: "Este orçamento está fechado. Para voltar a editá-lo, use Reabrir.",
    });
    expect(supabaseMock.atualizacoes).toEqual([]);
  });

  it("E-E2: rejeita etapa fora do enum, sem consultar o banco", async () => {
    const resultado = await atualizarEtapaEsteira("orc-1", "producao");

    expect(resultado).toEqual({ ok: false, erro: "Etapa de esteira inválida." });
    expect(supabaseMock.atualizacoes).toEqual([]);
  });

  it("rejeita orçamento de outra organização sem gravar nada", async () => {
    supabaseMock.respostas.orcamento = { data: null, error: null };

    const resultado = await atualizarEtapaEsteira("orc-de-outra-org", "projeto_3d");

    expect(resultado).toEqual({ ok: false, erro: "Este orçamento não existe mais." });
    expect(supabaseMock.atualizacoes).toEqual([]);
  });

  it("rejeita quando não há sessão autenticada", async () => {
    supabaseMock.definirUsuario(null);

    const resultado = await atualizarEtapaEsteira("orc-1", "projeto_3d");

    expect(resultado).toEqual({ ok: false, erro: "Sua sessão expirou. Faça login novamente." });
    expect(supabaseMock.atualizacoes).toEqual([]);
  });
});
