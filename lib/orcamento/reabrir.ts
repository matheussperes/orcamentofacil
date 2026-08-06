"use server";

import { createClient } from "@/lib/supabase/server";
import { ETAPA_TERMINAL } from "@/lib/orcamento/etapa-esteira";

// Task 1.9-back (Modelo-de-Dominio.md 5.4.1, invariantes I6/I6a) — reabre um
// orçamento congelado: `congeladoEm ← null`, `valorRateado` das linhas
// permanece intocado (dormente até um novo congelamento sobrescrever, I3), e
// `etapa_esteira` só avança de `fechado` para `aguardando_aprovacao` (7.2,
// T2) — nas demais etapas não mexe.
//
// I6a — a checagem de `perfil.papel === 'admin'` é a PRIMEIRA operação, antes
// até da leitura de `orcamento.congelado_em`: um não-admin não pode inferir,
// pela resposta `ok: true` de um no-op, que o orçamento já estava reaberto.
// Não-admin (ou sem sessão) é rejeitado com E-C3 e a função sequer consulta a
// tabela `orcamento` — nada é lido nem escrito nesse caminho.
//
// Mesmo padrão de defesa em profundidade de `lib/orcamento/congelar.ts` /
// `lib/ambiente/acoes.ts`: nunca confia em `organizacao_id` vindo do
// client — resolve via `perfil` do usuário autenticado — e confirma posse do
// `orcamentoId` com `.eq("id", ...).eq("organizacao_id", ...)` ANTES do
// UPDATE. Nenhuma política de RLS nova: a única porta de escrita é esta
// Server Action (mesma decisão da Task 4.15).

export interface ResultadoReabrir {
  ok: boolean;
  erro?: string;
  codigo?: string;
}

export async function reabrirOrcamento(orcamentoId: string): Promise<ResultadoReabrir> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfil")
    .select("organizacao_id, papel")
    .eq("id", user.id)
    .maybeSingle();

  if (erroPerfil || !perfil) {
    console.error("[orcamento/reabrir] falha ao buscar perfil do usuário:", erroPerfil?.message);
    return { ok: false, erro: "Não foi possível identificar sua organização. Tente novamente." };
  }

  // I6a — checagem de papel é a PRIMEIRA coisa que a função faz depois de
  // resolver o perfil: roda antes de qualquer leitura de `orcamento`.
  if (perfil.papel !== "admin") {
    return {
      ok: false,
      erro: "Só o administrador da organização pode reabrir um orçamento congelado.",
      codigo: "NAO_AUTORIZADO_REABRIR",
    };
  }

  const organizacaoId = perfil.organizacao_id as string;

  // Posse: confirma que o orçamento existe E é desta organização antes de
  // ler `congelado_em`/`etapa_esteira` e antes de escrever.
  const { data: orcamento, error: erroOrcamento } = await supabase
    .from("orcamento")
    .select("id, congelado_em, etapa_esteira")
    .eq("id", orcamentoId)
    .eq("organizacao_id", organizacaoId)
    .maybeSingle();

  if (erroOrcamento || !orcamento) {
    console.error("[orcamento/reabrir] falha ao localizar orçamento para reabrir:", erroOrcamento?.message);
    return { ok: false, erro: "Este orçamento não existe mais." };
  }

  // Idempotência: orçamento já reaberto — no-op, não mexe em etapa nem valor.
  if (orcamento.congelado_em === null) {
    return { ok: true };
  }

  const valoresUpdate: { congelado_em: null; etapa_esteira?: string } = {
    congelado_em: null,
  };
  if (orcamento.etapa_esteira === ETAPA_TERMINAL) {
    valoresUpdate.etapa_esteira = "aguardando_aprovacao";
  }

  const { error: erroUpdate } = await supabase
    .from("orcamento")
    .update(valoresUpdate)
    .eq("id", orcamentoId)
    .eq("organizacao_id", organizacaoId);

  if (erroUpdate) {
    console.error("[orcamento/reabrir] falha ao gravar reabertura:", erroUpdate.message);
    return { ok: false, erro: "Não foi possível reabrir o orçamento." };
  }

  return { ok: true };
}
