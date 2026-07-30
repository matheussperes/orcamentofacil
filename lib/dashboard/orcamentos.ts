import { createClient } from "@/lib/supabase/server";

// Task 13.3b (contrato .maestro/tmp/13.3b-contract.md, "Parte A") — leitura
// server-side dos orçamentos da organização para o Dashboard. É só um
// `.select()` via `lib/supabase/server.ts` (RLS de `orcamento` já escopa por
// `organizacao_id` — supabase/migrations/20260727090300_orcamento.sql), sem
// migration/schema novo. Fetch e render ficam separados de propósito: este
// módulo só busca dados; `components/dashboard/DashboardView.tsx` é
// presentational puro (recebe `DadosDashboard` como prop, sem saber de
// Supabase) — o harness `/dev/preview` usa o mesmo presentational com dados
// fabricados.

export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado";

export interface OrcamentoDashboardRow {
  id: string;
  status: StatusOrcamento;
  prazoEntrega: string | null;
  criadoEm: string;
  /** `orcamento` não tem coluna de título — o rótulo da linha é o nome do
   * cliente (`cliente.nome`), decisão do contrato desta task. */
  clienteNome: string;
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

/** Busca os orçamentos da organização atual (RLS escopa) + contagem por
 * status, para o Dashboard `/`. Nunca lança: em erro de leitura, devolve
 * listas vazias — o Server Component chamador decide como sinalizar (ver
 * `app/(app)/page.tsx`). */
export async function buscarDadosDashboard(): Promise<DadosDashboard> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orcamento")
    .select("id,status,prazo_entrega,criado_em,cliente(nome)")
    .order("atualizado_em", { ascending: false });

  if (error) {
    console.error("[dashboard] falha ao buscar orçamentos:", error.message);
    return { orcamentos: [], contagemPorStatus: { ...CONTAGEM_VAZIA } };
  }

  const orcamentos: OrcamentoDashboardRow[] = (data ?? []).map((row) => ({
    id: row.id as string,
    status: row.status as StatusOrcamento,
    prazoEntrega: (row.prazo_entrega as string | null) ?? null,
    criadoEm: row.criado_em as string,
    clienteNome: nomeDoCliente(row.cliente as ClienteAninhado),
  }));

  const contagemPorStatus: ContagemPorStatus = { ...CONTAGEM_VAZIA };
  for (const o of orcamentos) {
    contagemPorStatus[o.status] = (contagemPorStatus[o.status] ?? 0) + 1;
  }

  return { orcamentos, contagemPorStatus };
}
