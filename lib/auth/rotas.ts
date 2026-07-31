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
//
// `/dev/preview` (Task 13.3b): harness de preview do Dashboard com dados
// mock (`app/dev/preview/page.tsx`), usado pelo UX Auditor sem precisar de
// uma sessão real. Segura mesmo em produção: a própria rota faz
// `notFound()` quando `NODE_ENV === "production"` — este gate só evita que
// ela também exija login em desenvolvimento.
//
// `/dev/preview/orcamento` e `/dev/preview/orcamento/novo` (Task 13.3c):
// mesmo espírito — harness do shell `/orcamento/[id]` (4 abas, dados mock) e
// do formulário de novo orçamento em modo preview, respectivamente. Rotas
// estáticas (sem segmento dinâmico) de propósito: `isRotaPublica` faz match
// exato, não prefixo — um harness com `[id]` dinâmico não daria pra listar
// aqui sem abrir mão do match exato para toda a árvore `/dev/preview/*`.
//
// `/dev/preview/orcamento/item` (Task 13.3e): mesmo espírito — harness do
// núcleo do Editor de Item (`EditorItemNucleo`) com um `ModuloOrcamento`
// mock, pra testar `/orcamento/[id]/item/[itemId]` (rota real, protegida,
// FORA desta lista) sem sessão real.
//
// `/dev/preview/proposta-pdf` (Task 13.6b): mesmo espírito — harness do
// documento imprimível `/proposta/[id]/pdf` (rota real, protegida, FORA
// desta lista) com dados mock de organização/cliente/linhas de proposta,
// sem Supabase.
//
// `/dev/preview/perfil` (Task 13.7a): mesmo espírito — harness de `/perfil`
// (rota real, protegida, FORA desta lista) com dados mock de Organização e
// Perfil pessoal, sem Supabase.
export const ROTAS_PUBLICAS = [
  "/login",
  "/signup",
  "/auth/confirm",
  "/dev/preview",
  "/dev/preview/orcamento",
  "/dev/preview/orcamento/novo",
  "/dev/preview/orcamento/item",
  "/dev/preview/proposta-pdf",
  "/dev/preview/perfil",
] as const;

/** Rotas que NÃO passam pelo gate de sessão do middleware. */
export function isRotaPublica(pathname: string): boolean {
  return ROTAS_PUBLICAS.some((rota) => rota === pathname);
}
