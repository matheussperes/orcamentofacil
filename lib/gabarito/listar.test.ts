// Task 2.1 (dedup) — cobre a regra 6 (`docs/Modelo-de-Dominio.md` Seção 7.1):
// biblioteca esconde o gabarito global cuja origem é um gabarito da própria
// org. Mesmo padrão de mock local de `@/lib/supabase/server` de
// `lib/orcamento/buscar.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vaoVazio } from "@/lib/engine/box/types";
import { listarGabaritos } from "./listar";

const usuarioAtual = { id: "user-1" };

const supabaseMock = vi.hoisted(() => {
  let respostaGabaritos: { data: unknown; error: unknown } = { data: [], error: null };
  return {
    definirResposta: (r: { data: unknown; error: unknown }) => {
      respostaGabaritos = r;
    },
    resetar: () => {
      respostaGabaritos = { data: [], error: null };
    },
    cliente: {
      auth: { getUser: async () => ({ data: { user: usuarioAtual } }) },
      from: () => ({
        select: () => ({
          order: () => ({
            order: async () => respostaGabaritos,
          }),
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
    id: "id",
    organizacao_id: null,
    origem_gabarito_id: null,
    nome: "Módulo",
    categoria: "categoria",
    definicao: {
      id: "seed",
      nome: "Módulo",
      tipo: "inferior",
      largura: 800,
      altura: 720,
      profundidade: 550,
      caixa: { cor: "Branco TX", espessura: 15 },
      raiz: vaoVazio("raiz"),
      portas: [],
      temFundo: true,
      puxador: "haste",
    },
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

describe("listarGabaritos — dedup de promoção (Task 2.1)", () => {
  it("esconde o global promovido cuja origem é um gabarito da própria org", async () => {
    supabaseMock.definirResposta({
      data: [
        linha({ id: "g7", organizacao_id: "org-1", origem_gabarito_id: null, nome: "G7" }),
        linha({ id: "g7-linha", organizacao_id: null, origem_gabarito_id: "g7", nome: "G7 (global)" }),
      ],
      error: null,
    });

    const { gabaritos, erro } = await listarGabaritos();

    expect(erro).toBe(false);
    expect(gabaritos.map((g) => g.id)).toEqual(["g7"]);
  });

  it("mantém globais cuja origem é de outra organização, ou sem origem (seed)", async () => {
    supabaseMock.definirResposta({
      data: [
        linha({ id: "g1", organizacao_id: null, origem_gabarito_id: null, nome: "Seed" }),
        linha({ id: "g2", organizacao_id: null, origem_gabarito_id: "org-2-gabarito", nome: "Promovido de outra org" }),
        linha({ id: "g3", organizacao_id: "org-1", origem_gabarito_id: null, nome: "Próprio" }),
      ],
      error: null,
    });

    const { gabaritos } = await listarGabaritos();

    expect(gabaritos.map((g) => g.id).sort()).toEqual(["g1", "g2", "g3"]);
  });

  it("sem nenhuma promoção, retorna todas as linhas normalmente (sem regressão)", async () => {
    supabaseMock.definirResposta({
      data: [
        linha({ id: "g1", organizacao_id: null, origem_gabarito_id: null }),
        linha({ id: "g2", organizacao_id: "org-1", origem_gabarito_id: null }),
      ],
      error: null,
    });

    const { gabaritos, erro } = await listarGabaritos();

    expect(erro).toBe(false);
    expect(gabaritos).toHaveLength(2);
  });
});
