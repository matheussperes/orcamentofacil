// Task 5.10-back (Modelo-de-Dominio.md Seção 7.2) — etapa de esteira do
// orçamento, campo novo e ORTOGONAL a `status` comercial (mesmo princípio de
// `congelado_em`, 0.7a). Migration:
// supabase/migrations/20260805100000_orcamento_etapa_esteira.sql.
//
// Só constantes/tipos/funções síncronas — sem "use server", sem I/O. Por
// isso pode ser importado tanto por Server Components/Actions (`congelar.ts`,
// `reabrir.ts`) quanto por Client Components (`SeletorEtapaEsteira.tsx`,
// `StatusOrcamentoBadge.tsx`). A Server Action que grava a etapa
// (`atualizarEtapaEsteira`) vive em arquivo próprio,
// `lib/orcamento/atualizarEtapaEsteira.ts` (Task 5.10-front, correção
// pós-build: Next.js não permite Server Action "use server" inline importada
// direto por um Client Component — precisa de arquivo com "use server" no
// topo).

export const ETAPAS_ESTEIRA = [
  "novo",
  "visita_agendada",
  "projeto_3d",
  "aguardando_aprovacao",
  "fechado",
] as const;

export type EtapaEsteira = (typeof ETAPAS_ESTEIRA)[number];

export const ETAPA_TERMINAL: EtapaEsteira = "fechado";

export function etapaEhValida(valor: string): valor is EtapaEsteira {
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
