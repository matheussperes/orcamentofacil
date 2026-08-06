"use client";

import { useRouter } from "next/navigation";
import { AmbientesLab } from "./AmbientesLab";
import { salvarEstadoAmbiente } from "@/lib/ambiente/salvar";
import type { EstadoAmbiente, ResultadoSalvarAmbiente } from "@/lib/ambiente/estado";
import type { ElementoParedePresetRow } from "@/lib/elemento-parede-preset/tipos";

// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — o "dono de I/O"
// Supabase de `/orcamento/[id]`: recebe o estado já carregado pelo Server
// Component da rota (`lib/ambiente/carregar.ts`, chamado em
// `app/(app)/orcamento/[id]/page.tsx`) e liga o botão "Salvar alterações" do
// `AmbientesLab` (presentational) ao Server Action `salvarEstadoAmbiente`
// (`lib/ambiente/salvar.ts`). Este é o ÚNICO ponto onde a aba "Ambientes"
// conversa com o Supabase — `AmbientesLab` em si não sabe que este componente
// existe.
//
// Task 1.1–1.3 (contrato .maestro/tmp/1.1-1.3-contract.md) — depois de
// salvar com sucesso, `router.refresh()` reexecuta o Server Component da
// rota (`app/(app)/orcamento/[id]/page.tsx`), que rebusca `estadoAmbiente`
// fresco e o replasa para os 4 slots de `OrcamentoAbas`. `OrcamentoAbas` (o
// Client Component pai) não desmonta com o refresh, então `abaAtiva` e o
// `useState` lazy de `AmbientesLab` (estado de edição em progresso do
// usuário) sobrevivem — só as props derivadas de `estadoAmbiente` mudam de
// referência, o que já é suficiente pros `useMemo` de Corte & Material/
// Financeiro/Proposta reagirem sozinhos (ver comentário do contrato).
export interface AmbientesTabConectadaProps {
  orcamentoId: string;
  estadoInicial: EstadoAmbiente;
  /** Task 2.12 (front) — presets de elemento de parede da organização,
   * carregados server-side (`listarElementoParedePresets`) por
   * `app/(app)/orcamento/[id]/page.tsx` e só repassados adiante. */
  presetsElementoParede: ElementoParedePresetRow[];
}

export function AmbientesTabConectada({
  orcamentoId,
  estadoInicial,
  presetsElementoParede,
}: AmbientesTabConectadaProps) {
  const router = useRouter();

  async function onSalvar(estado: EstadoAmbiente): Promise<ResultadoSalvarAmbiente> {
    const resultado = await salvarEstadoAmbiente(orcamentoId, estado);
    if (resultado.ok) {
      router.refresh();
    }
    return resultado;
  }

  return (
    <AmbientesLab
      estadoInicial={estadoInicial}
      onSalvar={onSalvar}
      orcamentoId={orcamentoId}
      presetsElementoParede={presetsElementoParede}
    />
  );
}
