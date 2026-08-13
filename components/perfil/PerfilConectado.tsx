"use client";

import { PerfilLab } from "./PerfilLab";
import { salvarOrganizacao } from "@/lib/organizacao/salvar";
import { salvarPerfil } from "@/lib/perfil/salvar";
import { definirNovaSenha, solicitarTrocaSenha } from "@/lib/auth/trocar-senha";
import type { OrganizacaoCarregada, PerfilCarregado } from "@/lib/perfil/carregar";

// Task 13.7a (contrato .maestro/tmp/13.7a-contract.md) — "dono de I/O" de
// `/perfil`, mesmo padrão de `FinanceiroTabConectada.tsx`: recebe os dados
// já carregados pelo Server Component da rota e liga os dois botões
// "Salvar alterações" do `PerfilLab` (presentational) às Server Actions
// `salvarOrganizacao`/`salvarPerfil`. Único ponto onde `/perfil` conversa
// com o Supabase.
//
// Task 4.12-4.13-front: mesmo espírito para a seção "Segurança" — liga
// `solicitarTrocaSenha`/`definirNovaSenha` (`lib/auth/trocar-senha.ts`, Task
// 4.12-4.13 back, já auditadas) sem nenhuma lógica de sessão nova aqui.
export interface PerfilConectadoProps {
  organizacaoInicial: OrganizacaoCarregada | null;
  perfilInicial: PerfilCarregado;
  definirSenhaInicial: boolean;
}

export function PerfilConectado({ organizacaoInicial, perfilInicial, definirSenhaInicial }: PerfilConectadoProps) {
  return (
    <PerfilLab
      organizacaoInicial={organizacaoInicial}
      perfilInicial={perfilInicial}
      onSalvarOrganizacao={salvarOrganizacao}
      onSalvarPerfil={salvarPerfil}
      definirSenhaInicial={definirSenhaInicial}
      onSolicitarTrocaSenha={solicitarTrocaSenha}
      onDefinirNovaSenha={definirNovaSenha}
    />
  );
}
