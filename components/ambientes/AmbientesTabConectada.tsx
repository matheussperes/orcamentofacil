"use client";

import { AmbientesLab } from "./AmbientesLab";
import { salvarEstadoAmbiente } from "@/lib/ambiente/salvar";
import type { EstadoAmbiente, ResultadoSalvarAmbiente } from "@/lib/ambiente/estado";

// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — o "dono de I/O"
// Supabase de `/orcamento/[id]`: recebe o estado já carregado pelo Server
// Component da rota (`lib/ambiente/carregar.ts`, chamado em
// `app/(app)/orcamento/[id]/page.tsx`) e liga o botão "Salvar alterações" do
// `AmbientesLab` (presentational) ao Server Action `salvarEstadoAmbiente`
// (`lib/ambiente/salvar.ts`). Este é o ÚNICO ponto onde a aba "Ambientes"
// conversa com o Supabase — `AmbientesLab` em si não sabe que este componente
// existe.
export interface AmbientesTabConectadaProps {
  orcamentoId: string;
  estadoInicial: EstadoAmbiente;
}

export function AmbientesTabConectada({ orcamentoId, estadoInicial }: AmbientesTabConectadaProps) {
  async function onSalvar(estado: EstadoAmbiente): Promise<ResultadoSalvarAmbiente> {
    return salvarEstadoAmbiente(orcamentoId, estado);
  }

  return <AmbientesLab estadoInicial={estadoInicial} onSalvar={onSalvar} orcamentoId={orcamentoId} />;
}
