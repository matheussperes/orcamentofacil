"use server";

import { createClient } from "@/lib/supabase/server";

// Task 13.7a (contrato .maestro/tmp/13.7a-contract.md) — Server Action que
// atualiza `perfil.nome`/`telefone` do usuário autenticado (seção "Perfil
// pessoal" de `/perfil`). Mesmo padrão de `lib/orcamento/salvarItem.ts`
// (Task 13.3e): RLS-safe por construção — `perfil_update_proprio`
// (`supabase/migrations/20260724181915_fundacao_multitenant.sql`) já
// restringe a escrita a `id = auth.uid()`, então basta `.eq("id", user.id)`,
// sem buscar `organizacao_id` (não é escrito aqui).
//
// `email` não é gravável por esta ação — vem de `auth.users`, mostrado
// só-leitura em `/perfil` (trocar e-mail é fluxo de Supabase Auth próprio,
// fora de escopo desta task, ver `lib/perfil/carregar.ts`).
export interface DadosPerfil {
  nome: string;
  telefone: string;
}

export interface ResultadoSalvarPerfil {
  ok: boolean;
  erro?: string;
}

export async function salvarPerfil(dados: DadosPerfil): Promise<ResultadoSalvarPerfil> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { error } = await supabase
    .from("perfil")
    .update({
      nome: dados.nome.trim() || null,
      telefone: dados.telefone.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[perfil] falha ao salvar dados do perfil:", error.message);
    return { ok: false, erro: "Não foi possível salvar seus dados de perfil." };
  }

  return { ok: true };
}
