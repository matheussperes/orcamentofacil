import { createClient } from "@/lib/supabase/client";
import { COLUNAS_GABARITO, gabaritoRowDeLinha } from "./tipos";
import type { ResultadoGabarito } from "./criar";
import type { BoxModule } from "@/lib/engine/box/types";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — atualização
// CLIENT-SIDE de um gabarito já existente DA PRÓPRIA org — substitui
// `lib/boxPresets.ts::atualizarPreset` (localStorage). NUNCA chamado
// diretamente sobre uma linha global (`organizacao_id null`): `/modulo`
// (`app/modulo/page.tsx`) sempre faz `fork_gabarito` antes (D-15, ver
// `lib/gabarito/fork.ts`) e só então chama esta função com o id da CÓPIA
// recém-criada. `gabarito_update_propria_org` bloquearia mesmo assim (defesa
// em profundidade — não é o caminho esperado).
export async function atualizarGabarito(
  id: string,
  nome: string,
  categoria: string,
  definicao: BoxModule
): Promise<ResultadoGabarito> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { data, error } = await supabase
    .from("gabarito")
    .update({
      nome: nome.trim() || "Módulo",
      categoria: categoria.trim() || "Cozinha",
      definicao,
    })
    .eq("id", id)
    .select(COLUNAS_GABARITO)
    .single();

  if (error || !data) {
    console.error("[gabarito] falha ao atualizar gabarito:", error?.message);
    return { ok: false, erro: "Não foi possível salvar as alterações deste módulo." };
  }

  return { ok: true, gabarito: gabaritoRowDeLinha(data as Record<string, unknown>) };
}
