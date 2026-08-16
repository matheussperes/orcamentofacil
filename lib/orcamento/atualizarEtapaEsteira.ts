"use server";

import { createClient } from "@/lib/supabase/server";
import { ETAPA_TERMINAL, etapaEhValida, type EtapaEsteira } from "@/lib/orcamento/etapa-esteira";

// Task 5.10-back (Modelo-de-Dominio.md 7.2) — Server Action manual de
// arquivo próprio (correção pós-build da Task 5.10-front: precisa de "use
// server" no TOPO do arquivo, não inline, para ser importável direto por um
// Client Component — `components/orcamento/SeletorEtapaEsteira.tsx`).
//
// Mesmo padrão de defesa em profundidade de `lib/orcamento/congelar.ts` /
// `lib/ambiente/acoes.ts`: nunca confia em `organizacao_id` vindo do
// client — resolve via `perfil` do usuário autenticado — e confirma posse do
// `orcamentoId` com `.eq("id", ...).eq("organizacao_id", ...)` ANTES do
// UPDATE. A RLS de `orcamento` confirma de novo no banco.

export interface ResultadoAtualizarEtapaEsteira {
  ok: boolean;
  erro?: string;
}

/**
 * T1 — move livremente entre as etapas não-terminais, nos dois sentidos.
 * Qualquer papel autenticado da organização pode chamar (não exige `admin`).
 *
 * Rejeita:
 * - E-E2: `novaEtapa` fora do enum;
 * - E-E1: mover para OU a partir de `fechado` (T2 — porta única, só entra
 *   pelo gatilho de aprovação, que não existe no produto ainda, e só sai
 *   pela ação Reabrir, Task 1.9).
 */
export async function atualizarEtapaEsteira(
  orcamentoId: string,
  novaEtapa: string
): Promise<ResultadoAtualizarEtapaEsteira> {
  if (!etapaEhValida(novaEtapa)) {
    return { ok: false, erro: "Etapa de esteira inválida." };
  }

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
    console.error("[orcamento/atualizarEtapaEsteira] falha ao buscar organizacao_id do perfil:", erroPerfil?.message);
    return { ok: false, erro: "Não foi possível identificar sua organização. Tente novamente." };
  }

  const organizacaoId = perfil.organizacao_id as string;

  // Posse: confirma que o orçamento existe E é desta organização, e lê a
  // etapa atual para o bloqueio de `fechado` (T2/E-E1).
  const { data: orcamento, error: erroOrcamento } = await supabase
    .from("orcamento")
    .select("id, etapa_esteira")
    .eq("id", orcamentoId)
    .eq("organizacao_id", organizacaoId)
    .maybeSingle();

  if (erroOrcamento || !orcamento) {
    console.error("[orcamento/atualizarEtapaEsteira] falha ao localizar orçamento:", erroOrcamento?.message);
    return { ok: false, erro: "Este orçamento não existe mais." };
  }

  const etapaAtual = orcamento.etapa_esteira as EtapaEsteira;

  if (etapaAtual === ETAPA_TERMINAL || novaEtapa === ETAPA_TERMINAL) {
    return {
      ok: false,
      erro: "Este orçamento está fechado. Para voltar a editá-lo, use Reabrir.",
    };
  }

  const { error: erroUpdate } = await supabase
    .from("orcamento")
    .update({ etapa_esteira: novaEtapa })
    .eq("id", orcamentoId)
    .eq("organizacao_id", organizacaoId);

  if (erroUpdate) {
    console.error("[orcamento/atualizarEtapaEsteira] falha ao gravar etapa_esteira:", erroUpdate.message);
    return { ok: false, erro: "Não foi possível atualizar a etapa do orçamento." };
  }

  return { ok: true };
}
