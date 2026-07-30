import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isRotaPublica } from "@/lib/auth/rotas";

// Task 11.1 (docs/Backlog.md — Stage 11): substitui o middleware de JWT
// próprio (verificava SESSION_COOKIE de lib/auth.ts e retornava 401 em
// /api/clientes e /api/orcamentos — ambas removidas nesta task, eram do
// modelo de dados V1). Escopo original: só refresh de sessão Supabase, sem
// gate de login.
//
// Task 13.3a (contrato .maestro/tmp/13.3a-contract.md): adiciona o gate de
// sessão, ADITIVO sobre o refresh acima (nunca substitui — `updateSession`
// continua rodando em toda request, o gate só decide se deixa passar ou
// redireciona).
//
// Decisão de escopo do gate (documentada aqui por não haver outro lugar
// natural para isso no código): por padrão, TODA rota exige sessão, exceto
// as listadas em `lib/auth/rotas.ts` (`/login`, `/signup`) + os assets já
// excluídos no `matcher` abaixo. Isso inclui os laboratórios `/modulo`,
// `/ambientes`, `/biblioteca` — hoje públicos, passam a exigir login também.
// Migrá-los para o shell autenticado v3 é a Task 13.3b; até lá funcionam
// normalmente, só que atrás do gate.
export async function middleware(request: NextRequest) {
  const { response, claims } = await updateSession(request);

  const autenticado = claims !== null;
  const pathname = request.nextUrl.pathname;

  if (!autenticado && !isRotaPublica(pathname)) {
    // Evita loop: quem já está em /login (rota pública) nunca cai aqui,
    // então não há redirect repetido para a mesma rota.
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";

    const redirectResponse = NextResponse.redirect(loginUrl);

    // Armadilha documentada em lib/supabase/middleware.ts: `updateSession`
    // pode ter setado cookies de refresh em `response`. Se devolvêssemos
    // `NextResponse.redirect(...)` sem copiar esses cookies, o browser
    // ficaria com uma sessão dessincronizada da que o servidor acabou de
    // gravar. Por isso copiamos cookie a cookie (com todas as opções —
    // path/expires/sameSite etc.) para a resposta de redirect antes de
    // devolvê-la.
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas exceto assets estáticos e otimização de imagem
     * do Next.js, para que o refresh de sessão (e, desde a 13.3a, o gate de
     * login) aconteça em qualquer request que possa depender de auth
     * (inclusive páginas, não só /api).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
