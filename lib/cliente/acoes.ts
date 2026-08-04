"use server";

import { createClient } from "@/lib/supabase/server";

// Task 0.5a — Server Action de edição de cliente (RF-32,
// Modelo-de-Dominio.md Seção 7). Mesmo padrão de `lib/orcamento/criar.ts`
// (organizacao_id nunca vem do client, resolvido via `perfil` do usuário
// autenticado) e de `lib/ambiente/acoes.ts` (retorna `{ ok, erro }`, filtro
// explícito por organizacao_id no update como defesa em profundidade além
// da RLS `cliente_update_propria_org`).

export interface AtualizarClienteInput {
  clienteId: string;
  nome: string;
  telefone?: string;
  endereco?: string;
}

export interface AtualizarClienteResultado {
  ok: boolean;
  erro?: string;
}

// Correção QA (Security-Decline-Payload.md, tentativa 1): mesmo teto usado
// em lib/ambiente/acoes.ts (NOME_MAX_LENGTH) para os campos de texto livre —
// nenhum vai para coluna `text` sem limite.
const CAMPO_MAX_LENGTH = 120;

export async function atualizarCliente(
  input: AtualizarClienteInput
): Promise<AtualizarClienteResultado> {
  const nome = input.nome.trim();
  if (!nome) {
    return { ok: false, erro: "Informe o nome do cliente." };
  }
  if (nome.length > CAMPO_MAX_LENGTH) {
    return { ok: false, erro: `O nome não pode passar de ${CAMPO_MAX_LENGTH} caracteres.` };
  }

  const telefone = input.telefone !== undefined ? input.telefone.trim() || null : undefined;
  if (telefone && telefone.length > CAMPO_MAX_LENGTH) {
    return { ok: false, erro: `O telefone não pode passar de ${CAMPO_MAX_LENGTH} caracteres.` };
  }

  const endereco = input.endereco !== undefined ? input.endereco.trim() || null : undefined;
  if (endereco && endereco.length > CAMPO_MAX_LENGTH) {
    return { ok: false, erro: `O endereço não pode passar de ${CAMPO_MAX_LENGTH} caracteres.` };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfil")
    .select("organizacao_id")
    .eq("id", user.id)
    .maybeSingle();

  if (erroPerfil || !perfil) {
    console.error(
      "[cliente/acoes] falha ao buscar organizacao_id do perfil:",
      erroPerfil?.message
    );
    return { ok: false, erro: "Não foi possível identificar sua organização. Tente novamente." };
  }

  const organizacaoId = perfil.organizacao_id as string;

  // Ajuste 2 (Security-Decline-Payload.md, tentativa 1): grava telefone/
  // endereco só se vieram no input — mesmo padrão de atualizarParede em
  // lib/ambiente/acoes.ts. Campo omitido no input não deve apagar o valor
  // já salvo; campo enviado vazio continua virando `null` (limpeza explícita).
  const atualizacao: Record<string, unknown> = { nome };
  if (telefone !== undefined) atualizacao.telefone = telefone;
  if (endereco !== undefined) atualizacao.endereco = endereco;

  const { data, error: erroUpdate } = await supabase
    .from("cliente")
    .update(atualizacao)
    .eq("id", input.clienteId)
    .eq("organizacao_id", organizacaoId)
    .select("id")
    .maybeSingle();

  if (erroUpdate) {
    console.error("[cliente/acoes] falha ao atualizar cliente:", erroUpdate.message);
    return { ok: false, erro: "Não foi possível salvar o cliente. Tente novamente." };
  }
  if (!data) {
    return { ok: false, erro: "Este cliente não existe mais." };
  }

  return { ok: true };
}
