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

  const gabaritos = data.map((linha) => gabaritoRowDeLinha(linha as Record<string, unknown>));

  return { gabaritos: deduplicarPromovidos(gabaritos), erro: false };
}

// Task 2.1 (dedup) — regra 6, `docs/Modelo-de-Dominio.md` Seção 7.1: quando um
// gabarito da própria org é promovido a global, a linha global nova nasce com
// `origemGabaritoId` = id do gabarito da org que a originou, e a linha da org
// permanece intocada. Sem esse filtro a org veria os dois — o original e a
// versão global promovida a partir dele. Dedup derivado, nunca persistido: a
// RLS já garante que `gabaritos` só contém globais + linhas da própria org, e
// portanto qualquer `organizacaoId` não-null aqui é necessariamente da org
// chamadora.
function deduplicarPromovidos(gabaritos: GabaritoRow[]): GabaritoRow[] {
  const idsProprios = new Set(
    gabaritos.filter((g) => g.organizacaoId !== null).map((g) => g.id),
  );

  return gabaritos.filter(
    (g) => !(g.organizacaoId === null && g.origemGabaritoId !== null && idsProprios.has(g.origemGabaritoId)),
  );
}
