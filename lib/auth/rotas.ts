// Task 13.3a (contrato .maestro/tmp/13.3a-contract.md) — decisão de escopo
// do gate de autenticação em `middleware.ts`.
//
// Decisão: gate ADITIVO por padrão-negado — toda rota exige sessão, EXCETO
// as listadas aqui. Isso inclui deliberadamente os laboratórios `/modulo`,
// `/ambientes` e `/biblioteca` (hoje públicos, sem gate) — passam a exigir
// login também. A migração deles para o shell autenticado v3 é a Task
// 13.3b; até lá, ficam atrás do gate mas sem o layout novo.
//
// Extraído como função pura (em vez de inline em `middleware.ts`) para ser
// testável com Vitest sem precisar mockar `NextRequest`/`NextResponse` —
// mesmo padrão de teste já usado no resto do repo (funções puras, sem DOM).
//
// `/auth/confirm` (correção pós-auditoria da 13.3a): rota de callback do
// link de confirmação de e-mail (app/auth/confirm/route.ts). É clicada por
// um browser SEM sessão — o gate NÃO pode redirecionar essa request pro
// /login antes da rota processar o `token_hash` e criar a sessão.
export const ROTAS_PUBLICAS = ["/login", "/signup", "/auth/confirm"] as const;

/** Rotas que NÃO passam pelo gate de sessão do middleware. */
export function isRotaPublica(pathname: string): boolean {
  return ROTAS_PUBLICAS.some((rota) => rota === pathname);
}
