import { createClient } from "@/lib/supabase/server";
import { COLUNAS_GABARITO, gabaritoRowDeLinha, type GabaritoRow } from "./tipos";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — leitura SERVER-SIDE
// pra `/biblioteca` (mesmo espírito de `lib/produto/listar.ts`, Task 13.7b).
// Sem filtro de `organizacao_id` no `select`: a RLS
// (`gabarito_select_global_ou_propria_org`, `supabase/migrations/
// 20260727090200_gabarito.sql`) já devolve global (`organizacao_id null`) +
// própria org — nunca gabarito de outra organização.
//
// `erro: true` distingue "consulta falhou de verdade" (estado ERRO,
// Design-System.md Seção 8) de "consulta funcionou e não achou nada" (estado
// VAZIO — não deveria acontecer em produção depois da migration de seed desta
// mesma task, mas é tecnicamente possível numa organização cujo filtro de
// categoria não bate com nenhum gabarito).
export interface GabaritosListados {
  gabaritos: GabaritoRow[];
  erro: boolean;
}

export async function listarGabaritos(): Promise<GabaritosListados> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { gabaritos: [], erro: true };
  }

  const { data, error } = await supabase
    .from("gabarito")
    .select(COLUNAS_GABARITO)
    .order("categoria", { ascending: true })
    .order("nome", { ascending: true });

  if (error || !data) {
    console.error("[gabarito] falha ao listar gabaritos da biblioteca:", error?.message);
    return { gabaritos: [], erro: true };
  }

  return {
    gabaritos: data.map((linha) => gabaritoRowDeLinha(linha as Record<string, unknown>)),
    erro: false,
  };
}
