"use client";

import { CorteMaterialLab } from "./CorteMaterialLab";
import { estadoMockPreenchido } from "@/lib/ambiente/estadoMockPreenchido";
import type { ResultadoCongelarListaMaterial } from "@/lib/lista-material/congelar";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — harness DEV-ONLY
// (`/dev/preview/orcamento`): mesmo espírito de `AmbientesTabMock.tsx`
// (sem Supabase, sem sessão real) + "congelar" no-op (só simula espera de
// rede pra exercitar o feedback visual do botão).
//
// Diferença de escopo em relação a `AmbientesTabMock` (que usa
// `estadoAmbientePadrao()`, vazio): este harness usa um `EstadoAmbiente`
// POPULADO (`lib/ambiente/estadoMockPreenchido.ts`, extraído nesta task pra
// ser compartilhado com `FinanceiroTabMock`, Task 13.5) para o Maestro/UX
// Auditor conseguirem ver o estado "preenchido" do plano de corte/lista de
// material sem precisar montar itens manualmente na aba Ambientes do
// harness primeiro (que, por sua vez, começa vazia e não está conectada a
// este componente — cada aba do harness é um slot independente, mesma
// arquitetura da rota real). O estado "vazio" continua verificável trocando
// por `estadoAmbientePadrao()`.
export function CorteMaterialTabMock() {
  async function onCongelarMock(): Promise<ResultadoCongelarListaMaterial> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true, congeladoEm: new Date().toISOString() };
  }

  return (
    <CorteMaterialLab
      orcamentoId="preview-orcamento"
      estadoInicial={estadoMockPreenchido()}
      frete={200}
      ultimaCongeladaEmInicial={null}
      onCongelar={onCongelarMock}
    />
  );
}
