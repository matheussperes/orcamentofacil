import { createClient } from "@/lib/supabase/client";
import { COLUNAS_GABARITO, gabaritoRowDeLinha, type GabaritoRow } from "./tipos";
import type { BoxModule } from "@/lib/engine/box/types";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — criação CLIENT-SIDE
// de um gabarito NOVO (sem `?preset=` na URL) — substitui
// `lib/boxPresets.ts::salvarPreset` (localStorage). Sempre nasce na PRÓPRIA
// org (`origem_gabarito_id: null` — não é fork de nada).
//
// `organizacao_id` lido do `perfil` do usuário autenticado, nunca confiado a
// partir do client (mesmo padrão de `lib/produto/acoes.ts::criarProduto`,
// só que aqui client-side porque `/modulo` não tem Server Component pai que
// já resolva isso — ver `lib/gabarito/buscar.ts`).
export interface ResultadoGabarito {
  ok: boolean;
  erro?: string;
  gabarito?: GabaritoRow;
}

export async function criarGabarito(
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

  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfil")
    .select("organizacao_id")
    .eq("id", user.id)
    .maybeSingle();

  if (erroPerfil || !perfil) {
    console.error("[gabarito] falha ao buscar organizacao_id do perfil:", erroPerfil?.message);
    return { ok: false, erro: "Não foi possível identificar sua organização. Tente novamente." };
  }

  const { data, error } = await supabase
    .from("gabarito")
    .insert({
      organizacao_id: perfil.organizacao_id as string,
      origem_gabarito_id: null,
      nome: nome.trim() || "Módulo",
      categoria: categoria.trim() || "Cozinha",
      definicao,
    })
    .select(COLUNAS_GABARITO)
    .single();

  if (error || !data) {
    console.error("[gabarito] falha ao criar gabarito:", error?.message);
    return { ok: false, erro: "Não foi possível salvar este módulo. Tente novamente." };
  }

  return { ok: true, gabarito: gabaritoRowDeLinha(data as Record<string, unknown>) };
}
