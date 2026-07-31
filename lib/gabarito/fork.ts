import { createClient } from "@/lib/supabase/client";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — bifurca (fork) um
// gabarito GLOBAL numa cópia própria da organização, via RPC `fork_gabarito`
// (`supabase/migrations/20260727140100_fork_gabarito.sql`, Task 11.4,
// SECURITY INVOKER — leitura do gabarito de origem sujeita à RLS normal do
// chamador). Chamado por `/modulo` (`app/modulo/page.tsx`) na PRIMEIRA vez
// que o usuário salva uma edição sobre um gabarito global aberto no editor
// (D-15) — depois do fork, `/modulo` faz um `UPDATE` (via
// `lib/gabarito/atualizar.ts`) na linha NOVA com o `box` recém-editado
// (senão o fork sozinho perderia a diferença entre o que veio do global e o
// que o usuário acabou de mudar).
export interface ResultadoFork {
  ok: boolean;
  novoId?: string;
  erro?: string;
}

export async function forkGabarito(gabaritoId: string): Promise<ResultadoFork> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fork_gabarito", { p_gabarito_id: gabaritoId });

  if (error || !data) {
    console.error("[gabarito] falha ao criar cópia (fork) do gabarito global:", error?.message);
    return { ok: false, erro: "Não foi possível criar sua cópia deste módulo global. Tente novamente." };
  }

  return { ok: true, novoId: data as string };
}
