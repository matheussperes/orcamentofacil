import { createClient } from "@/lib/supabase/server";
import type { EtapaEsteira } from "@/lib/orcamento/etapa-esteira";
import { carregarEstadoAmbiente } from "@/lib/ambiente/carregar";
import { calcularEngineOrcamento } from "@/lib/ambiente/calcularEngineOrcamento";
import { carregarConfiguracaoPrecificacao } from "@/lib/precificacao/carregarConfiguracao";
import { catalogoParaPrecos } from "@/lib/catalog";
import { buscarCatalogoRealServer } from "@/lib/produto/buscarServer";
import { ratearPrecificacao } from "@/lib/engine/precificacao";

// Task 13.3b (contrato .maestro/tmp/13.3b-contract.md, "Parte A") — leitura
// server-side dos orçamentos da organização para o Dashboard. É só um
// `.select()` via `lib/supabase/server.ts` (RLS de `orcamento` já escopa por
// `organizacao_id` — supabase/migrations/20260727090300_orcamento.sql), sem
// migration/schema novo. Fetch e render ficam separados de propósito: este
// módulo só busca dados; `components/dashboard/DashboardView.tsx` é
// presentational puro (recebe `DadosDashboard` como prop, sem saber de
// Supabase) — o harness `/dev/preview` usa o mesmo presentational com dados
// fabricados.
//
// Task 5.7-5.9 (contrato .maestro/state/contracts/5.7-5.9.md) — "Valor
// final"/"Custo" substituem "Prazo de entrega" na tabela: mirror server-side
// do pipeline de `components/orcamento/FinanceiroLab.tsx` (linhas 101–135),
// um resumo financeiro derivado AO VIVO por orçamento (nunca persistido).
// Simplificação deliberada autorizada pelo contrato: mesmo orçamento
// congelado usa o cálculo ao vivo aqui (não soma `linhaProposta.valorRateado`
// persistido) — o Dashboard é visão geral, a fonte de verdade congelada
// continua sendo exclusivamente a aba Proposta/PDF, não tocada por esta
// task. ponytail: se essa divergência incomodar (catálogo/kerf mudam após o
// congelamento), upgrade é somar `linhaProposta.valorRateado` quando
// `congeladoEm !== null` — não implementado agora, YAGNI.

export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado";

export interface OrcamentoDashboardRow {
  id: string;
  status: StatusOrcamento;
  /** Task 5.10-front (Modelo-de-Dominio.md §7.2) — etapa de esteira, insumo
   * de `rotuloDoCard` junto com `status` para decidir o badge do card. */
  etapaEsteira: EtapaEsteira;
  criadoEm: string;
  /** `orcamento` não tem coluna de título — o rótulo da linha é o nome do
   * cliente (`cliente.nome`), decisão do contrato desta task. */
  clienteNome: string;
  /** `resumo.precoFinal` (Modelo-de-Domínio Seção 5.5) — `null` quando o
   * orçamento ainda não tem ambientes/itens (engine `!ok`) ou o cálculo falha. */
  valorFinal: number | null;
  /** `resumo.custoMaterial` — custo de material, não o custo total
   * (material + montagem + frete). Mesmo campo já exibido na aba Financeiro. */
  custoMaterial: number | null;
}

export type ContagemPorStatus = Record<StatusOrcamento, number>;

export interface DadosDashboard {
  orcamentos: OrcamentoDashboardRow[];
  contagemPorStatus: ContagemPorStatus;
}

const CONTAGEM_VAZIA: ContagemPorStatus = {
  rascunho: 0,
  enviado: 0,
  aprovado: 0,
  recusado: 0,
};

// A relação `orcamento.cliente_id -> cliente.id` é muitos-para-um a partir de
// `orcamento`, então o PostgREST normalmente resolve `cliente(nome)` como
// objeto único — mas a tipagem do client sem `generate_typescript_types`
// (fora de escopo deste papel) não garante isso estaticamente, então
// tratamos os dois formatos possíveis (objeto ou array de 1) por segurança.
type ClienteAninhado = { nome: string | null } | { nome: string | null }[] | null;

