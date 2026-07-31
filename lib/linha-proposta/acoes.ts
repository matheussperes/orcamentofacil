"use server";

import { createClient } from "@/lib/supabase/server";
import type { LinhaProposta, PatchLinhaProposta, ResultadoLinhaProposta, ResultadoOperacaoLinhaProposta } from "./tipos";

// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — Server Actions de
// CRUD de Linha de Proposta (schema já existe por completo desde a Task
// 11.2, `supabase/migrations/20260727090600_linha_proposta.sql`, RLS
// escopada por organização). Mesmo padrão de autenticação de
// `lib/lista-material/congelar.ts`/`lib/ambiente/salvar.ts`: nunca confia em
// `organizacao_id` vindo do client — só o INSERT precisa dele (busca em
// `perfil`), UPDATE/DELETE não escrevem essa coluna, a própria RLS de
// `linha_proposta` já escopa a operação (mesmo raciocínio de
// `lib/orcamento/salvarItem.ts`).

const SELECT_LINHA = "id, titulo, itens, imagem_url, descricao, valor_rateado";

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

async function organizacaoIdDoUsuario(): Promise<{ ok: true; organizacaoId: string } | { ok: false; erro: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }
  const { data: perfil, error } = await supabase.from("perfil").select("organizacao_id").eq("id", user.id).maybeSingle();
  if (error || !perfil) {
    console.error("[linha-proposta] falha ao buscar organizacao_id do perfil:", error?.message);
    return { ok: false, erro: "Não foi possível identificar sua organização. Tente novamente." };
  }
  return { ok: true, organizacaoId: perfil.organizacao_id as string };
}

/** Cria uma nova Linha de Proposta (ex.: a "nova linha" de um split). */
export async function criarLinhaProposta(
  orcamentoId: string,
  titulo: string,
  itens: string[],
  descricao: string
): Promise<ResultadoLinhaProposta> {
  const resultadoOrg = await organizacaoIdDoUsuario();
  if (!resultadoOrg.ok) return { ok: false, erro: resultadoOrg.erro };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("linha_proposta")
    .insert({
      organizacao_id: resultadoOrg.organizacaoId,
      orcamento_id: orcamentoId,
      titulo,
      itens,
      descricao,
    })
    .select(SELECT_LINHA)
    .single();

  if (error || !data) {
    console.error("[linha-proposta] falha ao criar linha de proposta:", error?.message);
    return { ok: false, erro: "Não foi possível criar a nova linha de proposta. Tente novamente." };
  }
  return { ok: true, linha: linhaDeRow(data as LinhaPropostaRow) };
}

/** Atualiza campos parciais de uma Linha de Proposta existente. */
export async function atualizarLinhaProposta(id: string, patch: PatchLinhaProposta): Promise<ResultadoOperacaoLinhaProposta> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const payload: Record<string, unknown> = {};
  if (patch.titulo !== undefined) payload.titulo = patch.titulo;
  if (patch.descricao !== undefined) payload.descricao = patch.descricao;
  if (patch.itens !== undefined) payload.itens = patch.itens;
  if (patch.imagemUrl !== undefined) payload.imagem_url = patch.imagemUrl;
  if (patch.valorRateado !== undefined) payload.valor_rateado = patch.valorRateado;

  const { error } = await supabase.from("linha_proposta").update(payload).eq("id", id);
  if (error) {
    console.error("[linha-proposta] falha ao atualizar linha de proposta:", error.message);
    return { ok: false, erro: "Não foi possível salvar as alterações desta linha. Tente novamente." };
  }
  return { ok: true };
}

/** Remove uma Linha de Proposta (ex.: mesclar absorve os itens em outra linha e exclui esta). */
export async function excluirLinhaProposta(id: string): Promise<ResultadoOperacaoLinhaProposta> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { error } = await supabase.from("linha_proposta").delete().eq("id", id);
  if (error) {
    console.error("[linha-proposta] falha ao excluir linha de proposta:", error.message);
    return { ok: false, erro: "Não foi possível remover esta linha de proposta. Tente novamente." };
  }
  return { ok: true };
}
