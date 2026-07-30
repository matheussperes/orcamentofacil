import { createClient } from "@/lib/supabase/server";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — leitura server-side,
// só de METADADO (não o snapshot inteiro), da última lista de material
// congelada de um orçamento. Usado por `app/(app)/orcamento/[id]/page.tsx`
// para satisfazer o critério "recarregar a página não perde a intenção":
// mostra "última lista congelada em <data>" mesmo depois de um reload, sem
// depender de estado de UI/localStorage. RLS de `lista_material` já escopa
// por organização (mesmo padrão de `buscarOrcamentoPorId`) — não repetimos
// esse filtro aqui.
export async function buscarUltimaListaMaterial(orcamentoId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("lista_material")
    .select("criado_em")
    .eq("orcamento_id", orcamentoId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.criado_em as string | undefined) ?? null;
}
