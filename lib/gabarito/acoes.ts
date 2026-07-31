"use server";

import { createClient } from "@/lib/supabase/server";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — Server Action de
// `/biblioteca`: excluir um gabarito PRÓPRIO da organização. RLS-safe por
// construção, mesmo padrão de `lib/produto/acoes.ts`.
//
// `gabarito_delete_propria_org` (supabase/migrations/20260727090200_gabarito.sql)
// já bloqueia excluir uma linha global (`organizacao_id null` nunca satisfaz
// `organizacao_id = org_do_usuario()`) — o `DELETE` de uma linha global
// simplesmente afeta zero linhas (sem lançar erro do Postgres). O `.select("id")`
// abaixo detecta esse caso (e "id não existe mais") pra devolver uma mensagem
// explícita em vez de reportar sucesso silencioso. A UI de `/biblioteca` já
// esconde a ação de excluir para linhas globais (Design-System.md Seção 11:
// "não deixe o usuário nem tentar") — este retorno é defesa em profundidade,
// não o caminho esperado.
export async function excluirGabarito(id: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { data, error } = await supabase.from("gabarito").delete().eq("id", id).select("id");

  if (error) {
    console.error("[gabarito] falha ao excluir gabarito:", error.message);
    return { ok: false, erro: "Não foi possível excluir este módulo. Tente novamente." };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      erro: "Não foi possível excluir este módulo — ele é da base global (somente leitura) ou já foi removido.",
    };
  }

  return { ok: true };
}
