// Task 0.4 — regressão do achado colateral corrigido nesta task: salvar
// parede/ambiente NUNCA escreve em `organizacao.alturas_padrao` (Modelo de
// Domínio 3.2.1, "[V2.1] Invariante de escrita"). Antes desta task, o passo 2
// de `salvarEstadoAmbiente` fazia exatamente isso a cada salvamento. Mesmo
// mock local mínimo de `@/lib/supabase/server` usado em `acoes.test.ts` — o
// projeto ainda não tem infraestrutura de mock genérica do client Supabase.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { estadoAmbientePadrao } from "./estado";
import { salvarEstadoAmbiente } from "./salvar";

const supabaseMock = vi.hoisted(() => {
  let usuarioAtual: { id: string } | null = { id: "user-1" };
  const respostas: Record<string, { data: unknown; error: unknown }> = {};
  const respostasDiretas: Record<string, { data: unknown; error: unknown }> = {};
  const atualizacoes: { tabela: string; valores: Record<string, unknown> }[] = [];
  const fromChamadas: string[] = [];

  function tabela(nome: string) {
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      delete: () => builder,
      insert: (valores: Record<string, unknown>) => {
        atualizacoes.push({ tabela: nome, valores });
        return builder;
      },
      update: (valores: Record<string, unknown>) => {
        atualizacoes.push({ tabela: nome, valores });
        return builder;
      },
      maybeSingle: async () => respostas[nome] ?? { data: null, error: null },
      single: async () => respostas[nome] ?? { data: null, error: null },
      then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
        resolve(respostasDiretas[nome] ?? { data: null, error: null });
      },
    };
    return builder;
  }

  return {
    respostas,
    respostasDiretas,
    atualizacoes,
    fromChamadas,
    resetar: () => {
      usuarioAtual = { id: "user-1" };
      for (const chave of Object.keys(respostas)) delete respostas[chave];
      for (const chave of Object.keys(respostasDiretas)) delete respostasDiretas[chave];
      atualizacoes.length = 0;
      fromChamadas.length = 0;
    },
    cliente: {
      auth: { getUser: async () => ({ data: { user: usuarioAtual } }) },
      from: (nome: string) => {
        fromChamadas.push(nome);
        return tabela(nome);
      },
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabaseMock.cliente,
}));

beforeEach(() => {
  supabaseMock.resetar();
  // Ambiente e parede já existem (upsert cai no ramo `update`, não `insert`) —
  // o suficiente pra exercitar o caminho feliz completo sem precisar mockar
  // o ramo de criação (`.insert().select().single()`).
  supabaseMock.respostas.perfil = { data: { organizacao_id: "org-1" }, error: null };
  supabaseMock.respostas.ambiente = { data: { id: "ambiente-1" }, error: null };
  supabaseMock.respostas.parede = { data: { id: "parede-1" }, error: null };
});

afterEach(() => {
  supabaseMock.resetar();
});

describe("salvarEstadoAmbiente — nunca escreve em organizacao.alturas_padrao (Task 0.4)", () => {
  it("caminho feliz completo não toca a tabela organizacao", async () => {
    const resultado = await salvarEstadoAmbiente("orcamento-1", estadoAmbientePadrao());

    expect(resultado).toEqual({ ok: true });
    expect(supabaseMock.fromChamadas).not.toContain("organizacao");
    expect(supabaseMock.atualizacoes.some((u) => u.tabela === "organizacao")).toBe(false);
  });
});
