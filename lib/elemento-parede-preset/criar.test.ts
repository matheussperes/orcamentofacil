// Task 2.12 (back) — testes de `criarElementoParedePreset`. Mesmo estilo de
// mock local de `@/lib/supabase/server` de `lib/cliente/acoes.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarElementoParedePreset } from "./criar";

const supabaseMock = vi.hoisted(() => {
  let usuarioAtual: { id: string } | null = { id: "user-1" };
  const respostas: Record<string, { data: unknown; error: unknown }> = {};
  const insercoes: { tabela: string; valores: Record<string, unknown> }[] = [];

  function tabela(nome: string) {
    const builder = {
      select: () => builder,
      eq: () => builder,
      insert: (valores: Record<string, unknown>) => {
        insercoes.push({ tabela: nome, valores });
        return builder;
      },
      maybeSingle: async () => respostas[nome] ?? { data: null, error: null },
      single: async () => respostas[nome] ?? { data: null, error: null },
    };
    return builder;
  }

  return {
    respostas,
    insercoes,
    definirUsuario: (usuario: { id: string } | null) => {
      usuarioAtual = usuario;
    },
    resetar: () => {
      usuarioAtual = { id: "user-1" };
      for (const chave of Object.keys(respostas)) delete respostas[chave];
      insercoes.length = 0;
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

describe("criarElementoParedePreset", () => {
  it("caminho feliz: cria preset com organizacao_id resolvido do perfil", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    supabaseMock.respostas.elemento_parede_preset = {
      data: { id: "p1", organizacao_id: "org-a", nome: "Janela", largura_padrao: 800, altura_padrao: 1000, criado_em: "2026-08-06T00:00:00Z" },
      error: null,
    };

    const resultado = await criarElementoParedePreset({
      nome: "  Janela  ",
      larguraPadrao: 800,
      alturaPadrao: 1000,
    });

    expect(resultado.ok).toBe(true);
    expect(resultado.preset?.nome).toBe("Janela");
    expect(supabaseMock.insercoes).toEqual([
      {
        tabela: "elemento_parede_preset",
        valores: {
          organizacao_id: "org-a",
          nome: "Janela",
          largura_padrao: 800,
          altura_padrao: 1000,
        },
      },
    ]);
  });

  it("rejeita nome vazio (ou só espaços) sem chamar o banco", async () => {
    const resultado = await criarElementoParedePreset({ nome: "   " });

    expect(resultado).toEqual({ ok: false, erro: "Informe o nome do preset." });
    expect(supabaseMock.insercoes).toEqual([]);
  });

  it("rejeita nome acima de 120 caracteres, sem tocar em nenhuma tabela", async () => {
    const resultado = await criarElementoParedePreset({ nome: "a".repeat(121) });

    expect(resultado).toEqual({ ok: false, erro: "O nome não pode passar de 120 caracteres." });
    expect(supabaseMock.insercoes).toEqual([]);
  });

  it("retorna erro claro quando não há sessão, sem tocar em nenhuma tabela", async () => {
    supabaseMock.definirUsuario(null);

    const resultado = await criarElementoParedePreset({ nome: "Janela" });

    expect(resultado).toEqual({ ok: false, erro: "Sua sessão expirou. Faça login novamente." });
    expect(supabaseMock.insercoes).toEqual([]);
  });

  it("larguraPadrao/alturaPadrao omitidos viram null (prefill opcional)", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    supabaseMock.respostas.elemento_parede_preset = {
      data: { id: "p2", organizacao_id: "org-a", nome: "Porta", largura_padrao: null, altura_padrao: null, criado_em: "2026-08-06T00:00:00Z" },
      error: null,
    };

    const resultado = await criarElementoParedePreset({ nome: "Porta" });

    expect(resultado.ok).toBe(true);
    expect(supabaseMock.insercoes[0]?.valores).toEqual({
      organizacao_id: "org-a",
      nome: "Porta",
      largura_padrao: null,
      altura_padrao: null,
    });
  });
});
