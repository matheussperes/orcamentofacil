// Task 3.13 (catálogo-back) — testes de `validarDados` (via `criarProduto`)
// para `especificacao.texturaUrl` (chapa). Mesmo estilo de mock local de
// `@/lib/supabase/server` já usado em `lib/cliente/acoes.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarProduto } from "./acoes";

const supabaseMock = vi.hoisted(() => {
  const respostas: Record<string, { data: unknown; error: unknown }> = {};
  const inserts: { tabela: string; valores: Record<string, unknown> }[] = [];

  function tabela(nome: string) {
    const builder = {
      select: () => builder,
      eq: () => builder,
      insert: (valores: Record<string, unknown>) => {
        inserts.push({ tabela: nome, valores });
        return builder;
      },
      maybeSingle: async () => respostas[nome] ?? { data: null, error: null },
      single: async () => respostas[nome] ?? { data: null, error: null },
    };
    return builder;
  }

  return {
    respostas,
    inserts,
    resetar: () => {
      for (const chave of Object.keys(respostas)) delete respostas[chave];
      inserts.length = 0;
    },
    cliente: {
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
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
  supabaseMock.respostas.produto = { data: { id: "produto-1" }, error: null };
});

afterEach(() => {
  supabaseMock.resetar();
});

describe("validarDados — especificacao.texturaUrl (chapa)", () => {
  it("aceita caminho relativo válido", async () => {
    const resultado = await criarProduto({
      tipo: "chapa",
      nome: "MDF Branco",
      preco: 100,
      especificacao: { cor: "Branco", espessura: 15, texturaUrl: "branco-tx.webp" },
    });

    expect(resultado.ok).toBe(true);
    expect(supabaseMock.inserts).toHaveLength(1);
  });

  it("aceita ausência do campo (produto sem textura continua válido)", async () => {
    const resultado = await criarProduto({
      tipo: "chapa",
      nome: "MDF Branco",
      preco: 100,
      especificacao: { cor: "Branco", espessura: 15 },
    });

    expect(resultado.ok).toBe(true);
  });

  it("rejeita URL externa (https://)", async () => {
    const resultado = await criarProduto({
      tipo: "chapa",
      nome: "MDF Branco",
      preco: 100,
      especificacao: { cor: "Branco", espessura: 15, texturaUrl: "https://evil.com/tx.webp" },
    });

    expect(resultado.ok).toBe(false);
    expect(supabaseMock.inserts).toHaveLength(0);
  });

  it("rejeita URL externa (http://)", async () => {
    const resultado = await criarProduto({
      tipo: "chapa",
      nome: "MDF Branco",
      preco: 100,
      especificacao: { cor: "Branco", espessura: 15, texturaUrl: "http://evil.com/tx.webp" },
    });

    expect(resultado.ok).toBe(false);
  });

  it("rejeita URL protocolo-relativa (//)", async () => {
    const resultado = await criarProduto({
      tipo: "chapa",
      nome: "MDF Branco",
      preco: 100,
      especificacao: { cor: "Branco", espessura: 15, texturaUrl: "//evil.com/tx.webp" },
    });

    expect(resultado.ok).toBe(false);
  });

  // Achado de segurança: tentativa de burlar com variação de formatação —
  // maiúsculas e espaço antes do protocolo, ambas normalizadas em
  // `ehCaminhoRelativoValido`.
  it("rejeita tentativa de burlar com maiúsculas e espaço antes do protocolo", async () => {
    const resultado = await criarProduto({
      tipo: "chapa",
      nome: "MDF Branco",
      preco: 100,
      especificacao: { cor: "Branco", espessura: 15, texturaUrl: "  HTTPS://evil.com/tx.webp" },
    });

    expect(resultado.ok).toBe(false);
    expect(supabaseMock.inserts).toHaveLength(0);
  });
});
