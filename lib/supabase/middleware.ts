import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Task 11.1 (docs/Backlog.md — Stage 11): refresh de sessão Supabase no
// middleware, padrão @supabase/ssr. Substitui o middleware de JWT próprio
// (verificava SESSION_COOKIE via lib/auth.ts).
//
// Escopo desta task: SÓ o refresh de sessão. Não introduzimos gate de login
// — hoje `/`, `/modulo`, `/biblioteca` etc. não exigem autenticação, e isso
// continua assim até a Fase C decidir UX de proteção de rota (docs/PRD.md).
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Não remover: é o que efetivamente dispara o refresh do token quando
  // necessário. Sem isso, sessões expiram silenciosamente no cliente.
  await supabase.auth.getClaims();

  // IMPORTANTE: devolva sempre `supabaseResponse` (ou uma cópia que preserve
  // os cookies dela) — criar uma resposta nova sem copiar os cookies
  // dessincroniza browser e servidor e derruba a sessão do usuário.
  return supabaseResponse;
}
