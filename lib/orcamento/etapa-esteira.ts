import { createClient } from "@/lib/supabase/server";

// Task 5.10-back (Modelo-de-Dominio.md Seção 7.2) — etapa de esteira do
// orçamento, campo novo e ORTOGONAL a `status` comercial (mesmo princípio de
// `congelado_em`, 0.7a). Migration:
// supabase/migrations/20260805100000_orcamento_etapa_esteira.sql.
//
// Mesmo padrão de defesa em profundidade de `lib/orcamento/congelar.ts` /
// `lib/ambiente/acoes.ts`: nunca confia em `organizacao_id` vindo do
// client — resolve via `perfil` do usuário autenticado — e confirma posse do
// `orcamentoId` com `.eq("id", ...).eq("organizacao_id", ...)` ANTES do
// UPDATE. A RLS de `orcamento` confirma de novo no banco.

export const ETAPAS_ESTEIRA = [
  "novo",
  "visita_agendada",
  "projeto_3d",
  "aguardando_aprovacao",
  "fechado",
] as const;

export type EtapaEsteira = (typeof ETAPAS_ESTEIRA)[number];

export const ETAPA_TERMINAL: EtapaEsteira = "fechado";

function etapaEhValida(valor: string): valor is EtapaEsteira {
  return (ETAPAS_ESTEIRA as readonly string[]).includes(valor);
}

/** Gatilho 2 (Modelo 7.2): etapas anteriores a `aguardando_aprovacao` na
 * ordem do workflow — usado por `congelarOrcamento` para decidir se avança. */
const ETAPAS_ANTERIORES_A_AGUARDANDO_APROVACAO: readonly EtapaEsteira[] = [
  "novo",
  "visita_agendada",
  "projeto_3d",
];

export function deveAvancarParaAguardandoAprovacao(etapaAtual: EtapaEsteira): boolean {
  return ETAPAS_ANTERIORES_A_AGUARDANDO_APROVACAO.includes(etapaAtual);
}

export interface ResultadoAtualizarEtapaEsteira {
  ok: boolean;
  erro?: string;
}

/**
 * Server Action manual (T1 — Modelo-de-Dominio.md 7.2): move livremente
 * entre as etapas não-terminais, nos dois sentidos. Qualquer papel
 * autenticado da organização pode chamar (não exige `admin`).
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
  // Diretiva por função (não por arquivo): este módulo também exporta
  // constantes/funções síncronas (ETAPAS_ESTEIRA, deveAvancarParaAguardandoAprovacao),
  // e um arquivo "use server" só pode exportar funções async — ver
  // https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations.
  "use server";

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
    console.error("[orcamento/etapa-esteira] falha ao buscar organizacao_id do perfil:", erroPerfil?.message);
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
    console.error("[orcamento/etapa-esteira] falha ao localizar orçamento:", erroOrcamento?.message);
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
    console.error("[orcamento/etapa-esteira] falha ao gravar etapa_esteira:", erroUpdate.message);
    return { ok: false, erro: "Não foi possível atualizar a etapa do orçamento." };
  }

  return { ok: true };
}
