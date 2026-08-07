// Task 0.1-0.3 — teste puro da lógica de cascata órfã compartilhada por
// `excluirAmbiente`/`excluirParede` (lib/ambiente/acoes.ts). Deliberadamente
// SEM mockar `lib/supabase/server` (o projeto não tem infraestrutura de mock
// do client Supabase ainda — mesmo espírito de `lib/ambiente/mapear.test.ts`):
// a parte de I/O das Server Actions fica validada por lint/tsc; a parte
// determinística (quais itemId sobrevivem) está aqui.
//
// Correção da tentativa 1 do security-auditor (Security-Decline-Payload.md):
// `sanearAlturasOverride` é função pura (testada direto, sem mock) e a
// checagem de posse de `orcamentoId` em `criarAmbiente` roda ANTES de
// qualquer INSERT — para isolar só esse achado sem construir infraestrutura
// de mock genérica, o `@/lib/supabase/server` é mockado localmente aqui, só
// com o suficiente para os dois `select` que `criarAmbiente` faz antes do
// INSERT (nunca alcançado no cenário de rejeição testado).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atualizarParede, criarAmbiente, reordenarAmbientes } from "./acoes";
import { itensSemOrfaos, sanearAlturasOverride } from "./validar";
import { idDoItem, type ModuloOrcamento } from "@/lib/orcamento";
import type { ItemPosicionado } from "@/lib/engine/parede/types";

