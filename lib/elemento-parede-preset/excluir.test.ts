// Task 2.12 (back) — testes de `excluirElementoParedePreset`. Mesmo estilo
// de mock local de `@/lib/supabase/server` já usado nos demais testes deste
// domínio.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { excluirElementoParedePreset } from "./excluir";

const supabaseMock = vi.hoisted(() => {
  let usuarioAtual: { id: string } | null = { id: "user-1" };
  let resposta: { data: unknown; error: unknown } = { data: [{ id: "p1" }], error: null };
  const chamadas: { id: string }[] = [];

  return {
    definirResposta: (r: { data: unknown; error: unknown }) => {
      resposta = r;
    },
    definirUsuario: (usuario: { id: string } | null) => {
      usuarioAtual = usuario;
    },
    chamadas,
    resetar: () => {
      usuarioAtual = { id: "user-1" };
      resposta = { data: [{ id: "p1" }], error: null };
      chamadas.length = 0;
    },
    cliente: {
      auth: { getUser: async () => ({ data: { user: usuarioAtual } }) },
      from: () => ({
        delete: () => ({
          eq: (_coluna: string, valor: string) => {
            chamadas.push({ id: valor });
            return {
              select: async () => resposta,
            };
          },
        }),
      }),
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

describe("excluirElementoParedePreset", () => {
  it("caminho feliz: exclui e retorna ok", async () => {
    const resultado = await excluirElementoParedePreset("p1");

    expect(resultado).toEqual({ ok: true });
    expect(supabaseMock.chamadas).toEqual([{ id: "p1" }]);
  });

  it("0 linhas afetadas (outra org ou já excluído): retorna erro claro", async () => {
    supabaseMock.definirResposta({ data: [], error: null });

    const resultado = await excluirElementoParedePreset("p-de-outra-org");

    expect(resultado).toEqual({ ok: false, erro: "Este preset já foi removido." });
  });

  it("retorna erro claro quando não há sessão, sem tocar na tabela", async () => {
    supabaseMock.definirUsuario(null);

    const resultado = await excluirElementoParedePreset("p1");

    expect(resultado).toEqual({ ok: false, erro: "Sua sessão expirou. Faça login novamente." });
    expect(supabaseMock.chamadas).toEqual([]);
  });

  it("erro do banco: retorna erro claro", async () => {
    supabaseMock.definirResposta({ data: null, error: { message: "falhou" } });

    const resultado = await excluirElementoParedePreset("p1");

    expect(resultado).toEqual({ ok: false, erro: "Não foi possível excluir este preset. Tente novamente." });
  });
});
