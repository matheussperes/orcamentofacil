import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Task 11.1 (docs/Backlog.md — Stage 11): substitui o middleware de JWT
// próprio (verificava SESSION_COOKIE de lib/auth.ts e retornava 401 em
// /api/clientes e /api/orcamentos — ambas removidas nesta task, eram do
// modelo de dados V1). Novo escopo: refresh de sessão Supabase em todas as
// rotas, sem gate de login (decisão de UX da Fase C).
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas exceto assets estáticos e otimização de imagem
     * do Next.js, para que o refresh de sessão aconteça em qualquer request
     * que possa depender de auth (inclusive páginas, não só /api).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
