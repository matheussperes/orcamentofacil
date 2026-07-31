import { createClient } from "@/lib/supabase/server";
import { idDoItem } from "@/lib/orcamento";
import type { EstadoAmbiente } from "@/lib/ambiente/estado";
import { gerarDescricaoLinha } from "./descricao";
import type { LinhaProposta } from "./tipos";

// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — leitura server-side
// das Linhas de Proposta de um orçamento, para `/orcamento/[id]` (chamado a
// partir do Server Component da rota, mesmo espírito de
// `lib/ambiente/carregar.ts`/`lib/precificacao/carregarConfiguracao.ts`).
//
// Default D-17 (linha de proposta = ambiente): se o orçamento ainda não tem
// NENHUMA Linha de Proposta E já tem itens (`estadoAmbiente.modulos`), esta
// função CRIA (persiste) automaticamente uma única linha cobrindo TODOS os
// itens — "ação automática, não precisa de confirmação do usuário" (contrato).
// Decisão de arquitetura registrada aqui: a criação acontece nesta leitura
// server-side (Server Component da rota), NÃO num useEffect client-side —
// diferente do resto da esteira desta Stage (que só escreve via ação
// explícita do usuário clicando em algo), este é o único caso da Stage 13
// com escrita automática no primeiro carregamento, e o contrato pede
// explicitamente que ela independa de qualquer clique. Fazer isso aqui (uma
// leitura que também escreve, se necessário) evita um estado transitório no
// client "linha sem id real ainda" enquanto uma Server Action de criação
// estaria em voo.
//
// Nunca lança: um orçamento sem itens ainda não tem o que propor —
// devolve `linhas: []` (estado "vazio" real da aba, Design-System.md Seção 8
// já cataloga esse caso: "linhas de proposta antes de 'Adicionar linha'").
export interface LinhasPropostaCarregadas {
  /** `null` só no caso defensivo de orçamento sem organização resolvível
   * (não deveria acontecer em produção — RLS já garante organização em toda
   * leitura de `orcamento`) — usado pelo client pra montar o path de upload
   * de imagem (`lib/linha-proposta/storage.ts`). */
  organizacaoId: string | null;
  linhas: LinhaProposta[];
}

interface LinhaPropostaRow {
  id: string;
  titulo: string;
  itens: unknown;
  imagem_url: string | null;
  descricao: string | null;
  valor_rateado: number | null;
}

function linhaDeRow(row: LinhaPropostaRow): LinhaProposta {
  const itens = Array.isArray(row.itens) ? (row.itens as unknown[]).filter((v): v is string => typeof v === "string") : [];
  return {
    id: row.id,
    titulo: row.titulo,
    itens,
    imagemUrl: row.imagem_url,
    descricao: row.descricao ?? "",
    valorRateado: row.valor_rateado,
  };
}

const SELECT_LINHA = "id, titulo, itens, imagem_url, descricao, valor_rateado";

export async function carregarOuCriarLinhasProposta(
  orcamentoId: string,
  estadoAmbiente: EstadoAmbiente
): Promise<LinhasPropostaCarregadas> {
  const supabase = await createClient();

  const { data: orcamentoRow } = await supabase
    .from("orcamento")
    .select("organizacao_id")
    .eq("id", orcamentoId)
    .maybeSingle();
  const organizacaoId = (orcamentoRow?.organizacao_id as string | undefined) ?? null;

  const { data: rows, error } = await supabase
    .from("linha_proposta")
    .select(SELECT_LINHA)
    .eq("orcamento_id", orcamentoId)
    .order("criado_em", { ascending: true });

  if (error) {
    console.error("[linha-proposta] falha ao carregar linhas de proposta:", error.message);
    return { organizacaoId, linhas: [] };
  }

  if (rows && rows.length > 0) {
    return { organizacaoId, linhas: (rows as LinhaPropostaRow[]).map(linhaDeRow) };
  }

  // Nenhuma linha ainda — default D-17. Sem itens, não há o que propor.
  const itemIds = estadoAmbiente.modulos.map(idDoItem);
  if (itemIds.length === 0 || !organizacaoId) {
    return { organizacaoId, linhas: [] };
  }

  // `ambiente.nome` (hoje sempre "Ambiente 1", `lib/ambiente/salvar.ts`) —
  // título default da linha (contrato: "titulo = nome do ambiente"). Escopo
  // 1 ambiente por orçamento (mesma simplificação de `lib/ambiente/carregar.ts`
  // — só a primeira linha de `ambiente`, nunca uma lista).
  const { data: ambienteRow } = await supabase
    .from("ambiente")
    .select("nome")
    .eq("orcamento_id", orcamentoId)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  const titulo = (ambienteRow?.nome as string | undefined)?.trim() || "Ambiente 1";

  const descricao = gerarDescricaoLinha(estadoAmbiente.modulos);

  const { data: novaLinha, error: erroCriar } = await supabase
    .from("linha_proposta")
    .insert({
      organizacao_id: organizacaoId,
      orcamento_id: orcamentoId,
      titulo,
      itens: itemIds,
      descricao,
    })
    .select(SELECT_LINHA)
    .single();

  if (erroCriar || !novaLinha) {
    console.error("[linha-proposta] falha ao criar linha de proposta default:", erroCriar?.message);
    return { organizacaoId, linhas: [] };
  }

  return { organizacaoId, linhas: [linhaDeRow(novaLinha as LinhaPropostaRow)] };
}
