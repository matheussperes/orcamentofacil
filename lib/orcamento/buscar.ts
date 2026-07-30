import { createClient } from "@/lib/supabase/server";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — leitura server-side
// de um orçamento por id para `/orcamento/[id]`. Mesmo espírito de
// `lib/dashboard/orcamentos.ts` (Task 13.3b): busca separada do render, RLS
// de `orcamento` (supabase/migrations/20260727090300_orcamento.sql) escopa
// por organizacao_id — não precisamos repetir esse filtro aqui.

export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado";

export interface OrcamentoDetalhe {
  id: string;
  status: StatusOrcamento;
  prazoEntrega: string | null;
  /** `orcamento` não tem coluna de título — mesma regra da 13.3b (Dashboard):
   * o rótulo é o nome do cliente. */
  clienteNome: string;
}

type ClienteAninhado = { nome: string | null } | { nome: string | null }[] | null;

function nomeDoCliente(cliente: ClienteAninhado): string {
  if (!cliente) return "Cliente sem nome";
  const c = Array.isArray(cliente) ? cliente[0] : cliente;
  const nome = c?.nome?.trim();
  return nome && nome.length > 0 ? nome : "Cliente sem nome";
}

/**
 * Busca um orçamento por id, escopado à organização do usuário atual via
 * RLS. Devolve `null` tanto quando o id não existe quanto quando existe mas
 * pertence a outra organização — a RLS já filtra antes de chegar aqui, então
 * os dois casos são indistinguíveis para quem chama, o que é o
 * comportamento certo (evita vazar "existe mas não é seu" via
 * timing/mensagem): a página (`app/(app)/orcamento/[id]/page.tsx`) trata
 * `null` como 404 (`notFound()`) nos dois casos igualmente.
 */
export async function buscarOrcamentoPorId(id: string): Promise<OrcamentoDetalhe | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orcamento")
    .select("id, status, prazo_entrega, cliente(nome)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id as string,
    status: data.status as StatusOrcamento,
    prazoEntrega: (data.prazo_entrega as string | null) ?? null,
    clienteNome: nomeDoCliente(data.cliente as ClienteAninhado),
  };
}
