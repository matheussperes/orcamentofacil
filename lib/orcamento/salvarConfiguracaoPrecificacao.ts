"use server";

import { createClient } from "@/lib/supabase/server";
import type { ModoMontagem, ModoPrecificacao } from "@/lib/engine/precificacao";

// Task 13.5 (contrato .maestro/tmp/13.5-contract.md) — Server Action que
// atualiza `orcamento.modo_precificacao`/`modo_montagem`/`frete`. Mesmo
// padrão de `lib/orcamento/salvarItem.ts` (Task 13.3e): não busca
// `perfil.organizacao_id` porque não está setando `organizacao_id` no
// payload — a policy `orcamento_update_propria_org`
// (supabase/migrations/20260727090300_orcamento.sql) já escopa a escrita
// pela própria RLS da tabela.
//
// `precificacao`/`montagem` chegam `null` quando o usuário optou por "usar o
// padrão da organização" nesta task (ver `FinanceiroLab.tsx`) — grava `null`
// de volta, que é exatamente o contrato já documentado da coluna ("null =
// usa o da org").
export interface ResultadoSalvarConfiguracao {
  ok: boolean;
  erro?: string;
}

export async function salvarConfiguracaoPrecificacao(
  orcamentoId: string,
  precificacao: ModoPrecificacao | null,
  montagem: ModoMontagem | null,
  frete: number
): Promise<ResultadoSalvarConfiguracao> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { error } = await supabase
    .from("orcamento")
    .update({
      modo_precificacao: precificacao,
      modo_montagem: montagem,
      frete,
    })
    .eq("id", orcamentoId);

  if (error) {
    console.error("[orcamento] falha ao salvar configuração de precificação:", error.message);
    return { ok: false, erro: "Não foi possível salvar a configuração financeira." };
  }

  return { ok: true };
}
