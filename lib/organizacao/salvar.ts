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
// **Logo sem upload** (decisão de escopo do contrato, documentada aqui
// também): `organizacao.logo_url` é `text` livre — este formulário só grava
// a URL como o usuário digitou/colou. Construir upload de imagem (Storage
// novo, como a Task 13.6a fez pro render de proposta) é escopo maior, fora
// desta task.
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
