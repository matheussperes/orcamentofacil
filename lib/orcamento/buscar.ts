import { createClient } from "@/lib/supabase/server";
import { modulosDeJson } from "@/lib/ambiente/mapear";
import { idDoItem, type ModuloOrcamento } from "@/lib/orcamento";

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
  /** Task 0.5b — id de `cliente`, necessário pra chamar `atualizarCliente`
   * (Task 0.5a) a partir do diálogo de edição em `/orcamento/[id]`. */
  clienteId: string;
  /** Task 0.5b — `cliente.telefone`/`cliente.endereco` (nullable), pré-
   * popula o diálogo de edição. Ausentes até então porque nada consumia. */
  clienteTelefone: string | null;
  clienteEndereco: string | null;
  /** `orcamento.frete` (Task 11.2, numeric nullable) — Task 13.4: exibido
   * (só leitura) na aba Corte & Material; editar é escopo da Task 13.5. */
  frete: number | null;
  /** `orcamento.congelado_em` (Task 0.7a, Modelo 5.4.1) — instante do último
   * congelamento da proposta; `null` = nunca congelado. Ortogonal a
   * `status`. Gravado por `lib/orcamento/congelar.ts`. */
  congeladoEm: string | null;
}

interface ClienteRow {
  id: string;
  nome: string | null;
  telefone: string | null;
  endereco: string | null;
}

type ClienteAninhado = ClienteRow | ClienteRow[] | null;

/** Task 0.5b — mesma normalização de `nomeDoCliente` (Supabase devolve o
 * relacionamento ora como objeto, ora como array de 1, dependendo da
 * versão/tipagem do client), estendida para os campos novos que o diálogo
 * de edição precisa. */
function clienteDoAninhado(cliente: ClienteAninhado): ClienteRow | null {
  if (!cliente) return null;
  return Array.isArray(cliente) ? (cliente[0] ?? null) : cliente;
}

function nomeDoCliente(cliente: ClienteAninhado): string {
  const nome = clienteDoAninhado(cliente)?.nome?.trim();
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
    .select("id, status, prazo_entrega, frete, congelado_em, cliente(id, nome, telefone, endereco)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const cliente = clienteDoAninhado(data.cliente as ClienteAninhado);

  return {
    id: data.id as string,
    status: data.status as StatusOrcamento,
    prazoEntrega: (data.prazo_entrega as string | null) ?? null,
    frete: (data.frete as number | null) ?? null,
    congeladoEm: (data.congelado_em as string | null) ?? null,
    clienteNome: nomeDoCliente(data.cliente as ClienteAninhado),
    clienteId: cliente?.id ?? "",
    clienteTelefone: cliente?.telefone ?? null,
    clienteEndereco: cliente?.endereco ?? null,
  };
}

export interface ItemDoOrcamentoEncontrado {
  orcamento: OrcamentoDetalhe;
  item: ModuloOrcamento;
}

/**
 * Task 13.3e (contrato .maestro/tmp/13.3e-contract.md) — busca um orçamento
 * E acha um item específico dentro de `orcamento.itens` (jsonb
 * `ModuloOrcamento[]`, gravado desde a Task 13.3d) pelo seu `itemId` (o
 * mesmo id que `parede.itens[].itemId` referencia pra posição — ver
 * `lib/ambiente/estado.ts`). Usado por `/orcamento/[id]/item/[itemId]`.
 *
 * Devolve `null` nos MESMOS três casos, de propósito indistinguíveis pra
 * quem chama (mesma razão de `buscarOrcamentoPorId`: evitar vazar "existe
 * mas não é seu"/"orçamento existe mas item não" via timing/mensagem) — a
 * página trata qualquer `null` como 404 (`notFound()`):
 *  - orçamento não existe;
 *  - orçamento existe mas pertence a outra organização (RLS já filtra);
 *  - orçamento existe (e é seu) mas não tem um item com esse `itemId` em
 *    `itens` (id nunca existiu, ou o item foi removido da aba Ambientes
 *    depois que o link foi copiado/aberto em outra aba).
 */
export async function buscarItemDoOrcamento(
  orcamentoId: string,
  itemId: string
): Promise<ItemDoOrcamentoEncontrado | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orcamento")
    .select(
      "id, status, prazo_entrega, frete, congelado_em, cliente(id, nome, telefone, endereco), itens"
    )
    .eq("id", orcamentoId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const itens = modulosDeJson(data.itens ?? null);
  const item = itens.find((m) => idDoItem(m) === itemId);
  if (!item) {
    return null;
  }

  const cliente = clienteDoAninhado(data.cliente as ClienteAninhado);

  return {
    orcamento: {
      id: data.id as string,
      status: data.status as StatusOrcamento,
      prazoEntrega: (data.prazo_entrega as string | null) ?? null,
      frete: (data.frete as number | null) ?? null,
      congeladoEm: (data.congelado_em as string | null) ?? null,
      clienteNome: nomeDoCliente(data.cliente as ClienteAninhado),
      clienteId: cliente?.id ?? "",
      clienteTelefone: cliente?.telefone ?? null,
      clienteEndereco: cliente?.endereco ?? null,
    },
    item,
  };
}
