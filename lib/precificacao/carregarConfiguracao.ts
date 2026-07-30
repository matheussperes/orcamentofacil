import { createClient } from "@/lib/supabase/server";
import type { ConfiguracaoPrecificacao, ModoMontagem, ModoPrecificacao } from "@/lib/engine/precificacao";

// Task 13.5 (contrato .maestro/tmp/13.5-contract.md) — leitura server-side da
// configuração de precificação/montagem/frete de um orçamento, simétrica a
// `lib/ambiente/carregar.ts` (que já lê `organizacao.alturas_padrao` do mesmo
// jeito: um valor de nível ORG, com um valor de nível ORÇAMENTO que pode
// sobrescrevê-lo). `orcamento.modo_precificacao`/`modo_montagem` são jsonb
// NULLABLE — null significa "usa o default da organização"
// (`organizacao.modo_precificacao_padrao`/`modo_montagem_padrao`, sempre
// preenchidos com um default de fábrica desde a Task 11.1).
//
// Devolve tanto a config RESOLVIDA (pronta pra `ratearPrecificacao`) quanto
// os valores brutos (override do orçamento, se houver, e o default da
// organização) — a UI decide como mostrar "usando o padrão da organização"
// vs. "personalizado neste orçamento" a partir disso, sem repetir a leitura.
//
// Nunca lança: um orçamento sem override nenhum simplesmente usa os defaults
// da organização (comportamento correto, não um erro).
export interface ConfiguracaoPrecificacaoCarregada {
  config: ConfiguracaoPrecificacao;
  precificacaoOverride: ModoPrecificacao | null;
  montagemOverride: ModoMontagem | null;
  precificacaoPadraoOrg: ModoPrecificacao;
  montagemPadraoOrg: ModoMontagem;
}

const PRECIFICACAO_FALLBACK: ModoPrecificacao = { modo: "multiplicador", fator: 2 };
const MONTAGEM_FALLBACK: ModoMontagem = { modo: "percentual_material", percentual: 0.1 };

export async function carregarConfiguracaoPrecificacao(
  orcamentoId: string
): Promise<ConfiguracaoPrecificacaoCarregada> {
  const supabase = await createClient();

  const { data: orcamentoRow } = await supabase
    .from("orcamento")
    .select("modo_precificacao, modo_montagem, frete, organizacao_id")
    .eq("id", orcamentoId)
    .maybeSingle();

  const precificacaoOverride = (orcamentoRow?.modo_precificacao as ModoPrecificacao | null) ?? null;
  const montagemOverride = (orcamentoRow?.modo_montagem as ModoMontagem | null) ?? null;
  const freteTotal = (orcamentoRow?.frete as number | null) ?? 0;
  const organizacaoId = (orcamentoRow?.organizacao_id as string | undefined) ?? null;

  let precificacaoPadraoOrg = PRECIFICACAO_FALLBACK;
  let montagemPadraoOrg = MONTAGEM_FALLBACK;
  if (organizacaoId) {
    const { data: orgRow } = await supabase
      .from("organizacao")
      .select("modo_precificacao_padrao, modo_montagem_padrao")
      .eq("id", organizacaoId)
      .maybeSingle();
    precificacaoPadraoOrg = (orgRow?.modo_precificacao_padrao as ModoPrecificacao | null) ?? PRECIFICACAO_FALLBACK;
    montagemPadraoOrg = (orgRow?.modo_montagem_padrao as ModoMontagem | null) ?? MONTAGEM_FALLBACK;
  }

  return {
    config: {
      precificacao: precificacaoOverride ?? precificacaoPadraoOrg,
      montagem: montagemOverride ?? montagemPadraoOrg,
      freteTotal,
    },
    precificacaoOverride,
    montagemOverride,
    precificacaoPadraoOrg,
    montagemPadraoOrg,
  };
}
