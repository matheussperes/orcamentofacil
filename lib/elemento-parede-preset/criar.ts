"use server";

import { createClient } from "@/lib/supabase/server";
import {
  COLUNAS_ELEMENTO_PAREDE_PRESET,
  elementoParedePresetRowDeLinha,
  type ElementoParedePresetRow,
} from "./tipos";

// Task 2.12 (back) — Server Action de criação de preset de elemento de
// parede (Modelo-de-Dominio.md Seção 3.2.3, decisão Q-5). Mesmo padrão de
// `lib/cliente/acoes.ts::atualizarCliente` — `organizacao_id` nunca vem do
// client, resolvido via `perfil` do usuário autenticado. `nome` é o único
// campo obrigatório; `larguraPadrao`/`alturaPadrao` são prefill opcional.

const NOME_MAX_LENGTH = 120;

export interface CriarElementoParedePresetInput {
  nome: string;
  larguraPadrao?: number | null;
  alturaPadrao?: number | null;
}

export interface CriarElementoParedePresetResultado {
  ok: boolean;
  erro?: string;
  preset?: ElementoParedePresetRow;
}

export async function criarElementoParedePreset(
  input: CriarElementoParedePresetInput
): Promise<CriarElementoParedePresetResultado> {
  const nome = input.nome.trim();
  if (!nome) {
    return { ok: false, erro: "Informe o nome do preset." };
  }
  if (nome.length > NOME_MAX_LENGTH) {
    return { ok: false, erro: `O nome não pode passar de ${NOME_MAX_LENGTH} caracteres.` };
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
      "[elemento-parede-preset] falha ao buscar organizacao_id do perfil:",
      erroPerfil?.message
    );
    return { ok: false, erro: "Não foi possível identificar sua organização. Tente novamente." };
  }

  const { data, error } = await supabase
    .from("elemento_parede_preset")
    .insert({
      organizacao_id: perfil.organizacao_id as string,
      nome,
      largura_padrao: input.larguraPadrao ?? null,
      altura_padrao: input.alturaPadrao ?? null,
    })
    .select(COLUNAS_ELEMENTO_PAREDE_PRESET)
    .single();

  if (error || !data) {
    console.error("[elemento-parede-preset] falha ao criar preset:", error?.message);
    return { ok: false, erro: "Não foi possível salvar este preset. Tente novamente." };
  }

  return { ok: true, preset: elementoParedePresetRowDeLinha(data as Record<string, unknown>) };
}
