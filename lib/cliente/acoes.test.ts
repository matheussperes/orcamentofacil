// Task 0.5a — testes de `atualizarCliente` (lib/cliente/acoes.ts).
// Mesmo estilo de mock local de `@/lib/supabase/server` já usado em
// `lib/ambiente/acoes.test.ts` (o projeto não tem infraestrutura de mock
// genérica do client Supabase ainda) — reduzido ao suficiente para os dois
// SELECT/UPDATE que `atualizarCliente` faz (perfil, cliente).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atualizarCliente } from "./acoes";

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
});

afterEach(() => {
  supabaseMock.resetar();
});

describe("atualizarCliente", () => {
  it("caminho feliz: atualiza nome/telefone/endereco e retorna ok", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    supabaseMock.respostas.cliente = { data: { id: "cliente-1" }, error: null };

    const resultado = await atualizarCliente({
      clienteId: "cliente-1",
      nome: "  Maria Silva  ",
      telefone: " 11999999999 ",
      endereco: " Rua A, 123 ",
    });

    expect(resultado).toEqual({ ok: true });
    expect(supabaseMock.atualizacoes).toEqual([
      {
        tabela: "cliente",
        valores: { nome: "Maria Silva", telefone: "11999999999", endereco: "Rua A, 123" },
        eqs: [
          ["id", "cliente-1"],
          ["organizacao_id", "org-a"],
        ],
      },
    ]);
  });

  it("normaliza campo vazio (enviado) para null, mas campo ausente não entra no UPDATE", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    supabaseMock.respostas.cliente = { data: { id: "cliente-1" }, error: null };

    const resultado = await atualizarCliente({ clienteId: "cliente-1", nome: "Maria", endereco: "   " });

    expect(resultado).toEqual({ ok: true });
    // endereco veio (só espaços) -> limpeza explícita, vira null. telefone
    // nem veio no input -> não deve aparecer no objeto de update (Ajuste 2).
    expect(supabaseMock.atualizacoes[0]?.valores).toEqual({
      nome: "Maria",
      endereco: null,
    });
  });

  // Ajuste 2 (Security-Decline-Payload.md, tentativa 1): update parcial não
  // pode apagar telefone/endereco já salvos quando o formulário só manda nome.
  it("update parcial (só nome) não inclui telefone/endereco no UPDATE — não apaga valor já salvo", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    supabaseMock.respostas.cliente = { data: { id: "cliente-1" }, error: null };

    const resultado = await atualizarCliente({ clienteId: "cliente-1", nome: "Só o nome mudou" });

    expect(resultado).toEqual({ ok: true });
    const valores = supabaseMock.atualizacoes[0]?.valores;
    expect(valores).toEqual({ nome: "Só o nome mudou" });
    expect("telefone" in (valores ?? {})).toBe(false);
    expect("endereco" in (valores ?? {})).toBe(false);
  });

  it("rejeita nome vazio (ou só espaços) sem chamar o banco", async () => {
    const resultado = await atualizarCliente({ clienteId: "cliente-1", nome: "   " });

    expect(resultado).toEqual({ ok: false, erro: "Informe o nome do cliente." });
    expect(supabaseMock.atualizacoes).toEqual([]);
  });

  it("cliente de outra organização não é alterado: update filtrado não acha linha, retorna erro claro", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    // RLS + filtro explícito por organizacao_id não acham a linha de outra org.
    supabaseMock.respostas.cliente = { data: null, error: null };

    const resultado = await atualizarCliente({ clienteId: "cliente-de-outra-org", nome: "Maria" });

    expect(resultado).toEqual({ ok: false, erro: "Este cliente não existe mais." });
    expect(supabaseMock.atualizacoes).toEqual([
      {
        tabela: "cliente",
        valores: { nome: "Maria" },
        eqs: [
          ["id", "cliente-de-outra-org"],
          ["organizacao_id", "org-a"],
        ],
      },
    ]);
  });

  it("retorna erro claro quando não há sessão, sem tocar em nenhuma tabela", async () => {
    supabaseMock.definirUsuario(null);

    const resultado = await atualizarCliente({ clienteId: "cliente-1", nome: "Maria" });

    expect(resultado).toEqual({ ok: false, erro: "Sua sessão expirou. Faça login novamente." });
    expect(supabaseMock.atualizacoes).toEqual([]);
  });

  // Achado 1 (Security-Decline-Payload.md, tentativa 1): mesmo teto de
  // lib/ambiente/acoes.ts (NOME_MAX_LENGTH = 120) para nome/telefone/endereco.
  describe("teto de tamanho (Achado 1)", () => {
    it("rejeita nome acima de 120 caracteres, sem tocar em nenhuma tabela", async () => {
      const resultado = await atualizarCliente({ clienteId: "cliente-1", nome: "a".repeat(121) });

      expect(resultado).toEqual({ ok: false, erro: "O nome não pode passar de 120 caracteres." });
      expect(supabaseMock.atualizacoes).toEqual([]);
    });

    it("rejeita telefone acima de 120 caracteres, sem tocar em nenhuma tabela", async () => {
      const resultado = await atualizarCliente({
        clienteId: "cliente-1",
        nome: "Maria",
        telefone: "9".repeat(121),
      });

      expect(resultado).toEqual({ ok: false, erro: "O telefone não pode passar de 120 caracteres." });
      expect(supabaseMock.atualizacoes).toEqual([]);
    });

    it("rejeita endereco acima de 120 caracteres, sem tocar em nenhuma tabela", async () => {
      const resultado = await atualizarCliente({
        clienteId: "cliente-1",
        nome: "Maria",
        endereco: "a".repeat(121),
      });

      expect(resultado).toEqual({ ok: false, erro: "O endereço não pode passar de 120 caracteres." });
      expect(supabaseMock.atualizacoes).toEqual([]);
    });

    it("aceita nome no limite exato de 120 caracteres", async () => {
      supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
      supabaseMock.respostas.cliente = { data: { id: "cliente-1" }, error: null };

      const resultado = await atualizarCliente({ clienteId: "cliente-1", nome: "a".repeat(120) });

      expect(resultado).toEqual({ ok: true });
    });
  });
});
