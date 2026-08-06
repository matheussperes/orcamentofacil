// Task 1.9-front — mesmo padrão de mock local de `@/lib/supabase/server` já
// usado em `lib/orcamento/reabrir.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { papelAtual } from "./papelAtual";

const supabaseMock = vi.hoisted(() => {
  let usuarioAtual: { id: string } | null = { id: "user-1" };
  let respostaPerfil: { data: unknown; error: unknown } = { data: null, error: null };

  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => respostaPerfil,
  };

  return {
    definirUsuario: (usuario: { id: string } | null) => {
      usuarioAtual = usuario;
    },
    definirRespostaPerfil: (resposta: { data: unknown; error: unknown }) => {
      respostaPerfil = resposta;
    },
    resetar: () => {
      usuarioAtual = { id: "user-1" };
      respostaPerfil = { data: null, error: null };
    },
    cliente: {
      auth: { getUser: async () => ({ data: { user: usuarioAtual } }) },
      from: () => builder,
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

describe("papelAtual", () => {
  it("devolve o papel do perfil do usuário logado", async () => {
    supabaseMock.definirRespostaPerfil({ data: { papel: "admin" }, error: null });

    expect(await papelAtual()).toBe("admin");
  });

  it("devolve null quando não há sessão", async () => {
    supabaseMock.definirUsuario(null);

    expect(await papelAtual()).toBeNull();
  });

  it("devolve null quando o perfil não é encontrado", async () => {
    supabaseMock.definirRespostaPerfil({ data: null, error: null });

    expect(await papelAtual()).toBeNull();
  });
});
