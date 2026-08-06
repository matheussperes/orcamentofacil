import { createClient } from "@/lib/supabase/server";
import {
  COLUNAS_ELEMENTO_PAREDE_PRESET,
  elementoParedePresetRowDeLinha,
  type ElementoParedePresetRow,
} from "./tipos";

// Task 2.12 (back) — leitura SERVER-SIDE dos presets de elemento de parede
// da própria organização (mesmo espírito de `lib/gabarito/listar.ts`). Sem
// filtro explícito de `organizacao_id` no `select`: a RLS
// (`elemento_parede_preset_select_propria_org`, `supabase/migrations/
// 20260806100000_elemento_parede_preset.sql`) já escopa por própria org.
export interface ElementoParedePresetsListados {
  presets: ElementoParedePresetRow[];
  erro: boolean;
}

export async function listarElementoParedePresets(): Promise<ElementoParedePresetsListados> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { presets: [], erro: true };
  }

  const { data, error } = await supabase
    .from("elemento_parede_preset")
    .select(COLUNAS_ELEMENTO_PAREDE_PRESET)
    .order("nome", { ascending: true });

  if (error || !data) {
    console.error(
      "[elemento-parede-preset] falha ao listar presets:",
      error?.message
    );
    return { presets: [], erro: true };
  }

  const presets = data.map((linha) =>
    elementoParedePresetRowDeLinha(linha as Record<string, unknown>)
  );

  return { presets, erro: false };
}
