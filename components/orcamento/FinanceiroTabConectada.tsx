"use client";

import { useRouter } from "next/navigation";
import { FinanceiroLab } from "./FinanceiroLab";
import { salvarConfiguracaoPrecificacao, type ResultadoSalvarConfiguracao } from "@/lib/orcamento/salvarConfiguracaoPrecificacao";
import type { ModoMontagem, ModoPrecificacao } from "@/lib/engine/precificacao";
import type { EstadoAmbiente } from "@/lib/ambiente/estado";
import type { ConfiguracaoPrecificacaoCarregada } from "@/lib/precificacao/carregarConfiguracao";

// Task 13.5 (contrato .maestro/tmp/13.5-contract.md) — "dono de I/O" da aba
// "Financeiro" em `/orcamento/[id]`, mesmo padrão de
// `CorteMaterialTabConectada.tsx` (Task 13.4): recebe o `estadoInicial` e a
// `configuracaoInicial` já carregados pelo Server Component da rota e liga o
// botão "Salvar alterações" do `FinanceiroLab` (presentational) ao Server
// Action `salvarConfiguracaoPrecificacao`. Único ponto onde esta aba
// conversa com o Supabase.
//
// Task 1.5–1.6 (causa raiz do bug de paridade financeiro ↔ proposta,
// R$ 6,00 de divergência relatado) — a Task 1.1–1.3 só cobriu a propagação
// DE Ambientes PARA as outras 3 abas (via `router.refresh()` em
// `AmbientesTabConectada`), porque só Ambientes tinha mutação própria na
// época. Mas `salvarConfiguracaoPrecificacao` (frete/modo de
// precificação/montagem) TAMBÉM é lido por `PropostaLab`
// (`configuracaoInicial.config`, mesma prop que `FinanceiroLab` usa) — sem
// `router.refresh()` aqui, salvar em Financeiro deixava a aba Proposta com
// `ConfiguracaoPrecificacao` desatualizada até um F5, gerando o
// `precoFinal`/`Σ valorRateado` calculados sobre configs diferentes. Mesmo
// padrão de `AmbientesTabConectada.tsx`.
export interface FinanceiroTabConectadaProps {
  orcamentoId: string;
  estadoInicial: EstadoAmbiente;
  configuracaoInicial: ConfiguracaoPrecificacaoCarregada;
}

export function FinanceiroTabConectada({ orcamentoId, estadoInicial, configuracaoInicial }: FinanceiroTabConectadaProps) {
  const router = useRouter();

  async function onSalvar(
    precificacao: ModoPrecificacao | null,
    montagem: ModoMontagem | null,
    frete: number
  ): Promise<ResultadoSalvarConfiguracao> {
    const resultado = await salvarConfiguracaoPrecificacao(orcamentoId, precificacao, montagem, frete);
    if (resultado.ok) {
      router.refresh();
    }
    return resultado;
  }

  return (
    <FinanceiroLab
      orcamentoId={orcamentoId}
      estadoInicial={estadoInicial}
      configuracaoInicial={configuracaoInicial}
      onSalvar={onSalvar}
    />
  );
}
