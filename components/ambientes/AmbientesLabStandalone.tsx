"use client";

import { useState } from "react";
import { AmbientesLab } from "./AmbientesLab";
import { carregarEstadoLocal, salvarEstadoLocal } from "@/lib/ambiente/persistenciaLocal";
import type { EstadoAmbiente, ResultadoSalvarAmbiente } from "@/lib/ambiente/estado";

const ESCOPO = "standalone";

// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — o laboratório
// standalone `/ambientes` (`app/ambientes/page.tsx`) não tem orçamento pai
// (sem `orcamento_id`, não há como gravar em `ambiente`/`elemento_continuo`),
// então continua em localStorage (`lib/ambiente/persistenciaLocal.ts`) em vez
// de migrar pro Supabase — decisão documentada no relatório da 13.3d.
// `useState(() => carregarEstadoLocal(...))` é o mesmo inicializador
// preguiçoso que `AmbientesLab` já usava antes desta task (Task 13.2b) — só
// subiu um nível, pra fora do componente presentacional.
export function AmbientesLabStandalone() {
  const [estadoInicial] = useState(() => carregarEstadoLocal(ESCOPO));

  async function onSalvar(estado: EstadoAmbiente): Promise<ResultadoSalvarAmbiente> {
    salvarEstadoLocal(ESCOPO, estado);
    return { ok: true };
  }

  return <AmbientesLab estadoInicial={estadoInicial} onSalvar={onSalvar} />;
}
