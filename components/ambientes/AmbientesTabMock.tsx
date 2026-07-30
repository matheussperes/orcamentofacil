"use client";

import { AmbientesLab } from "./AmbientesLab";
import { estadoAmbientePadrao, type ResultadoSalvarAmbiente } from "@/lib/ambiente/estado";

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

  return <AmbientesLab estadoInicial={estadoAmbientePadrao()} onSalvar={onSalvarMock} />;
}
