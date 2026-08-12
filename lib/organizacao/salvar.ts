"use server";

import { createClient } from "@/lib/supabase/server";
import type { ModoMontagem, ModoPrecificacao } from "@/lib/engine/precificacao";

// Task 13.7a (contrato .maestro/tmp/13.7a-contract.md) — Server Action que
// atualiza `organizacao` (seção "Organização" de `/perfil`): nome, CNPJ,
// endereço, telefone, logo (URL), unidade e os padrões de precificação/
// montagem. RLS-safe por construção (mesmo raciocínio de
// `lib/orcamento/salvarConfiguracaoPrecificacao.ts`): a policy
// `organizacao_update_propria`
// (`supabase/migrations/20260724181915_fundacao_multitenant.sql`) já escopa
// a escrita por `org_do_usuario()` — não precisamos buscar/validar
// `organizacaoId` de novo aqui, só `.eq("id", organizacaoId)` com o id que o
// client já tem de uma leitura anterior (`carregarPerfilOrganizacao`); um id
// de outra organização simplesmente não passaria no `WITH CHECK` da policy.
//
// **`logoUrl` agora é um PATH de Storage, não uma URL livre** (Task
// 4.8-4.9-back, bucket `organizacao-logos` — mesma semântica que
// `linha_proposta.imagem_url` já tinha desde a Task 13.6a): este módulo só
// grava a string que o client manda, sem validar formato — quem decide se é
// path (upload real) ou ainda uma URL legada é a Task 4.8-4.9 front, que
// troca o campo de texto pelo fluxo de upload (`lib/organizacao/logo-storage.ts`).
// Nenhuma mudança de comportamento nesta task, só o comentário.
export interface DadosOrganizacao {
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  logoUrl: string;
  unidade: "mm" | "cm";
  modoPrecificacaoPadrao: ModoPrecificacao;
  modoMontagemPadrao: ModoMontagem;
  espessuraSerraPadraoMm: number;
}

export interface ResultadoSalvarOrganizacao {
  ok: boolean;
  erro?: string;
}

export async function salvarOrganizacao(
  organizacaoId: string,
  dados: DadosOrganizacao
): Promise<ResultadoSalvarOrganizacao> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  if (!dados.nome.trim()) {
    return { ok: false, erro: "Informe o nome da organização." };
  }

  const { error } = await supabase
    .from("organizacao")
    .update({
      nome: dados.nome.trim(),
      cnpj: dados.cnpj.trim() || null,
      endereco: dados.endereco.trim() || null,
      telefone: dados.telefone.trim() || null,
      logo_url: dados.logoUrl.trim() || null,
      unidade: dados.unidade,
      modo_precificacao_padrao: dados.modoPrecificacaoPadrao,
      modo_montagem_padrao: dados.modoMontagemPadrao,
      espessura_serra_padrao_mm: dados.espessuraSerraPadraoMm,
    })
    .eq("id", organizacaoId);

  if (error) {
    console.error("[organizacao] falha ao salvar dados da organização:", error.message);
    return { ok: false, erro: "Não foi possível salvar os dados da organização." };
  }

  return { ok: true };
}
