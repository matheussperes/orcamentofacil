import { beforeEach, describe, expect, it, vi } from "vitest";
import { excluirOrganizacao } from "./excluir";

// Task 4.15 (contrato .maestro/state/contracts/4.15.md) — a exclusão da
// organização é irreversível e a ORDEM dos passos faz parte da especificação
// (`docs/Modelo-de-Dominio.md` 7.3). Por isso o mock abaixo não checa só "foi
// chamado": grava uma TRILHA ordenada de tudo que a rotina fez, e os testes
// afirmam sobre a sequência inteira.
//
// Fora de alcance deste teste (é SQL, não TypeScript): o cascade em si — que
// `delete from organizacao` remove perfil/cliente/produto/gabarito/orcamento e
// seus filhos, e que o gabarito GLOBAL (`organizacao_id is null`) sobrevive.
// Isso é garantido pelas FKs `on delete cascade` já existentes em toda tabela
// de tenant, mais a migration `20260813160000_orcamento_cliente_id_no_action.sql`
// (armadilha 1), e é verificado pelo qa-engineer contra um banco real com dado
// em cada tabela. O que ESTE teste garante é o que o código decide: quem pode
// disparar, e em que ordem os efeitos colaterais acontecem.

const trilha: string[] = [];

const estado = vi.hoisted(() => ({
  usuario: { id: "user-admin" } as { id: string } | null,
  perfilChamador: { data: { organizacao_id: "org-1", papel: "admin" }, error: null } as {
    data: unknown;
    error: { message: string } | null;
  },
  perfisDaOrg: [{ id: "user-admin" }, { id: "user-colega" }] as { id: string }[],
  objetosPorPrefixo: {
    "organizacao-logos/org-1": [{ name: "logo.png" }],
    "linha-proposta-renders/org-1": [{ name: "linha-a.png" }, { name: "linha-b.png" }],
    "perfil-fotos/user-admin": [{ name: "foto.png" }],
    "perfil-fotos/user-colega": [] as { name: string }[],
  } as Record<string, { name: string }[]>,
}));

const OBJETOS_INICIAIS = () => ({
  "organizacao-logos/org-1": [{ name: "logo.png" }],
  "linha-proposta-renders/org-1": [{ name: "linha-a.png" }, { name: "linha-b.png" }],
  "perfil-fotos/user-admin": [{ name: "foto.png" }],
  "perfil-fotos/user-colega": [] as { name: string }[],
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: estado.usuario } }),
      signOut: async () => {
        trilha.push("auth.signOut");
        return { error: null };
      },
    },
    from: (tabela: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            trilha.push(`user.select ${tabela} (chamador)`);
            return estado.perfilChamador;
          },
        }),
      }),
    }),
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string, chave: string) => {
    trilha.push(`admin.criado (${url}, ${chave})`);
    return {
      from: (tabela: string) => ({
        select: () => ({
          eq: async (coluna: string, valor: string) => {
            trilha.push(`admin.select ${tabela} where ${coluna}=${valor}`);
            return { data: estado.perfisDaOrg, error: null };
          },
        }),
        delete: () => ({
          eq: async (coluna: string, valor: string) => {
            trilha.push(`admin.delete ${tabela} where ${coluna}=${valor}`);
            return { error: null };
          },
        }),
      }),
      storage: {
        // O mock de Storage é uma máquina de estado de verdade (`remove`
        // realmente esvazia o prefixo) — sem isso a paginação de
        // `expurgarPrefixo` não seria testável: um prefixo com exatamente
        // `limit` objetos listaria os mesmos para sempre.
        from: (bucket: string) => ({
          list: async (prefixo: string, opcoes?: { limit?: number }) => {
            const chave = `${bucket}/${prefixo}`;
            const todos = estado.objetosPorPrefixo[chave] ?? [];
            return { data: todos.slice(0, opcoes?.limit ?? 100), error: null };
          },
          remove: async (paths: string[]) => {
            trilha.push(`storage.remove ${bucket}: ${paths.length} objeto(s)`);
            for (const path of paths) {
              const barra = path.indexOf("/");
              const chave = `${bucket}/${path.slice(0, barra)}`;
              const nome = path.slice(barra + 1);
              estado.objetosPorPrefixo[chave] = (estado.objetosPorPrefixo[chave] ?? []).filter(
                (objeto) => objeto.name !== nome
              );
            }
            return { error: null };
          },
        }),
      },
      auth: {
        admin: {
          deleteUser: async (id: string) => {
            trilha.push(`auth.admin.deleteUser ${id}`);
            return { error: null };
          },
        },
      },
    };
  },
}));

beforeEach(() => {
  trilha.length = 0;
  estado.usuario = { id: "user-admin" };
  estado.perfilChamador = { data: { organizacao_id: "org-1", papel: "admin" }, error: null };
  estado.perfisDaOrg = [{ id: "user-admin" }, { id: "user-colega" }];
  estado.objetosPorPrefixo = OBJETOS_INICIAIS();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-de-teste";
});

