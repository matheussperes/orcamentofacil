import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Task 11.1 (docs/Backlog.md — Stage 11): refresh de sessão Supabase no
// middleware, padrão @supabase/ssr. Substitui o middleware de JWT próprio
// (verificava SESSION_COOKIE via lib/auth.ts).
//
// Task 13.3a: `updateSession` passou a retornar também as `claims` do JWT
// (além da `response`) — o gate de sessão em `middleware.ts` precisa saber
// se há usuário autenticado para decidir o redirect para `/login`, e
// reaproveita a MESMA chamada a `getClaims()` que já disparava o refresh
// (evita round-trip duplicado). `middleware.ts` NÃO cria um client Supabase
// próprio — continua usando só este módulo, como já documentado no
// contrato desta task ("USE esses, não crie clientes novos").
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
  // necessário. Sem isso, sessões expiram silenciosamente no cliente. O
  // resultado (`claims`) também é o que usamos para saber se o usuário está
  // autenticado — `null`/erro quando não há sessão válida.
  const { data } = await supabase.auth.getClaims();

  // IMPORTANTE: devolva sempre `supabaseResponse` (ou uma cópia que preserve
  // os cookies dela) — criar uma resposta nova sem copiar os cookies
  // dessincroniza browser e servidor e derruba a sessão do usuário. Ver
  // `middleware.ts`: ao redirecionar para /login, ele copia os cookies desta
  // `response` para a resposta de redirect, pelo mesmo motivo.
  return { response: supabaseResponse, claims: data?.claims ?? null };
}
