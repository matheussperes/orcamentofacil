// Task 2.12 (back) — testes de `listarElementoParedePresets`. Mesmo padrão
// de mock local de `@/lib/supabase/server` de `lib/gabarito/listar.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listarElementoParedePresets } from "./listar";

const supabaseMock = vi.hoisted(() => {
  let usuario: { id: string } | null = { id: "user-1" };
  let resposta: { data: unknown; error: unknown } = { data: [], error: null };
  return {
    definirResposta: (r: { data: unknown; error: unknown }) => {
      resposta = r;
    },
    definirUsuario: (u: { id: string } | null) => {
      usuario = u;
    },
    resetar: () => {
      usuario = { id: "user-1" };
      resposta = { data: [], error: null };
    },
    cliente: {
      auth: { getUser: async () => ({ data: { user: usuario } }) },
      from: () => ({
        select: () => ({
          order: async () => resposta,
        }),
      }),
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabaseMock.cliente,
}));

function linha(overrides: Partial<Record<string, unknown>>) {
  return {
    id: "preset-1",
    organizacao_id: "org-1",
    nome: "Preset",
    largura_padrao: null,
    altura_padrao: null,
    criado_em: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  supabaseMock.resetar();
});

afterEach(() => {
  supabaseMock.resetar();
});

describe("listarElementoParedePresets", () => {
  it("caminho feliz: retorna presets normalizados", async () => {
    supabaseMock.definirResposta({
      data: [linha({ id: "p1", nome: "Janela", largura_padrao: 800, altura_padrao: 1000 })],
      error: null,
    });

    const { presets, erro } = await listarElementoParedePresets();

    expect(erro).toBe(false);
    expect(presets).toEqual([
      {
        id: "p1",
        organizacaoId: "org-1",
        nome: "Janela",
        larguraPadrao: 800,
        alturaPadrao: 1000,
        criadoEm: presets[0]?.criadoEm,
      },
    ]);
  });

  it("erro de consulta: retorna erro true e lista vazia", async () => {
    supabaseMock.definirResposta({ data: null, error: { message: "falhou" } });

    const { presets, erro } = await listarElementoParedePresets();

    expect(erro).toBe(true);
    expect(presets).toEqual([]);
  });

  it("sem sessão: retorna erro true sem consultar a tabela", async () => {
    supabaseMock.definirUsuario(null);

    const { presets, erro } = await listarElementoParedePresets();

    expect(erro).toBe(true);
    expect(presets).toEqual([]);
  });
});
