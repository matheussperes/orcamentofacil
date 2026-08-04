// Task 0.5b — cobre a extração de `clienteId`/`clienteTelefone`/
// `clienteEndereco` de `buscarOrcamentoPorId` (gap de dado da Task 0.5b:
// sem isso o diálogo de edição não tem o que pré-popular nem pra onde
// mandar `atualizarCliente`). Mesmo padrão de mock local de
// `@/lib/supabase/server` já usado em `lib/orcamento/congelar.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buscarOrcamentoPorId } from "./buscar";

const supabaseMock = vi.hoisted(() => {
  let respostaOrcamento: { data: unknown; error: unknown } = { data: null, error: null };
  return {
    definirRespostaOrcamento: (r: { data: unknown; error: unknown }) => {
      respostaOrcamento = r;
    },
    resetar: () => {
      respostaOrcamento = { data: null, error: null };
    },
    cliente: {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => respostaOrcamento,
          }),
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

describe("buscarOrcamentoPorId — dados do cliente (Task 0.5b)", () => {
  it("extrai id/telefone/endereco quando `cliente` vem como objeto (to-one)", async () => {
    supabaseMock.definirRespostaOrcamento({
      data: {
        id: "orc-1",
        status: "rascunho",
        prazo_entrega: null,
        frete: null,
        congelado_em: null,
        cliente: { id: "cli-1", nome: "Maria", telefone: "11999999999", endereco: "Rua A" },
      },
      error: null,
    });

    const orcamento = await buscarOrcamentoPorId("orc-1");

    expect(orcamento?.clienteId).toBe("cli-1");
    expect(orcamento?.clienteNome).toBe("Maria");
    expect(orcamento?.clienteTelefone).toBe("11999999999");
    expect(orcamento?.clienteEndereco).toBe("Rua A");
  });

  it("extrai id/telefone/endereco quando `cliente` vem como array de 1 (to-many)", async () => {
    supabaseMock.definirRespostaOrcamento({
      data: {
        id: "orc-2",
        status: "rascunho",
        prazo_entrega: null,
        frete: null,
        congelado_em: null,
        cliente: [{ id: "cli-2", nome: "João", telefone: null, endereco: null }],
      },
      error: null,
    });

    const orcamento = await buscarOrcamentoPorId("orc-2");

    expect(orcamento?.clienteId).toBe("cli-2");
    expect(orcamento?.clienteTelefone).toBeNull();
    expect(orcamento?.clienteEndereco).toBeNull();
  });

  it("cai em valores neutros quando `cliente` é null", async () => {
    supabaseMock.definirRespostaOrcamento({
      data: {
        id: "orc-3",
        status: "rascunho",
        prazo_entrega: null,
        frete: null,
        congelado_em: null,
        cliente: null,
      },
      error: null,
    });

    const orcamento = await buscarOrcamentoPorId("orc-3");

    expect(orcamento?.clienteId).toBe("");
    expect(orcamento?.clienteNome).toBe("Cliente sem nome");
    expect(orcamento?.clienteTelefone).toBeNull();
    expect(orcamento?.clienteEndereco).toBeNull();
  });
});
