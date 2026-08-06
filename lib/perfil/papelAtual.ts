import { createClient } from "@/lib/supabase/server";

// Task 1.9-front (Design-System.md §7.13.1, Q-18) — lê `perfil.papel` do
// usuário logado, mesma query já usada em `lib/orcamento/reabrir.ts`
// (`select organizacao_id, papel from perfil where id = user.id`), reusada
// aqui em vez de duplicada com nome diferente. NÃO reaproveita
// `lib/perfil/carregar.ts::carregarPerfilOrganizacao` porque ela não
// seleciona `papel` e serve a tela `/perfil` (escopo diferente).
//
// `null` quando não há sessão ou o perfil não pôde ser lido — a tela trata
// como "não é admin" (nunca mostra o botão "Reabrir orçamento"), a mesma
// decisão defensiva de `carregarPerfilOrganizacao`. A checagem real de
// autorização continua na Server Action `reabrirOrcamento` (I6a) — esta
// leitura só decide se o botão aparece.
export async function papelAtual(): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: perfil } = await supabase
    .from("perfil")
    .select("papel")
    .eq("id", user.id)
    .maybeSingle();

  return (perfil?.papel as string | null) ?? null;
}
