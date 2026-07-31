"use client";

import { PerfilLab } from "./PerfilLab";
import { salvarOrganizacao } from "@/lib/organizacao/salvar";
import { salvarPerfil } from "@/lib/perfil/salvar";
import type { OrganizacaoCarregada, PerfilCarregado } from "@/lib/perfil/carregar";

// Task 13.7a (contrato .maestro/tmp/13.7a-contract.md) — "dono de I/O" de
// `/perfil`, mesmo padrão de `FinanceiroTabConectada.tsx`: recebe os dados
// já carregados pelo Server Component da rota e liga os dois botões
// "Salvar alterações" do `PerfilLab` (presentational) às Server Actions
// `salvarOrganizacao`/`salvarPerfil`. Único ponto onde `/perfil` conversa
// com o Supabase.
export interface PerfilConectadoProps {
  organizacaoInicial: OrganizacaoCarregada | null;
  perfilInicial: PerfilCarregado;
}

export function PerfilConectado({ organizacaoInicial, perfilInicial }: PerfilConectadoProps) {
  return (
    <PerfilLab
      organizacaoInicial={organizacaoInicial}
      perfilInicial={perfilInicial}
      onSalvarOrganizacao={salvarOrganizacao}
      onSalvarPerfil={salvarPerfil}
    />
  );
}
