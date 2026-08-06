// Task 1.9-back (Modelo-de-Dominio.md 5.4.1, invariantes I6/I6a) — mesmo
// padrão de mock local de `@/lib/supabase/server` já usado em
// `lib/orcamento/congelar.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reabrirOrcamento } from "./reabrir";

const supabaseMock = vi.hoisted(() => {
  let usuarioAtual: { id: string } | null = { id: "user-1" };
  const respostas: Record<string, { data: unknown; error: unknown }> = {};
  const atualizacoes: { tabela: string; valores: Record<string, unknown>; eqs: [string, unknown][] }[] = [];
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
    tabelasConsultadas,
    definirUsuario: (usuario: { id: string } | null) => {
      usuarioAtual = usuario;
    },
    resetar: () => {
      usuarioAtual = { id: "user-1" };
      for (const chave of Object.keys(respostas)) delete respostas[chave];
      atualizacoes.length = 0;
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

beforeEach(() => {
  supabaseMock.resetar();
});

afterEach(() => {
  supabaseMock.resetar();
});

describe("reabrirOrcamento — I6a, checagem de papel primeiro", () => {
  it("não-admin recebe E-C3 e a tabela orcamento nunca é consultada (nada é lido nem escrito)", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a", papel: "vendedor" }, error: null };

    const resultado = await reabrirOrcamento("orc-1");

    expect(resultado).toEqual({
      ok: false,
      erro: "Só o administrador da organização pode reabrir um orçamento congelado.",
      codigo: "NAO_AUTORIZADO_REABRIR",
    });
    expect(supabaseMock.tabelasConsultadas).not.toContain("orcamento");
    expect(supabaseMock.atualizacoes).toEqual([]);
  });

  it("sem sessão autenticada: rejeitado antes de qualquer consulta a perfil ou orcamento", async () => {
    supabaseMock.definirUsuario(null);

    const resultado = await reabrirOrcamento("orc-1");

    expect(resultado).toEqual({ ok: false, erro: "Sua sessão expirou. Faça login novamente." });
    expect(supabaseMock.tabelasConsultadas).toEqual([]);
    expect(supabaseMock.atualizacoes).toEqual([]);
  });
});

describe("reabrirOrcamento — I6, admin reabrindo orçamento fechado", () => {
  it("congeladoEm ← null, etapa fechado → aguardando_aprovacao, valorRateado das linhas inalterado (exemplo 5.4.1: 2.292,00/1.528,00/764,00 não são tocadas)", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a", papel: "admin" }, error: null };
    supabaseMock.respostas.orcamento = {
      data: { id: "orc-1", congelado_em: "2026-08-02T14:10:00Z", etapa_esteira: "fechado" },
      error: null,
    };

    const resultado = await reabrirOrcamento("orc-1");

    expect(resultado).toEqual({ ok: true });
    const update = supabaseMock.atualizacoes.find((u) => u.tabela === "orcamento");
    expect(update?.valores).toEqual({ congelado_em: null, etapa_esteira: "aguardando_aprovacao" });
    expect(update?.eqs).toEqual([
      ["id", "orc-1"],
      ["organizacao_id", "org-a"],
    ]);
    // Esta função nunca toca em linha_proposta — valorRateado fica dormente
    // até um novo congelamento (I3).
    expect(supabaseMock.tabelasConsultadas).not.toContain("linha_proposta");
  });
});

describe("reabrirOrcamento — I6, admin reabrindo orçamento em etapa não-fechado", () => {
  it("congeladoEm ← null, etapa não muda", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a", papel: "admin" }, error: null };
    supabaseMock.respostas.orcamento = {
      data: { id: "orc-1", congelado_em: "2026-08-02T14:10:00Z", etapa_esteira: "aguardando_aprovacao" },
      error: null,
    };

    const resultado = await reabrirOrcamento("orc-1");

    expect(resultado).toEqual({ ok: true });
    const update = supabaseMock.atualizacoes.find((u) => u.tabela === "orcamento");
    expect(update?.valores).toEqual({ congelado_em: null });
    expect(update?.valores.etapa_esteira).toBeUndefined();
  });
});

describe("reabrirOrcamento — no-op idempotente", () => {
  it("admin chamando em orçamento já não-congelado: ok true, nada é escrito", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a", papel: "admin" }, error: null };
    supabaseMock.respostas.orcamento = {
      data: { id: "orc-1", congelado_em: null, etapa_esteira: "novo" },
      error: null,
    };

    const resultado = await reabrirOrcamento("orc-1");

    expect(resultado).toEqual({ ok: true });
    expect(supabaseMock.atualizacoes).toEqual([]);
  });
});

describe("reabrirOrcamento — posse", () => {
  it("rejeita orçamento de outra organização sem gravar nada", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a", papel: "admin" }, error: null };
    supabaseMock.respostas.orcamento = { data: null, error: null };

    const resultado = await reabrirOrcamento("orcamento-de-outra-org");

    expect(resultado).toEqual({ ok: false, erro: "Este orçamento não existe mais." });
    expect(supabaseMock.atualizacoes).toEqual([]);
  });
});
