// Task 4.10 — cobre a resolução de `organizacao.logo_url` (path de Storage)
// em signed URL dentro de `carregarDadosPropostaPdf`. Mesmo padrão de mock
// local de `@/lib/supabase/server` já usado em `lib/orcamento/buscar.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { carregarDadosPropostaPdf } from "./carregar";

const organizacaoBase = {
  nome: "Marcenaria Teste",
  cnpj: null,
  endereco: null,
  telefone: null,
};

const clienteBase = { nome: "Cliente Teste", telefone: null, endereco: null };

const supabaseMock = vi.hoisted(() => {
  let logoUrl: string | null = null;
  let signedUrlResposta: { data: { signedUrl: string } | null; error: { message: string } | null } = {
    data: { signedUrl: "https://signed.example/logo.png" },
    error: null,
  };
  let chamadasSignedUrl = 0;
  return {
    definirLogoUrl: (v: string | null) => {
      logoUrl = v;
    },
    definirRespostaSignedUrl: (r: typeof signedUrlResposta) => {
      signedUrlResposta = r;
    },
    contarChamadasSignedUrl: () => chamadasSignedUrl,
    resetar: () => {
      logoUrl = null;
      signedUrlResposta = { data: { signedUrl: "https://signed.example/logo.png" }, error: null };
      chamadasSignedUrl = 0;
    },
    cliente: {
      from: (tabela: string) => {
        if (tabela === "orcamento") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "orc-1",
                    prazo_entrega: null,
                    cliente: clienteBase,
                    organizacao: { ...organizacaoBase, logo_url: logoUrl },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        // linha_proposta
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }),
        };
      },
      storage: {
        from: () => ({
          createSignedUrl: async () => {
            chamadasSignedUrl += 1;
            return signedUrlResposta;
          },
        }),
      },
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

describe("carregarDadosPropostaPdf — resolução de logoUrl (Task 4.10)", () => {
  it("logo com path válido resolve signed URL", async () => {
    supabaseMock.definirLogoUrl("org-1/logo.png");
    supabaseMock.definirRespostaSignedUrl({
      data: { signedUrl: "https://signed.example/logo.png" },
      error: null,
    });

    const dados = await carregarDadosPropostaPdf("orc-1");

    expect(dados?.organizacao.logoUrl).toBe("https://signed.example/logo.png");
  });

  it("sem logo (`logo_url` nulo) vira `null` sem chamar Storage", async () => {
    supabaseMock.definirLogoUrl(null);

    const dados = await carregarDadosPropostaPdf("orc-1");

    expect(dados?.organizacao.logoUrl).toBeNull();
    expect(supabaseMock.contarChamadasSignedUrl()).toBe(0);
  });

  it("path inválido (erro no `createSignedUrl`) vira `null` sem lançar exceção", async () => {
    supabaseMock.definirLogoUrl("org-1/logo-removida.png");
    supabaseMock.definirRespostaSignedUrl({ data: null, error: { message: "Object not found" } });

    const dados = await carregarDadosPropostaPdf("orc-1");

    expect(dados?.organizacao.logoUrl).toBeNull();
  });
});
