import { createClient } from "@/lib/supabase/client";
import { COLUNAS_GABARITO, gabaritoRowDeLinha, type GabaritoRow } from "./tipos";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — leitura CLIENT-SIDE
// (`lib/supabase/client.ts`) de UM gabarito por id, usada por `/modulo`
// (`app/modulo/page.tsx`) ao ler `?preset=<id>` da URL — client-side porque
// `/modulo` é `"use client"` sem Server Component pai que já busque isso
// (mesmo espírito de `lib/produto/buscar.ts::buscarCatalogoReal`, Task
// 13.7b). Substitui `lib/boxPresets.ts::buscarPreset` (localStorage).
//
// RLS (`gabarito_select_global_ou_propria_org`) já garante que só um
// gabarito visível (global ou da própria org) é retornado — um id de outra
// organização cai no mesmo `null` de "não encontrado", sem distinção (mesmo
// comportamento de antes: preset inexistente = cai no fluxo de "novo").
export async function buscarGabaritoPorId(id: string): Promise<GabaritoRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gabarito")
    .select(COLUNAS_GABARITO)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[gabarito] falha ao buscar gabarito por id:", error.message);
    return null;
  }

  return gabaritoRowDeLinha(data as Record<string, unknown>);
}
