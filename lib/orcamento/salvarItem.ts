"use server";

import { createClient } from "@/lib/supabase/server";
import { modulosDeJson } from "@/lib/ambiente/mapear";
import { idDoItem, type ModuloOrcamento } from "@/lib/orcamento";

// Task 13.3e (contrato .maestro/tmp/13.3e-contract.md) — Server Action que
// salva UM item (`ModuloOrcamento`) dentro de `orcamento.itens` (jsonb
// `ModuloOrcamento[]`, já gravado desde a Task 13.3d): lê o array inteiro,
// substitui a entrada daquele `itemId` pelo módulo atualizado, grava de
// volta. Mesmo formato de resultado de `lib/ambiente/salvar.ts`
// (`ResultadoSalvarAmbiente`) — aqui com um nome próprio
// (`ResultadoSalvarItem`, espelhando o de `app/modulo/EditorItemNucleo.tsx`)
// porque semanticamente é "salvar um item", não "salvar o estado inteiro de
// Ambientes".
//
// RLS-safe por construção: a única coluna escrita é `orcamento.itens`, nunca
// `organizacao_id` — a policy `orcamento_update_propria_org`
// (supabase/migrations/20260727090300_orcamento.sql) já escopa TANTO a
// leitura quanto a escrita por `org_do_usuario()`; um `orcamentoId` de outra
// organização simplesmente não aparece na leitura abaixo (mesmo
// comportamento de `buscarOrcamentoPorId`/`buscarItemDoOrcamento`) e a
// escrita seria bloqueada de qualquer forma. Por isso, ao contrário de
// `salvarEstadoAmbiente` (que precisa de `organizacao_id` pra criar linhas em
// `ambiente`/`parede`/`elemento_continuo`), esta ação não busca
// `perfil.organizacao_id` — não há nenhum valor de organização para
// confiar/desconfiar do client aqui, o gate é inteiramente a RLS da própria
// tabela `orcamento`.
export async function salvarItemOrcamento(
  orcamentoId: string,
  itemId: string,
  modulo: ModuloOrcamento
): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { data: orcamentoRow, error: erroBuscar } = await supabase
    .from("orcamento")
    .select("itens")
    .eq("id", orcamentoId)
    .maybeSingle();

  if (erroBuscar || !orcamentoRow) {
    console.error("[orcamento] falha ao carregar itens para salvar item:", erroBuscar?.message);
    return { ok: false, erro: "Não foi possível carregar os itens do orçamento." };
  }

  const itens = modulosDeJson(orcamentoRow.itens ?? null);
  const indice = itens.findIndex((m) => idDoItem(m) === itemId);

  if (indice === -1) {
    return { ok: false, erro: "Este item não existe mais neste orçamento." };
  }

  const novosItens = [...itens];
  novosItens[indice] = modulo;

  const { error: erroUpdate } = await supabase
    .from("orcamento")
    .update({ itens: novosItens })
    .eq("id", orcamentoId);

  if (erroUpdate) {
    console.error("[orcamento] falha ao salvar item do orçamento:", erroUpdate.message);
    return { ok: false, erro: "Não foi possível salvar as alterações deste item." };
  }

  return { ok: true };
}
