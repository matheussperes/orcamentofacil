"use client";

import { CorteMaterialLab } from "./CorteMaterialLab";
import { congelarListaMaterial, type ResultadoCongelarListaMaterial } from "@/lib/lista-material/congelar";
import type { SnapshotListaMaterial } from "@/lib/lista-material/tipos";
import type { EstadoAmbiente } from "@/lib/ambiente/estado";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — "dono de I/O" da aba
// "Corte & Material" em `/orcamento/[id]`, mesmo padrão de
// `AmbientesTabConectada.tsx` (Task 13.3d): recebe o `estadoInicial` já
// carregado pelo Server Component da rota (a MESMA chamada
// `carregarEstadoAmbiente` que `AmbientesTabConectada` já usa — não busca de
// novo, contrato) e liga o botão "Congelar lista de material" do
// `CorteMaterialLab` (presentational) ao Server Action
// `congelarListaMaterial` (`lib/lista-material/congelar.ts`). Único ponto
// onde esta aba conversa com o Supabase.
export interface CorteMaterialTabConectadaProps {
  orcamentoId: string;
  estadoInicial: EstadoAmbiente;
  frete: number | null;
  ultimaCongeladaEmInicial: string | null;
  /** `organizacao.espessuraSerraPadraoMm` — ver comentário completo em `CorteMaterialLab`. */
  kerfMm: number;
}

export function CorteMaterialTabConectada({
  orcamentoId,
  estadoInicial,
  frete,
  ultimaCongeladaEmInicial,
  kerfMm,
}: CorteMaterialTabConectadaProps) {
  async function onCongelar(snapshot: SnapshotListaMaterial): Promise<ResultadoCongelarListaMaterial> {
    return congelarListaMaterial(orcamentoId, snapshot);
  }

  return (
    <CorteMaterialLab
      orcamentoId={orcamentoId}
      estadoInicial={estadoInicial}
      frete={frete}
      ultimaCongeladaEmInicial={ultimaCongeladaEmInicial}
      kerfMm={kerfMm}
      onCongelar={onCongelar}
    />
  );
}
