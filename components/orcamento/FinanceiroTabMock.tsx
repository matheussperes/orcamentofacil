"use client";

import { FinanceiroLab } from "./FinanceiroLab";
import { estadoMockPreenchido } from "@/lib/ambiente/estadoMockPreenchido";
import type { ConfiguracaoPrecificacaoCarregada } from "@/lib/precificacao/carregarConfiguracao";
import type { ResultadoSalvarConfiguracao } from "@/lib/orcamento/salvarConfiguracaoPrecificacao";

// Task 13.5 (contrato .maestro/tmp/13.5-contract.md) — harness DEV-ONLY
// (`/dev/preview/orcamento`), mesmo espírito de `CorteMaterialTabMock.tsx`
// (Task 13.4): sem Supabase, "salvar" no-op (só simula espera de rede pra
// exercitar o feedback visual do botão). Configuração mock usa o padrão da
// organização (nenhum override) pra o gate visual mostrar o caso mais comum
// (conta nova, nunca personalizou precificação).
const CONFIGURACAO_MOCK: ConfiguracaoPrecificacaoCarregada = {
  config: {
    precificacao: { modo: "multiplicador", fator: 2 },
    montagem: { modo: "percentual_material", percentual: 0.1 },
    freteTotal: 200,
  },
  precificacaoOverride: null,
  montagemOverride: null,
  precificacaoPadraoOrg: { modo: "multiplicador", fator: 2 },
  montagemPadraoOrg: { modo: "percentual_material", percentual: 0.1 },
};

export function FinanceiroTabMock() {
  async function onSalvarMock(): Promise<ResultadoSalvarConfiguracao> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true };
  }

  return (
    <FinanceiroLab
      orcamentoId="preview-orcamento"
      estadoInicial={estadoMockPreenchido()}
      configuracaoInicial={CONFIGURACAO_MOCK}
      onSalvar={onSalvarMock}
    />
  );
}
