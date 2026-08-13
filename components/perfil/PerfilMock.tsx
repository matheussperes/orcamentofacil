"use client";

import { PerfilLab } from "./PerfilLab";
import type { OrganizacaoCarregada, PerfilCarregado } from "@/lib/perfil/carregar";
import type { ResultadoSalvarOrganizacao } from "@/lib/organizacao/salvar";
import type { ResultadoSalvarPerfil } from "@/lib/perfil/salvar";

// Task 13.7a (contrato .maestro/tmp/13.7a-contract.md) — harness DEV-ONLY
// (`/dev/preview/perfil`), mesmo espírito de `FinanceiroTabMock.tsx`: sem
// Supabase, "salvar" no-op (só simula espera de rede pra exercitar o
// feedback visual dos dois botões).
const ORGANIZACAO_MOCK: OrganizacaoCarregada = {
  id: "preview-organizacao",
  nome: "Marcenaria Boa Vista",
  cnpj: "12.345.678/0001-90",
  endereco: "Rua das Palmeiras, 450 — São Paulo/SP",
  telefone: "(11) 91234-5678",
  logoUrl: "",
  unidade: "mm",
  modoPrecificacaoPadrao: { modo: "multiplicador", fator: 2 },
  modoMontagemPadrao: { modo: "percentual_material", percentual: 0.1 },
  espessuraSerraPadraoMm: 3,
};

const PERFIL_MOCK: PerfilCarregado = {
  nome: "Usuário de teste",
  telefone: "(11) 98888-0000",
  email: "usuario@teste.com",
  fotoUrl: "",
};

export function PerfilMock() {
  async function onSalvarOrganizacaoMock(): Promise<ResultadoSalvarOrganizacao> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true };
  }

  async function onSalvarPerfilMock(): Promise<ResultadoSalvarPerfil> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true };
  }

  return (
    <PerfilLab
      organizacaoInicial={ORGANIZACAO_MOCK}
      perfilInicial={PERFIL_MOCK}
      onSalvarOrganizacao={onSalvarOrganizacaoMock}
      onSalvarPerfil={onSalvarPerfilMock}
    />
  );
}

/** `?erro=1` do harness — exercita o estado de erro da seção "Organização"
 * (`organizacaoInicial: null`, ver `PerfilLab.tsx`) sem precisar de um
 * cenário real de organização não resolvível. */
export function PerfilMockErro() {
  async function onSalvarOrganizacaoMock(): Promise<ResultadoSalvarOrganizacao> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true };
  }

  async function onSalvarPerfilMock(): Promise<ResultadoSalvarPerfil> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true };
  }

  return (
    <PerfilLab
      organizacaoInicial={null}
      perfilInicial={PERFIL_MOCK}
      onSalvarOrganizacao={onSalvarOrganizacaoMock}
      onSalvarPerfil={onSalvarPerfilMock}
    />
  );
}
