import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase para uso no servidor (Server Components, Server Actions,
// Route Handlers). Usa `cookies()` do next/headers para ler/gravar a sessão.
//
// Task 11.1 (docs/Backlog.md — Stage 11): substitui `lib/db.ts` (Prisma) e
// `lib/auth.ts` (JWT próprio). NUNCA importe `lib/supabase/client` aqui nem
// o contrário — são contextos de cookies incompatíveis.
//
// Crie um cliente novo por request (não guarde em variável de módulo/global):
// é leve (basicamente configura uma chamada fetch) e precisa dos cookies da
// request atual a cada chamada.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` foi chamado a partir de um Server Component. Pode ser
            // ignorado se o middleware já cuida do refresh de sessão.
          }
        },
      },
    }
  );
}
