"use client";

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
export interface FinanceiroTabConectadaProps {
  orcamentoId: string;
  estadoInicial: EstadoAmbiente;
  configuracaoInicial: ConfiguracaoPrecificacaoCarregada;
}

export function FinanceiroTabConectada({ orcamentoId, estadoInicial, configuracaoInicial }: FinanceiroTabConectadaProps) {
  async function onSalvar(
    precificacao: ModoPrecificacao | null,
    montagem: ModoMontagem | null,
    frete: number
  ): Promise<ResultadoSalvarConfiguracao> {
    return salvarConfiguracaoPrecificacao(orcamentoId, precificacao, montagem, frete);
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
