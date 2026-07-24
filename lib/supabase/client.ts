import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase para uso no browser (Client Components).
//
// Task 11.1 (docs/Backlog.md — Stage 11): substitui o auth Prisma/JWT
// próprio. Este cliente NUNCA deve importar `lib/supabase/server` nem vice-
// versa — cada um lida com um contexto de cookies diferente (server usa
// `cookies()` do next/headers; browser não tem acesso a isso).
//
// `createBrowserClient` já usa singleton internamente — chame esta função
// sempre que precisar do cliente, não guarde em um módulo global à parte.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
