# Security Decline Payload

Auditoria completa do repositório (não é diff de task isolada) — solicitada diretamente pelo operador em 2026-07-21.

> **Atualização 2026-07-21 — Revalidação Stage 1**: os dois achados 🔴 Crítica abaixo
> (`/api/calcular` público + `expr-eval`, e senha hardcoded em `seed-qa-user.ts`)
> foram corrigidos nas Tasks 1.1/1.2/1.3 (`docs/Backlog.md`) e revalidados com
> ✅ APROVADO pelo Security Auditor (Tentativa 1), mesclados na branch principal.
> Os achados 🟡/🔵 restantes (rate limiting, cache sem limite, Auditoria não
> usada, headers de segurança) seguem pendentes — ver Stage 3 do Backlog.

---

- Target File: app/api/calcular/route.ts:26
- Category: OWASP - Injection (Unrestricted Resource Consumption / Prototype Pollution via biblioteca vulnerável)
- Severity: 🔴 Crítica
- Expected: Rotas que avaliam expressões dinâmicas com uma lib vulnerável e sem fix (`expr-eval@2.0.2`, GHSA-8gw3-rxh4-v6jx e GHSA-jc85-fpwf-qm7x) só podem aceitar fórmulas de fontes confiáveis (operador do sistema, templates estáticos versionados no repo), nunca de input de usuário final não autenticado.
- Found: `POST /api/calcular` não chama `getSession()` nem qualquer verificação de autenticação (rota deliberadamente pública, comentário no `middleware.ts:5`: "o motor de cálculo... fica público para a demo"). O body aceita `templates?: Record<string, ModuloTemplate>` (interface em `app/api/calcular/route.ts:21`) que sobrescreve a Biblioteca de Engenharia padrão via `resolveTemplate()` em `lib/engine/engine.ts:22-24` (`input.templates?.[codigo] ?? getTemplate(codigo)`). Cada `Componente.quantidade`/`dimensoes.altura`/`dimensoes.largura` é tipado como `string` livre ("número ou fórmula" — `lib/engine/types.ts:14-17`) e é avaliado sem qualquer whitelist/regex adicional em `lib/engine/evaluator.ts:25-52` via `parser.parse(expr).evaluate(scope)`. Não há biblioteca de validação de schema (zod/joi/ajv) no projeto — o body chega direto ao parser.
- Evidence: `npm audit --json` reporta `expr-eval` como `"severity": "high"`, `"isDirect": true`, `"fixAvailable": false`, com dois advisories: GHSA-8gw3-rxh4-v6jx ("Prototype Pollution", CVSS 7.3) e GHSA-jc85-fpwf-qm7x ("does not restrict functions passed to the evaluate function", CWE-94). `package.json` linha `"expr-eval": "^2.0.2"` resolve para a mesma versão vulnerável (`node_modules/expr-eval/package.json` → `"version": "2.0.2"`). Rota confirmada pública: ausente do `matcher` em `middleware.ts:20` (`["/api/clientes/:path*", "/api/orcamentos/:path*"]`) e sem chamada a `getSession()`/`verifySession()` em `app/api/calcular/route.ts`.

---

- Target File: .maestro/scripts/seed-qa-user.ts:19
- Category: Secret Exposto (credencial hardcoded)
- Severity: 🔴 Crítica
- Expected: Nenhuma credencial (mesmo de conta de automação/QA) deve ter um valor literal hardcoded como fallback no código-fonte. Deve falhar explicitamente (`process.exit(1)`) se a variável de ambiente não estiver definida — mesmo padrão já usado corretamente para `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` no mesmo arquivo (linhas 22-30).
- Found: `const QA_USER_PASSWORD = process.env.QA_USER_PASSWORD ?? "MaestroQA!2026";` — senha literal em texto plano no repositório, usada por `supabase.auth.admin.createUser()` (linha 44-49) para provisionar/autenticar uma conta real via Service Role Key sempre que a env var `QA_USER_PASSWORD` não for definida no ambiente que roda o script.
- Evidence: `.maestro/scripts/seed-qa-user.ts:18-19` (email fixo `qa_automation_user@maestro.local` + senha fixa `MaestroQA!2026`); comando de varredura: `grep -rn "password.*ENV.*??" .maestro/scripts/`.

---

- Target File: app/api/auth/login/route.ts:6
- Category: OWASP - Security Misconfiguration (ausência de rate limiting em endpoint sensível)
- Severity: 🟡 Média
- Expected: Endpoints de autenticação (`login`, `register`) devem ter throttling/rate limiting por IP e/ou por conta para mitigar força bruta de senha e enumeração de e-mail.
- Found: `POST /api/auth/login` (`app/api/auth/login/route.ts:6-38`) e `POST /api/auth/register` (`app/api/auth/register/route.ts:6-50`) não possuem nenhum mecanismo de limitação de tentativas — nenhuma dependência de rate limiting no projeto (`package.json` não lista `express-rate-limit`, `@upstash/ratelimit` ou equivalente) e nenhuma lógica de bloqueio/backoff no código.
- Evidence: comando de varredura `grep -rniE "rate.?limit" --include="*.ts" --include="*.tsx"` → nenhum resultado em todo o repositório.