// Achado 1 (correção QA, tentativa 1): `usuarioAtual` é mutável e sobrescrevível
// por teste (via `supabaseMock.definirUsuario`) — antes o mock tinha `getUser`
// fixo, então nenhum teste conseguia provar o caminho "sem sessão".
const supabaseMock = vi.hoisted(() => {
  let usuarioAtual: { id: string } | null = { id: "user-1" };
  // Resolvido quando a chain termina em `.maybeSingle()`/`.single()`.
  const respostas: Record<string, { data: unknown; error: unknown }> = {};
  // Resolvido quando a chain é `await`ada diretamente (sem terminal
  // explícito) — caso de `select("id").eq(...)` sem `.maybeSingle()` e de
  // `.update(...)` seguido só de `.eq(...)`.
  const respostasDiretas: Record<string, { data: unknown; error: unknown }> = {};
  // Todo `.update(valores)` executado, com os `.eq(coluna, valor)` que o
  // seguiram — permite o teste inspecionar exatamente o que seria gravado.
  const atualizacoes: { tabela: string; valores: Record<string, unknown>; eqs: [string, unknown][] }[] = [];
  // Toda tabela acessada via `.from(nome)` — permite provar que, no caminho
  // de rejeição por falta de sessão, nenhuma tabela chega a ser tocada.
  const fromChamadas: string[] = [];

  function tabela(nome: string) {
    // `eqsCapturados` é a MESMA referência de array dentro da entrada
    // empurrada para `atualizacoes` em `update()` — os `.eq(...)` que vêm
    // depois na chain continuam mutando esse array, então por ele estar
    // "ligado" por referência o teste enxerga a lista completa no final,
    // mesmo a chain terminando em `.maybeSingle()` (que nunca passa por
    // `then`, só uma chain `await`ada sem terminal passa por `then`).
    const eqsCapturados: [string, unknown][] = [];
    const builder = {
      select: () => builder,
      eq: (coluna: string, valor: unknown) => {
        eqsCapturados.push([coluna, valor]);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      in: () => builder,
      update: (valores: Record<string, unknown>) => {
        atualizacoes.push({ tabela: nome, valores, eqs: eqsCapturados });
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
    definirUsuario: (usuario: { id: string } | null) => {
      usuarioAtual = usuario;
    },
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
});

afterEach(() => {
  supabaseMock.resetar();
});

function moduloDeTeste(id: string): ModuloOrcamento {
  return {
    origem: "custom_box",
    box: {
      id,
      nome: `Módulo ${id}`,
      tipo: "inferior",
      largura: 600,
      altura: 700,
      profundidade: 550,
      caixa: { cor: "Branco TX", espessura: 15 },
      raiz: { id: "r", split: "none", qtdDivisorias: 0 },
      portas: [],
      temFundo: false,
      puxador: "sem_puxador",
    },
  };
}

function itemPosicionado(itemId: string): ItemPosicionado {
  return { itemId, x: 0, faixa: "inferior" };
}

describe("itensSemOrfaos", () => {
  it("mantém módulos referenciados por alguma parede restante e remove os que não são mais referenciados", () => {
    // Cenário do critério de aceite: 2 paredes com módulos, uma é excluída —
    // o módulo dela some de orcamento.itens; o da parede que ficou permanece.
    const modulos = [moduloDeTeste("modulo-parede-1"), moduloDeTeste("modulo-parede-2")];
    // Parede 1 foi excluída (não aparece mais na lista de paredes restantes);
    // só a parede 2 continua, referenciando "modulo-parede-2".
    const itensPorParedeRestante = [[itemPosicionado("modulo-parede-2")]];

    const resultado = itensSemOrfaos(modulos, itensPorParedeRestante);

    expect(resultado.map(idDoItem)).toEqual(["modulo-parede-2"]);
  });

  it("mantém tudo quando nenhum módulo ficou órfão", () => {
    const modulos = [moduloDeTeste("a"), moduloDeTeste("b")];
    const itensPorParedeRestante = [[itemPosicionado("a")], [itemPosicionado("b")]];

    expect(itensSemOrfaos(modulos, itensPorParedeRestante)).toEqual(modulos);
  });

  it("remove todos os módulos quando não sobrou nenhuma parede (último ambiente excluído)", () => {
    const modulos = [moduloDeTeste("a"), moduloDeTeste("b")];

    expect(itensSemOrfaos(modulos, [])).toEqual([]);
  });

  it("um mesmo itemId referenciado por mais de uma parede sobrevive normalmente", () => {
    const modulos = [moduloDeTeste("compartilhado")];
    const itensPorParedeRestante = [[itemPosicionado("compartilhado")], [itemPosicionado("compartilhado")]];

    expect(itensSemOrfaos(modulos, itensPorParedeRestante)).toEqual(modulos);
  });
});

// Achado 1 (Security-Decline-Payload.md, tentativa 1) — sanearAlturasOverride
// é a whitelist de shape/valor que impede um HTTP direto na Server Action de
// gravar chave/tipo/valor arbitrário em `parede.alturas_override`.
describe("sanearAlturasOverride", () => {
  it("aceita as chaves conhecidas com valores positivos dentro do teto", () => {
    const resultado = sanearAlturasOverride({ peDireito: 2700, alturaBancada: 900 });

    expect(resultado).toEqual({ ok: true, valor: { peDireito: 2700, alturaBancada: 900 } });
  });

  it("descarta chave fora do shape de AlturasFaixas", () => {
    const entrada = { peDireito: 2700, chaveMaliciosa: 999 } as unknown as Record<string, number>;

    const resultado = sanearAlturasOverride(entrada);

    expect(resultado).toEqual({ ok: true, valor: { peDireito: 2700 } });
  });

  it("rejeita valor de tipo não numérico", () => {
    const entrada = { alturaBancada: "900" } as unknown as Record<string, number>;

    expect(sanearAlturasOverride(entrada).ok).toBe(false);
  });

  it("rejeita valor não positivo (zero ou negativo)", () => {
    expect(sanearAlturasOverride({ peDireito: 0 }).ok).toBe(false);
    expect(sanearAlturasOverride({ peDireito: -1 }).ok).toBe(false);
  });

  it("rejeita valor acima do teto de faixa residencial", () => {
    expect(sanearAlturasOverride({ peDireito: 1e12 }).ok).toBe(false);
  });
});

describe("atualizarParede — Achado 1 (validação de alturasOverride antes de qualquer I/O)", () => {
  it("rejeita chave desconhecida silenciosamente saneada mas valor inválido nas conhecidas", async () => {
    const resultado = await atualizarParede("parede-1", {
      alturasOverride: { peDireito: -1 } as Partial<import("@/lib/engine/parede/types").AlturasFaixas>,
    });

    expect(resultado).toEqual({ ok: false, erro: "Altura inválida em alturas_override." });
  });

  it("rejeita tipo inválido (string em vez de number)", async () => {
    const resultado = await atualizarParede("parede-1", {
      alturasOverride: { alturaBancada: "900" } as unknown as Partial<
        import("@/lib/engine/parede/types").AlturasFaixas
      >,
    });

    expect(resultado.ok).toBe(false);
  });
});

// Achado 2 (Security-Decline-Payload.md, tentativa 1) — criarAmbiente
// confirma posse do orcamentoId (organizacao_id do orçamento == organizacao
// do usuário) ANTES do INSERT. Mock local mínimo de @/lib/supabase/server —
// o INSERT nunca é alcançado no cenário de rejeição, só os dois SELECT
// (perfil, orcamento).
describe("criarAmbiente — Achado 2 (posse do orçamento)", () => {
  it("rejeita orcamentoId que não pertence à organização do usuário", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    supabaseMock.respostas.orcamento = { data: null, error: null }; // não achado para org-a

    const resultado = await criarAmbiente("orcamento-de-outra-org", "Sala");

    expect(resultado).toEqual({ ok: false, erro: "Este orçamento não existe mais." });
  });
});

// Achado 1 (correção QA, tentativa 1) — `organizacaoDoUsuario` é compartilhada
// pelas 7 Server Actions; provar o caminho "sem sessão" numa delas (a mais
// simples, `criarAmbiente`) cobre a mesma checagem usada por todas.
describe("criarAmbiente — Achado 1 (sem sessão)", () => {
  it("retorna erro de sessão expirada e não chama nenhuma tabela quando não há usuário autenticado", async () => {
    supabaseMock.definirUsuario(null);

    const resultado = await criarAmbiente("orcamento-1", "Sala");

    expect(resultado).toEqual({ ok: false, erro: "Sua sessão expirou. Faça login novamente." });
    expect(supabaseMock.fromChamadas).toEqual([]);
  });
});

// Achado 2 (correção QA, tentativa 1) — `reordenarAmbientes` precisa que a
// lista recebida seja exatamente o conjunto de ambientes reais do orçamento;
// senão um ambiente omitido fica com a `ordem` antiga, colidindo com a de
// outro que foi realocado para essa mesma posição.
describe("reordenarAmbientes — Achado 2 (lista precisa bater com os ambientes reais)", () => {
  it("caminho feliz: reordena N ambientes para as ordens finais esperadas", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    supabaseMock.respostasDiretas.ambiente = {
      data: [{ id: "a" }, { id: "b" }, { id: "c" }],
      error: null,
    };

    const resultado = await reordenarAmbientes("orcamento-1", ["c", "a", "b"]);

    expect(resultado).toEqual({ ok: true });
    const updatesDeOrdem = supabaseMock.atualizacoes.filter((u) => u.tabela === "ambiente" && "ordem" in u.valores);
    expect(updatesDeOrdem.map((u) => [u.eqs[0]?.[1], u.valores.ordem])).toEqual([
      ["c", 0],
      ["a", 1],
      ["b", 2],
    ]);
  });

  it("rejeita lista incompleta (ambiente omitido) sem aplicar nenhum update", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    supabaseMock.respostasDiretas.ambiente = {
      data: [{ id: "a" }, { id: "b" }, { id: "c" }],
      error: null,
    };

    const resultado = await reordenarAmbientes("orcamento-1", ["c", "a"]); // omite "b"

    expect(resultado.ok).toBe(false);
    const updatesDeOrdem = supabaseMock.atualizacoes.filter((u) => u.tabela === "ambiente" && "ordem" in u.valores);
    expect(updatesDeOrdem).toEqual([]);
  });
});

// Achado 3 (correção QA, tentativa 1) — `alturasOverride` grava substituição
// total do jsonb (Modelo-de-Dominio.md 3.2.1: "voltar ao herdado" = apagar a
// chave, só possível com substituição total). Teste de regressão: a segunda
// chamada com um subconjunto de chaves não deve carregar chaves da primeira.
describe("atualizarParede — Achado 3 (alturas_override é substituição total, não merge)", () => {
  it("segunda chamada com subconjunto de chaves sobrescreve o valor anterior da coluna por completo", async () => {
    supabaseMock.respostas.perfil = { data: { organizacao_id: "org-a" }, error: null };
    supabaseMock.respostas.parede = { data: { id: "parede-1" }, error: null };

    await atualizarParede("parede-1", { alturasOverride: { peDireito: 2700, alturaBancada: 900 } });
    await atualizarParede("parede-1", { alturasOverride: { peDireito: 2500 } });

    const updatesDeParede = supabaseMock.atualizacoes.filter(
      (u) => u.tabela === "parede" && "alturas_override" in u.valores
    );
    expect(updatesDeParede.at(-1)?.valores.alturas_override).toEqual({ peDireito: 2500 });
  });
});