function nomeDoCliente(cliente: ClienteAninhado): string {
  if (!cliente) return "Cliente sem nome";
  const c = Array.isArray(cliente) ? cliente[0] : cliente;
  const nome = c?.nome?.trim();
  return nome && nome.length > 0 ? nome : "Cliente sem nome";
}

/** Calcula `valorFinal`/`custoMaterial` de um orçamento, mirror server-side
 * do pipeline de `FinanceiroLab.tsx` (linhas 101–135): estado de Ambientes →
 * engine → grupo único → `ratearPrecificacao`. `null`/`null` quando o
 * orçamento ainda não tem ambientes/itens (engine `!ok`) ou qualquer etapa
 * falha — isolado por `try/catch` para não derrubar os demais itens da
 * lista (contrato 5.7-5.9). */
async function calcularResumoDoOrcamento(
  orcamentoId: string,
  precos: ReturnType<typeof catalogoParaPrecos>
): Promise<{ valorFinal: number | null; custoMaterial: number | null }> {
  try {
    const estado = await carregarEstadoAmbiente(orcamentoId);
    const resultadoEngine = calcularEngineOrcamento(estado);
    if (!resultadoEngine.ok) {
      return { valorFinal: null, custoMaterial: null };
    }

    const configuracao = await carregarConfiguracaoPrecificacao(orcamentoId);
    const grupoUnico = [
      { id: "orcamento-inteiro", itemIds: resultadoEngine.engine.porModulo.map((m) => m.moduloId) },
    ];
    const snapshot = ratearPrecificacao(resultadoEngine.engine, grupoUnico, configuracao.config, precos);

    return { valorFinal: snapshot.resumo.precoFinal, custoMaterial: snapshot.resumo.custoMaterial };
  } catch (erro) {
    console.error(`[dashboard] falha ao calcular resumo financeiro do orçamento ${orcamentoId}:`, erro);
    return { valorFinal: null, custoMaterial: null };
  }
}

/** Busca os orçamentos da organização atual (RLS escopa) + contagem por
 * status, para o Dashboard `/`. Nunca lança: em erro de leitura, devolve
 * listas vazias — o Server Component chamador decide como sinalizar (ver
 * `app/(app)/page.tsx`). */
export async function buscarDadosDashboard(): Promise<DadosDashboard> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orcamento")
    .select("id,status,etapa_esteira,criado_em,cliente(nome)")
    .order("atualizado_em", { ascending: false });

  if (error) {
    console.error("[dashboard] falha ao buscar orçamentos:", error.message);
    return { orcamentos: [], contagemPorStatus: { ...CONTAGEM_VAZIA } };
  }

  // Catálogo buscado uma única vez por chamada — é o mesmo para todos os
  // orçamentos da organização (RLS já escopa), buscar de novo por linha
  // seria N+1 evitável (contrato 5.7-5.9).
  const catalogo = await buscarCatalogoRealServer();
  const precos = catalogoParaPrecos(catalogo);

  const orcamentos: OrcamentoDashboardRow[] = await Promise.all(
    (data ?? []).map(async (row) => {
      const id = row.id as string;
      const { valorFinal, custoMaterial } = await calcularResumoDoOrcamento(id, precos);
      return {
        id,
        status: row.status as StatusOrcamento,
        etapaEsteira: row.etapa_esteira as EtapaEsteira,
        criadoEm: row.criado_em as string,
        clienteNome: nomeDoCliente(row.cliente as ClienteAninhado),
        valorFinal,
        custoMaterial,
      };
    })
  );

  const contagemPorStatus: ContagemPorStatus = { ...CONTAGEM_VAZIA };
  for (const o of orcamentos) {
    contagemPorStatus[o.status] = (contagemPorStatus[o.status] ?? 0) + 1;
  }

  return { orcamentos, contagemPorStatus };
}
