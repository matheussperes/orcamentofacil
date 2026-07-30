import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Correção pós-auditoria da Task 13.3a — peça que faltava pro cadastro
// funcionar ponta-a-ponta quando o projeto Supabase exige confirmação de
// e-mail (comportamento padrão de projeto hospedado): app/signup/page.tsx
// já tratava o caso "sem sessão ainda" mostrando "confira seu e-mail", mas
// faltava a rota que processa o clique no link do e-mail.
//
// Padrão oficial Supabase + Next.js App Router com @supabase/ssr
// (consultado via MCP search_docs em 2026-07-29, guia "Build a User
// Management App with Next.js"): o template de e-mail "Confirm signup" do
// dashboard Supabase precisa apontar para
// `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
// em vez do `{{ .ConfirmationURL }}` padrão — configuração do dashboard,
// responsabilidade do operador (fora do escopo deste código; ver relatório
// da task).
//
// Usa o client de SERVIDOR (lib/supabase/server.ts, já configurado —
// não criamos client novo): `verifyOtp` troca o `token_hash` por uma
// sessão e grava os cookies via esse client, então o gate do middleware já
// enxerga o usuário autenticado na navegação seguinte.
//
// Rota pública em lib/auth/rotas.ts: chega de um browser SEM sessão, então
// o gate não pode interceptar antes do token ser processado.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      const redirectTo = request.nextUrl.clone();
      redirectTo.pathname = "/";
      redirectTo.search = "";
      return NextResponse.redirect(redirectTo);
    }
  }

  // Token ausente, inválido ou expirado — volta pro /login com um
  // parâmetro que a tela traduz em mensagem legível (Design-System Seção
  // 11: diz o que aconteceu e o que fazer a seguir), nunca o erro cru.
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("erro", "confirmacao");
  return NextResponse.redirect(loginUrl);
}
