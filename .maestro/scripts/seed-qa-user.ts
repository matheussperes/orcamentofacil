/**
 * ⚠️ FERRAMENTA DE QA LOCAL — NÃO É PARTE DO CI/CD DE PRODUÇÃO. ⚠️
 *
 * Este script vive em `.maestro/` (tooling do pipeline .maestro, não do
 * produto) e nunca é importado por `app/`, `lib/` ou `prisma/`. Ele NÃO
 * roda automaticamente em nenhum script npm de build/deploy (ver
 * `package.json` — `postinstall`/`build`/`db:seed` não o referenciam) e não
 * deve ser adicionado a nenhum workflow de CI automatizado.
 *
 * NUNCA rode este script com a `SUPABASE_SERVICE_ROLE_KEY` real de um
 * projeto de produção — ela é uma credencial privilegiada que ignora
 * Row Level Security. Use exclusivamente uma `SUPABASE_SERVICE_ROLE_KEY`
 * de um projeto Supabase de QA/local, isolado de dados reais de clientes.
 *
 * Seed script para o usuário de automação de QA do UX Auditor.
 *
 * Cria (ou reaproveita, se já existir) um usuário de teste autenticável
 * no Supabase para que o UX Auditor possa navegar pela aplicação em
 * estado logado durante a validação visual.
 *
 * Uso:
 *   npx tsx .maestro/scripts/seed-qa-user.ts
 *
 * Variáveis de ambiente obrigatórias (sem fallback — o script falha com
 * exit code 1 se qualquer uma estiver ausente):
 *   SUPABASE_URL              - URL do projeto Supabase de QA/local
 *   SUPABASE_SERVICE_ROLE_KEY - Service Role Key do projeto de QA/local (nunca a anon key, nunca a de produção)
 *   QA_USER_PASSWORD          - Senha do usuário de teste (sem valor padrão hardcoded)
 */

import { createClient } from "@supabase/supabase-js";

const QA_USER_EMAIL = "qa_automation_user@maestro.local";

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const qaUserPassword = process.env.QA_USER_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "[seed-qa-user] Faltam variáveis de ambiente: SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  if (!qaUserPassword) {
    console.error(
      "[seed-qa-user] Falta variável de ambiente: QA_USER_PASSWORD. Nenhum valor padrão é usado por segurança — defina-a antes de rodar o script."
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existing = await findUserByEmail(supabase, QA_USER_EMAIL);

  let userId: string;

  if (existing) {
    userId = existing.id;
    console.log(`[seed-qa-user] Usuário QA já existe (id: ${userId}). Reutilizando.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: QA_USER_EMAIL,
      password: qaUserPassword,
      email_confirm: true,
      user_metadata: { role: "qa_automation", created_by: "maestro-ux-auditor" },
    });

    if (error || !data.user) {
      console.error("[seed-qa-user] Falha ao criar usuário QA:", error?.message);
      process.exit(1);
    }

    userId = data.user.id;
    console.log(`[seed-qa-user] Usuário QA criado com sucesso (id: ${userId}).`);
  }

  const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
    email: QA_USER_EMAIL,
    password: qaUserPassword,
  });

  if (signInError || !session.session) {
    console.error("[seed-qa-user] Falha ao autenticar usuário QA:", signInError?.message);
    process.exit(1);
  }

  console.log("[seed-qa-user] Autenticação de QA validada com sucesso.");
  console.log(`[seed-qa-user] access_token (uso local do UX Auditor): ${session.session.access_token}`);

  process.exit(0);
}

async function findUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string
) {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error("[seed-qa-user] Falha ao listar usuários:", error.message);
    process.exit(1);
  }

  return data.users.find((user) => user.email === email) ?? null;
}

main().catch((error) => {
  console.error("[seed-qa-user] Erro inesperado:", error);
  process.exit(1);
});
