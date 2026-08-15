// Task 5.7-5.9 (contrato .maestro/state/contracts/5.7-5.9.md) — cobre o
// pipeline de "Valor final"/"Custo" por orçamento em `buscarDadosDashboard`:
// engine `ok` → valores numéricos; engine `!ok` (sem ambientes/itens) →
// `null`/`null`; falha isolada de UM orçamento não derruba os demais da
// lista. Mesmo estilo de mock local de `@/lib/supabase/server` já usado em
// `lib/cliente/acoes.test.ts` — os demais módulos do pipeline
// (`carregarEstadoAmbiente`, `calcularEngineOrcamento`,
// `carregarConfiguracaoPrecificacao`, `buscarCatalogoRealServer`,
// `ratearPrecificacao`) são mockados diretamente, porque a lógica interna
// deles já tem cobertura própria — aqui só o WIRING (ordem de chamadas,
// isolamento de falha, catálogo buscado 1x) é o que importa.
import { afterEach, describe, expect, it, vi } from "vitest";

const orcamentosRow = vi.hoisted(() => ({ valor: [] as unknown[] }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        order: async () => ({ data: orcamentosRow.valor, error: null }),
      }),
    }),
  }),
}));

const estadoPorOrcamento = vi.hoisted(() => new Map<string, unknown>());
vi.mock("@/lib/ambiente/carregar", () => ({
  carregarEstadoAmbiente: async (id: string) => {
    const marcado = estadoPorOrcamento.get(id);
    if (marcado === "throw") throw new Error("falha ao carregar estado");
    return marcado ?? {};
  },
}));

vi.mock("@/lib/ambiente/calcularEngineOrcamento", () => ({
  calcularEngineOrcamento: (estado: unknown) =>
    estado === "sem-itens" ? { ok: false } : { ok: true, engine: { porModulo: [] } },
}));

vi.mock("@/lib/precificacao/carregarConfiguracao", () => ({
  carregarConfiguracaoPrecificacao: async () => ({
    config: { precificacao: null, montagem: null, freteTotal: 0 },
  }),
}));

vi.mock("@/lib/produto/buscarServer", () => ({
  buscarCatalogoRealServer: vi.fn(async () => ({ fake: "catalogo" })),
}));

vi.mock("@/lib/catalog", () => ({
  catalogoParaPrecos: () => ({ fake: "precos" }),
}));

vi.mock("@/lib/engine/precificacao", () => ({
  ratearPrecificacao: () => ({ resumo: { precoFinal: 1000, custoMaterial: 400 } }),
}));

import { buscarDadosDashboard } from "./orcamentos";
import { buscarCatalogoRealServer } from "@/lib/produto/buscarServer";

afterEach(() => {
  vi.clearAllMocks();
  orcamentosRow.valor = [];
  estadoPorOrcamento.clear();
});

describe("buscarDadosDashboard — valor final e custo", () => {
  it("engine ok: valorFinal/custoMaterial numéricos, vindos do resumo financeiro", async () => {
    orcamentosRow.valor = [
      { id: "orc-1", status: "rascunho", criado_em: "2026-01-01T00:00:00.000Z", cliente: { nome: "Cliente A" } },
    ];
    estadoPorOrcamento.set("orc-1", "com-itens");

    const dados = await buscarDadosDashboard();

    expect(dados.orcamentos).toHaveLength(1);
    expect(dados.orcamentos[0].valorFinal).toBe(1000);
    expect(dados.orcamentos[0].custoMaterial).toBe(400);
  });

  it("engine !ok (sem ambientes/itens): valorFinal/custoMaterial null, sem erro", async () => {
    orcamentosRow.valor = [
      { id: "orc-2", status: "rascunho", criado_em: "2026-01-01T00:00:00.000Z", cliente: { nome: "Cliente B" } },
    ];
    estadoPorOrcamento.set("orc-2", "sem-itens");

    const dados = await buscarDadosDashboard();

    expect(dados.orcamentos[0].valorFinal).toBeNull();
    expect(dados.orcamentos[0].custoMaterial).toBeNull();
  });

  it("falha isolada: erro ao calcular UM orçamento não derruba os demais da lista", async () => {
    orcamentosRow.valor = [
      { id: "orc-falha", status: "rascunho", criado_em: "2026-01-01T00:00:00.000Z", cliente: { nome: "Cliente Falha" } },
      { id: "orc-ok", status: "aprovado", criado_em: "2026-01-02T00:00:00.000Z", cliente: { nome: "Cliente Ok" } },
    ];
    estadoPorOrcamento.set("orc-falha", "throw");
    estadoPorOrcamento.set("orc-ok", "com-itens");

    const dados = await buscarDadosDashboard();

    expect(dados.orcamentos).toHaveLength(2);
    const falha = dados.orcamentos.find((o) => o.id === "orc-falha");
    const ok = dados.orcamentos.find((o) => o.id === "orc-ok");
    expect(falha?.valorFinal).toBeNull();
    expect(falha?.custoMaterial).toBeNull();
    expect(ok?.valorFinal).toBe(1000);
    expect(ok?.custoMaterial).toBe(400);
  });

  it("catálogo buscado uma única vez por chamada, não uma vez por orçamento", async () => {
    orcamentosRow.valor = [
      { id: "orc-1", status: "rascunho", criado_em: "2026-01-01T00:00:00.000Z", cliente: { nome: "A" } },
      { id: "orc-2", status: "rascunho", criado_em: "2026-01-01T00:00:00.000Z", cliente: { nome: "B" } },
      { id: "orc-3", status: "rascunho", criado_em: "2026-01-01T00:00:00.000Z", cliente: { nome: "C" } },
    ];
    estadoPorOrcamento.set("orc-1", "com-itens");
    estadoPorOrcamento.set("orc-2", "com-itens");
    estadoPorOrcamento.set("orc-3", "com-itens");

    await buscarDadosDashboard();

    expect(buscarCatalogoRealServer).toHaveBeenCalledTimes(1);
  });
});