describe("excluirOrganizacao — autorização (Q-17, E-D1)", () => {
  it.each(["vendedor", "projetista"])(
    "rejeita papel %s com NAO_AUTORIZADO_EXCLUIR_ORG e não apaga nada",
    async (papel) => {
      estado.perfilChamador = { data: { organizacao_id: "org-1", papel }, error: null };

      const resultado = await excluirOrganizacao();

      expect(resultado).toEqual({
        ok: false,
        erro: "Só o administrador da organização pode excluir a conta.",
        codigo: "NAO_AUTORIZADO_EXCLUIR_ORG",
      });
      // Nada além da leitura do próprio perfil: nenhum cliente service_role
      // sequer foi criado, nenhum delete, nenhum Storage, nenhuma Admin API.
      expect(trilha).toEqual(["user.select perfil (chamador)"]);
    }
  );

  it("rejeita sem sessão sem nem ler o perfil (ausência de papel não é admin)", async () => {
    estado.usuario = null;

    const resultado = await excluirOrganizacao();

    expect(resultado.codigo).toBe("NAO_AUTORIZADO_EXCLUIR_ORG");
    expect(trilha).toEqual([]);
  });

  it("rejeita usuário autenticado sem perfil na organização", async () => {
    estado.perfilChamador = { data: null, error: null };

    const resultado = await excluirOrganizacao();

    expect(resultado.codigo).toBe("NAO_AUTORIZADO_EXCLUIR_ORG");
    expect(trilha).toEqual(["user.select perfil (chamador)"]);
  });

  it("rejeita quando a leitura do perfil falha (fail-closed, nunca fail-open)", async () => {
    estado.perfilChamador = { data: null, error: { message: "boom" } };

    const resultado = await excluirOrganizacao();

    expect(resultado.codigo).toBe("NAO_AUTORIZADO_EXCLUIR_ORG");
    expect(trilha).toEqual(["user.select perfil (chamador)"]);
  });
});

describe("excluirOrganizacao — sequência do cascade (admin)", () => {
  it("executa checagem → perfis → delete → Storage → Auth, nesta ordem", async () => {
    const resultado = await excluirOrganizacao();

    expect(resultado).toEqual({ ok: true });
    expect(trilha).toEqual([
      // Passo 0 — papel do chamador, antes de tudo
      "user.select perfil (chamador)",
      "admin.criado (https://projeto.supabase.co, service-role-de-teste)",
      // Passo 1 — perfis lidos ANTES do delete (armadilha 2)
      "admin.select perfil where organizacao_id=org-1",
      // Passo 2 — o delete que dispara a cascata
      "admin.delete organizacao where id=org-1",
      // Passo 3 — Storage nos três buckets por-tenant (armadilha 3)
      "storage.remove organizacao-logos: 1 objeto(s)",
      "storage.remove linha-proposta-renders: 2 objeto(s)",
      "storage.remove perfil-fotos: 1 objeto(s)",
      // Passo 4 — Admin API para cada usuário lido no passo 1
      "auth.admin.deleteUser user-admin",
      "auth.admin.deleteUser user-colega",
      "auth.signOut",
    ]);
  });

  it("apaga do Auth TODOS os membros da org, não só quem disparou", async () => {
    await excluirOrganizacao();

    expect(trilha).toContain("auth.admin.deleteUser user-admin");
    expect(trilha).toContain("auth.admin.deleteUser user-colega");
  });

  it("não chama remove quando o prefixo não tem objeto (org sem logo/foto)", async () => {
    await excluirOrganizacao();

    // `perfil-fotos/user-colega` está vazio no mock: só UM remove no bucket de
    // fotos, o do `user-admin`.
    expect(trilha.filter((passo) => passo.startsWith("storage.remove perfil-fotos"))).toHaveLength(1);
  });

  it("pagina o expurgo além do limite de 100 do storage.list, sem deixar resto", async () => {
    // `linha-proposta-renders` guarda um objeto por linha de proposta
    // (`{org}/{linhaId}.png`) — 250 é um volume plausível para uma org real, e
    // `list` só devolve 100 por chamada.
    estado.objetosPorPrefixo["linha-proposta-renders/org-1"] = Array.from(
      { length: 250 },
      (_, i) => ({ name: `linha-${i}.png` })
    );

    await excluirOrganizacao();

    expect(trilha.filter((passo) => passo.startsWith("storage.remove linha-proposta-renders"))).toEqual([
      "storage.remove linha-proposta-renders: 100 objeto(s)",
      "storage.remove linha-proposta-renders: 100 objeto(s)",
      "storage.remove linha-proposta-renders: 50 objeto(s)",
    ]);
    expect(estado.objetosPorPrefixo["linha-proposta-renders/org-1"]).toHaveLength(0);
  });

  it("nunca usa o service_role antes da checagem de papel", async () => {
    estado.perfilChamador = { data: { organizacao_id: "org-1", papel: "vendedor" }, error: null };

    await excluirOrganizacao();

    expect(trilha.some((passo) => passo.startsWith("admin."))).toBe(false);
  });

  it("falha sem apagar nada quando a service_role key não está configurada", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const resultado = await excluirOrganizacao();

    expect(resultado.ok).toBe(false);
    expect(trilha).toEqual(["user.select perfil (chamador)"]);
  });
});
