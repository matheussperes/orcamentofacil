"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { senhaValida } from "@/lib/auth/validacao";
import { mensagemErroTrocaSenha } from "@/lib/auth/mensagens";

// Task 4.12-4.13-back (RF-31) — troca de senha com confirmação por e-mail,
// reaproveitando o mesmo mecanismo de `app/auth/confirm/route.ts` (Task
// 13.3a) já usado para confirmação de cadastro (`type=email`), agora também
// para `type=recovery`.
//
// Mesmo padrão de `lib/perfil/salvar.ts` (Task 13.7a): Server Action que usa
// `supabase.auth.getUser()` para validar sessão antes de agir, com o mesmo
// texto de erro de sessão expirada.

export interface ResultadoTrocaSenha {
  ok: boolean;
  erro?: string;
}

/** Origem dinâmica da request (host + protocolo), sem depender de variável
 * de ambiente nova — mesmo host que o browser usou pra chegar aqui, então o
 * link do e-mail (quando o template não é customizado, ver nota no
 * contrato) sempre aponta pro ambiente certo (local/preview/produção). */
async function obterOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocolo = headersList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

/** Usuário autenticado solicita o e-mail de troca de senha. Sem parâmetro —
 * usa o e-mail da sessão atual, nunca um e-mail arbitrário informado pelo
 * cliente (evita que a Server Action seja usada pra disparar e-mail de
 * recuperação pra conta de terceiros). */
export async function solicitarTrocaSenha(): Promise<ResultadoTrocaSenha> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const origin = await obterOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${origin}/auth/confirm`,
  });

  if (error) {
    console.error("[trocar-senha] falha ao solicitar troca de senha:", error.message);
    return { ok: false, erro: mensagemErroTrocaSenha(error.message) };
  }

  return { ok: true };
}

/** Define a nova senha — só funciona com uma sessão válida (normal ou de
 * recuperação, estabelecida por `app/auth/confirm/route.ts` via `verifyOtp`
 * quando o usuário clica o link do e-mail). */
export async function definirNovaSenha(novaSenha: string): Promise<ResultadoTrocaSenha> {
  if (!senhaValida(novaSenha)) {
    return { ok: false, erro: "Senha inválida — use pelo menos 8 caracteres." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { error } = await supabase.auth.updateUser({ password: novaSenha });

  if (error) {
    console.error("[trocar-senha] falha ao definir nova senha:", error.message);
    return { ok: false, erro: mensagemErroTrocaSenha(error.message) };
  }

  return { ok: true };
}
