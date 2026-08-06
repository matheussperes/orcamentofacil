"use server";

import { createClient } from "@/lib/supabase/server";

// Task 2.12 (back) — Server Action de exclusão de preset de elemento de
// parede. Mesmo padrão de `lib/gabarito/acoes.ts::excluirGabarito`: sem
// filtro explícito de `organizacao_id` no delete — a RLS
// (`elemento_parede_preset_delete_propria_org`) já garante que só a
// própria org é alcançável; 0 linhas afetadas = preset de outra org (nunca
// devia acontecer) ou já excluído.

export async function excluirElementoParedePreset(
  id: string
): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { data, error } = await supabase
    .from("elemento_parede_preset")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[elemento-parede-preset] falha ao excluir preset:", error.message);
    return { ok: false, erro: "Não foi possível excluir este preset. Tente novamente." };
  }

  if (!data || data.length === 0) {
    return { ok: false, erro: "Este preset já foi removido." };
  }

  return { ok: true };
}
