import { createClient } from "@/lib/supabase/client";

// Task 3.1/3.3 (front) — leitura CLIENT-SIDE (`lib/supabase/client.ts`) de
// `organizacao.espessura_serra_padrao_mm`, mesmo padrão de
// `lib/produto/buscar.ts::buscarCatalogoReal`. Usada por `EditorItemNucleo`
// (`/modulo`, inteiramente client-side, sem Server Component pai que já
// busque isso — ver contrato). RLS de `organizacao` (`organizacao_select_propria`)
// já restringe a UMA linha, a da organização do usuário autenticado — sem
// precisar resolver `organizacao_id` via `perfil` antes, mesma simplicidade
// que `buscarCatalogoReal` já aproveita para `produto`.
//
// Fallback pro default `3` (mesmo default da coluna no banco, Task
// 4.16-back) em qualquer cenário sem dado real: erro de rede/Supabase
// indisponível, RLS sem linha (sem sessão/perfil), ou coluna nula.
const ESPESSURA_SERRA_PADRAO_MM_FALLBACK = 3;

export async function buscarEspessuraSerraReal(): Promise<number> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("organizacao")
      .select("espessura_serra_padrao_mm")
      .maybeSingle();

    if (error) {
      console.error("[organizacao] falha ao buscar espessura de serra real:", error.message);
      return ESPESSURA_SERRA_PADRAO_MM_FALLBACK;
    }
    const valor = data?.espessura_serra_padrao_mm as number | null | undefined;
    return valor ?? ESPESSURA_SERRA_PADRAO_MM_FALLBACK;
  } catch (erro) {
    console.error("[organizacao] falha inesperada ao buscar espessura de serra real:", erro);
    return ESPESSURA_SERRA_PADRAO_MM_FALLBACK;
  }
}