---

- Target File: lib/engine/evaluator.ts:18
- Category: OWASP - Security Misconfiguration (Unrestricted Resource Consumption)
- Severity: 🟡 Média
- Expected: Um cache alimentado por strings vindas de uma rota pública e não autenticada precisa ter limite de tamanho/TTL/eviction, ou a chave de cache não pode ser derivada diretamente de input do atacante sem normalização.
- Found: `const cache = new Map<string, ReturnType<typeof parser.parse>>();` nunca é limpo, tem tamanho ilimitado e é indexado diretamente pela string de fórmula recebida em `body.templates` (via `/api/calcular`, rota pública — ver primeiro achado). Um atacante pode enviar um volume grande de fórmulas distintas (mesmo semanticamente idênticas com espaços/variações triviais) para inflar a memória do processo indefinidamente, já que o cache é um singleton em nível de módulo (sobrevive entre requisições no mesmo processo/lambda quente).
- Evidence: `lib/engine/evaluator.ts:18,32-36` — `cache.set(expr, parsed)` sem limite de entradas.

---

- Target File: prisma/schema.prisma:207
- Category: OWASP - Insufficient Logging
- Severity: 🔵 Baixa
- Expected: Operações sensíveis (login, alteração de permissão/papel, exclusão de dados) devem gravar um registro em `Auditoria` (entidade, ação, usuarioId, diff).
- Found: A tabela `Auditoria` existe no schema (`prisma/schema.prisma:207-217`) mas nunca é referenciada em nenhum lugar do código da aplicação — `prisma.auditoria` não aparece em nenhum arquivo `.ts` do projeto. Login (`app/api/auth/login/route.ts`), registro (`app/api/auth/register/route.ts`), exclusão de cliente (`app/api/clientes/[id]/route.ts:36-45`, `DELETE`) e criação de nova versão de orçamento (`app/api/orcamentos/[id]/versoes/route.ts:28-59`) não geram nenhum log estruturado.
- Evidence: comando de varredura `grep -rn "prisma\.auditoria\|Auditoria" --include="*.ts"` (fora de `schema.prisma`) → 0 ocorrências.

---

- Target File: next.config.js:1
- Category: OWASP - Security Misconfiguration (headers de segurança ausentes)
- Severity: 🔵 Baixa
- Expected: Headers de segurança básicos (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`) configurados via `headers()` no `next.config.js` ou no `middleware.ts`.
- Found: `next.config.js` só define `reactStrictMode: true` — nenhuma função `headers()` presente. `middleware.ts` também não injeta headers de segurança nas respostas.
- Evidence: `next.config.js:1-6` (arquivo completo, 6 linhas); `middleware.ts:1-22` sem `res.headers.set(...)`.

---

- Target File: .maestro/scripts/seed-qa-user.ts:16
- Category: Secret Exposto / Confusão de Superfície (dependência não utilizada em produção)
- Severity: 🔵 Baixa
- Expected: Ferramentas de automação auxiliares (fora do runtime do produto) que dependem de credenciais privilegiadas reais (`SUPABASE_SERVICE_ROLE_KEY`) devem ficar claramente isoladas do código de produção e não devem coexistir com o achado de credencial hardcoded acima.
- Found: Confirmado — `@supabase/supabase-js` está apenas em `devDependencies` (`package.json`) e é importado exclusivamente em `.maestro/scripts/seed-qa-user.ts:16`. Nenhum arquivo em `app/`, `lib/`, `prisma/` ou `middleware.ts` importa `@supabase/supabase-js` ou faz qualquer chamada a `supabase.*`. A autenticação real do produto usa Prisma + `jose` + `bcryptjs` (`lib/auth.ts`), confirmando que o Supabase é resquício de tooling do pipeline `.maestro` (QA automation), não parte do app. Risco real fica restrito ao achado de credencial hardcoded já reportado acima, mas o script deveria estar fora do caminho de deploy do produto (ex.: `.gitignore`/pasta separada) para evitar que uma `SUPABASE_SERVICE_ROLE_KEY` real de algum projeto seja usada acidentalmente em CI.
- Evidence: `grep -rn "supabase" -i app/ lib/ prisma/ middleware.ts` → 0 ocorrências; `grep -rln "@supabase/supabase-js"` → apenas `.maestro/scripts/seed-qa-user.ts` e `package.json`.
