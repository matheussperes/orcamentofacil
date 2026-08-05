"use server";

import { createClient } from "@/lib/supabase/server";
import { deveAvancarParaAguardandoAprovacao, type EtapaEsteira } from "@/lib/orcamento/etapa-esteira";

// Task 0.7a (Modelo-de-Dominio.md 5.4.1, invariantes I1/I2) — grava
// `orcamento.congelado_em` (migration 20260803090000_orcamento_congelado_em.sql).
// `congeladoEm` é o ÚNICO predicado de congelamento: esta função NÃO grava
// `valorRateado` em nenhuma `linha_proposta` (invariante I2 — "congelado ⇒
// toda linha tem valorRateado" — é responsabilidade de quem chama, no mesmo
// fluxo de "Gerar proposta", encadeando essa gravação ANTES de chamar
// congelarOrcamento).
//
// Task 5.10-back (Modelo-de-Dominio.md 7.2, gatilho 2) — este UPDATE também
// avança `etapa_esteira` para `aguardando_aprovacao` quando a etapa atual é
// anterior a ela (`novo`/`visita_agendada`/`projeto_3d`), na MESMA escrita
// que grava `congelado_em` (mesmo ato, não uma chamada separada). Se a etapa
// já for `fechado`, não mexe — é recongelamento (invariante I3): só a
// proposta é regravada. `status` comercial continua intocado — ortogonal.
//
// Mesmo padrão de defesa em profundidade de `lib/ambiente/acoes.ts`
// (corrigido por achado de segurança de IDOR): nunca confia em
// `organizacao_id` vindo do client — resolve via `perfil` do usuário
// autenticado — e confirma posse do `orcamentoId` com um `.eq("id",...)
// .eq("organizacao_id",...)` ANTES de qualquer UPDATE. A RLS de `orcamento`
// (20260727090300_orcamento.sql) confirma de novo no banco.

export interface ResultadoCongelar {
  ok: boolean;
  erro?: string;
}

export async function congelarOrcamento(orcamentoId: string): Promise<ResultadoCongelar> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfil")
    .select("organizacao_id")
    .eq("id", user.id)
    .maybeSingle();

  if (erroPerfil || !perfil) {
    console.error("[orcamento/congelar] falha ao buscar organizacao_id do perfil:", erroPerfil?.message);
    return { ok: false, erro: "Não foi possível identificar sua organização. Tente novamente." };
  }

  const organizacaoId = perfil.organizacao_id as string;

  // Posse: confirma que o orçamento existe E é desta organização antes de
  // gravar — mesmo padrão de `criarAmbiente` (lib/ambiente/acoes.ts). Lê
  // também `etapa_esteira` para decidir o gatilho 2 (Modelo 7.2).
  const { data: orcamento, error: erroOrcamento } = await supabase
    .from("orcamento")
    .select("id, etapa_esteira")
    .eq("id", orcamentoId)
    .eq("organizacao_id", organizacaoId)
    .maybeSingle();

  if (erroOrcamento || !orcamento) {
    console.error("[orcamento/congelar] falha ao localizar orçamento para congelar:", erroOrcamento?.message);
    return { ok: false, erro: "Este orçamento não existe mais." };
  }

  const etapaAtual = orcamento.etapa_esteira as EtapaEsteira;
  const valoresUpdate: { congelado_em: string; etapa_esteira?: EtapaEsteira } = {
    // `new Date()` aqui roda no servidor (Server Action) — nunca é o
    // relógio do client, mesmo que o gatilho tenha vindo de uma requisição
    // do browser.
    congelado_em: new Date().toISOString(),
  };
  if (deveAvancarParaAguardandoAprovacao(etapaAtual)) {
    valoresUpdate.etapa_esteira = "aguardando_aprovacao";
  }

  const { error: erroUpdate } = await supabase
    .from("orcamento")
    .update(valoresUpdate)
    .eq("id", orcamentoId)
    .eq("organizacao_id", organizacaoId);

  if (erroUpdate) {
    console.error("[orcamento/congelar] falha ao gravar congelado_em:", erroUpdate.message);
    return { ok: false, erro: "Não foi possível congelar o orçamento." };
  }

  return { ok: true };
}
