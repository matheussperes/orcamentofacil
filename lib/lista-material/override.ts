"use server";

import { createClient } from "@/lib/supabase/server";

// Task 3.8 (back) — persistência do override de quantidade por item da
// lista de material, pré-congelamento (RF-15). `itemChave` é o
// `LinhaInsumo.item` (lib/insumos.ts) — texto determinístico e estável para
// a mesma config, escopado por `orcamentoId`. Só a quantidade é editável;
// categoria, descrição e valor unitário nunca são persistidos aqui, sempre
// vêm do cálculo ao vivo.
//
// Checklist de posse de ID (.maestro/proposals/2026-08-08-checklist-posse-
// id-client-server-action.md): antes de qualquer escrita, confirma que
// `orcamentoId` pertence à organização do usuário autenticado — mesmo
// padrão de `lib/orcamento/reabrir.ts`. Escrita/remoção rejeitada se o
// orçamento já estiver congelado (overrides não fazem sentido em snapshot
// imutável); overrides não são limpos ao congelar/reabrir, ficam dormentes.

export interface ResultadoOverride {
  ok: boolean;
  erro?: string;
  codigo?: string;
}

async function resolverOrcamentoDaPropriaOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orcamentoId: string
): Promise<{ organizacaoId: string; congeladoEm: string | null } | { erro: ResultadoOverride }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: { ok: false, erro: "Sua sessão expirou. Faça login novamente." } };
  }

  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfil")
    .select("organizacao_id")
    .eq("id", user.id)
    .maybeSingle();

  if (erroPerfil || !perfil) {
    console.error("[lista-material/override] falha ao buscar perfil do usuário:", erroPerfil?.message);
    return { erro: { ok: false, erro: "Não foi possível identificar sua organização. Tente novamente." } };
  }

  const organizacaoId = perfil.organizacao_id as string;

  // Posse: confirma que o orçamento existe E é desta organização antes de
  // ler `congelado_em` e antes de qualquer escrita.
  const { data: orcamento, error: erroOrcamento } = await supabase
    .from("orcamento")
    .select("id, congelado_em")
    .eq("id", orcamentoId)
    .eq("organizacao_id", organizacaoId)
    .maybeSingle();

  if (erroOrcamento || !orcamento) {
    console.error("[lista-material/override] falha ao localizar orçamento:", erroOrcamento?.message);
    return { erro: { ok: false, erro: "Este orçamento não existe mais." } };
  }

  return { organizacaoId, congeladoEm: orcamento.congelado_em as string | null };
}

export async function definirOverrideQuantidade(
  orcamentoId: string,
  itemChave: string,
  quantidade: number
): Promise<ResultadoOverride> {
  if (!Number.isFinite(quantidade) || quantidade < 0) {
    return { ok: false, erro: "A quantidade precisa ser um número válido e não negativo.", codigo: "QUANTIDADE_INVALIDA" };
  }

  const supabase = await createClient();
  const resolvido = await resolverOrcamentoDaPropriaOrg(supabase, orcamentoId);
  if ("erro" in resolvido) return resolvido.erro;

  if (resolvido.congeladoEm !== null) {
    return {
      ok: false,
      erro: "Este orçamento está congelado — reabra-o para editar a lista de material.",
      codigo: "ORCAMENTO_CONGELADO",
    };
  }

  const { error: erroUpsert } = await supabase
    .from("lista_material_override")
    .upsert(
      {
        organizacao_id: resolvido.organizacaoId,
        orcamento_id: orcamentoId,
        item_chave: itemChave,
        quantidade,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "orcamento_id,item_chave" }
    );

  if (erroUpsert) {
    console.error("[lista-material/override] falha ao gravar override:", erroUpsert.message);
    return { ok: false, erro: "Não foi possível salvar a quantidade editada." };
  }

  return { ok: true };
}

export async function removerOverrideQuantidade(
  orcamentoId: string,
  itemChave: string
): Promise<ResultadoOverride> {
  const supabase = await createClient();
  const resolvido = await resolverOrcamentoDaPropriaOrg(supabase, orcamentoId);
  if ("erro" in resolvido) return resolvido.erro;

  if (resolvido.congeladoEm !== null) {
    return {
      ok: false,
      erro: "Este orçamento está congelado — reabra-o para editar a lista de material.",
      codigo: "ORCAMENTO_CONGELADO",
    };
  }

  const { error: erroDelete } = await supabase
    .from("lista_material_override")
    .delete()
    .eq("orcamento_id", orcamentoId)
    .eq("item_chave", itemChave)
    .eq("organizacao_id", resolvido.organizacaoId);

  if (erroDelete) {
    console.error("[lista-material/override] falha ao remover override:", erroDelete.message);
    return { ok: false, erro: "Não foi possível remover a quantidade editada." };
  }

  return { ok: true };
}

export interface OverrideQuantidade {
  itemChave: string;
  quantidade: number;
}

/** Overrides ativos de um orçamento, para a Task 3.8 (front) mesclar sobre
 * `LinhaInsumo[]`. Não valida posse explicitamente — a RLS já escopa a
 * leitura por organização (mesmo padrão de `salvarItemOrcamento`); um
 * `orcamentoId` de outra organização simplesmente devolve lista vazia. */
export async function listarOverridesQuantidade(orcamentoId: string): Promise<OverrideQuantidade[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lista_material_override")
    .select("item_chave, quantidade")
    .eq("orcamento_id", orcamentoId);

  if (error || !data) {
    console.error("[lista-material/override] falha ao listar overrides:", error?.message);
    return [];
  }

  return data.map((row) => ({ itemChave: row.item_chave as string, quantidade: row.quantidade as number }));
}
