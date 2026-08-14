"use client";

import { AmbientesLab } from "./AmbientesLab";
import type { ResultadoSalvarAmbiente } from "@/lib/ambiente/estado";
import { estadoMockPreenchido } from "@/lib/ambiente/estadoMockPreenchido";
import type { LinhaProposta } from "@/lib/linha-proposta/tipos";

// Task 2.28-2.30 (RF-37/Q-3) — 2 Linhas de Proposta, uma por item do
// `estadoMockPreenchido()` (`mock-balcao`/`mock-gaveteiro`), só para o
// `ux-auditor` conseguir capturar o badge comercial na aba Ambientes (regra
// de ruído: só aparece com 2+ linhas — 1 linha só, ou nenhuma, não teria como
// demonstrar o estado "com badge" neste harness).
const LINHAS_PROPOSTA_MOCK: LinhaProposta[] = [
  { id: "linha-mock-balcao", titulo: "Balcão", itens: ["mock-balcao"], imagemUrl: null, descricao: "", valorRateado: null },
  { id: "linha-mock-gaveteiro", titulo: "Gaveteiro", itens: ["mock-gaveteiro"], imagemUrl: null, descricao: "", valorRateado: null },
];

// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — harness DEV-ONLY
// (`/dev/preview/orcamento`, `app/dev/preview/orcamento/page.tsx`): estado
// MOCK (sem Supabase, sem sessão real) + "salvar" no-op que só simula a
// espera de rede pra exercitar o feedback visual do botão "Salvar
// alterações" (loading → Alert de sucesso) sem I/O nenhum. Mantém o harness
// vivo para o Maestro/UX Auditor navegarem sem sessão — ver nota em
// `AmbientesLab.tsx` sobre o componente ser indiferente à origem do estado.
export function AmbientesTabMock() {
  async function onSalvarMock(): Promise<ResultadoSalvarAmbiente> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true };
  }

  return (
    <AmbientesLab
      estadoInicial={estadoMockPreenchido()}
      onSalvar={onSalvarMock}
      linhasProposta={LINHAS_PROPOSTA_MOCK}
    />
  );
}
