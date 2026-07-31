"use client";

import { GabaritoLab } from "./GabaritoLab";
import { excluirGabarito } from "@/lib/gabarito/acoes";
import type { GabaritoRow } from "@/lib/gabarito/tipos";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — "dono de I/O" de
// `/biblioteca`, mesmo padrão de `CatalogoConectado.tsx`/`PerfilConectado.tsx`:
// recebe os gabaritos já carregados pelo Server Component da rota e liga o
// `GabaritoLab` (presentational) à Server Action de exclusão
// (`lib/gabarito/acoes.ts`). Único ponto onde `/biblioteca` conversa com o
// Supabase.
export interface GabaritoConectadoProps {
  gabaritosIniciais: GabaritoRow[];
  erroCarregamento: boolean;
}

export function GabaritoConectado({ gabaritosIniciais, erroCarregamento }: GabaritoConectadoProps) {
  return (
    <GabaritoLab
      gabaritosIniciais={gabaritosIniciais}
      erroCarregamento={erroCarregamento}
      onExcluir={excluirGabarito}
    />
  );
}
