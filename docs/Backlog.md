# Backlog — Plano de Refatoração Corretiva (Auditoria 2026-07-21)

> Gerado pelo Solution Architect a partir de: `npm audit`, Code Auditor
> (build/lint/typecheck/test) e Security Auditor
> (`.maestro/tmp/Security-Decline-Payload.md`). Este não é um backlog de
> features novas — é a fila de correção de dívida técnica e segurança do
> estado atual do produto (Next.js 14 + Prisma + motor paramétrico já
> funcional, ver `docs/STATUS.md`). Task ID numerado por Pipeline Stage,
> seguindo o padrão de `.maestro/contracts/Task-Execution-Contract.md`.

---

## ❓ Pergunta em Aberto — Decisão do Operador Necessária Antes da Task 1.3

`POST /api/calcular` é uma rota **deliberadamente pública** (comentário em
`middleware.ts:5`: "o motor de cálculo... fica público para a demo") que
aceita `templates` customizados no body e avalia fórmulas livres via
`expr-eval` — uma dependência com vulnerabilidade crítica sem fix disponível
(ver Task 1.2). Antes de executar a Task 1.3, o operador precisa decidir:

1. **`/api/calcular` deve continuar público** (aceitando `templates` do body,
   inclusive de visitante não autenticado) para sustentar a demo atual? Ou
2. **A rota deve passar a exigir sessão autenticada** (mesmo padrão de
   `/api/clientes/*` e `/api/orcamentos/*` no `middleware.ts:20`), aceitando
   overrides de `templates` só de usuários logados?
3. Existe uma terceira opção intermediária: manter a rota pública para o
   cálculo com a Biblioteca de Engenharia padrão do servidor, mas **ignorar/
   rejeitar** o campo `templates` do body quando a requisição não tiver
   sessão (elimina a superfície de ataque sem quebrar a demo pública)?

Este documento não decide isso por conta própria — a Task 1.3 abaixo fica
com status bloqueado até a resposta chegar. As Tasks 1.1, 1.2 e 1.4 (Stage 1)
não dependem dessa decisão e podem iniciar imediatamente.

---

## Análise Estrutural (Resumo)

- **Risco maior não é de arquitetura, é de superfície pública + dependência
  sem correção**: `/api/calcular` combina (a) exposição sem autenticação,
  (b) aceitação de fórmulas livres do body e (c) `expr-eval@2.0.2`, cuja
  vulnerabilidade de Prototype Pollution/execução de função não restrita não
  tem fix disponível na versão atual do pacote. É o único ponto onde as três
  camadas (rede, validação, dependência) falham ao mesmo tempo — ver Tasks
  1.1–1.4.
- **O pipeline .maestro está com um portão quebrado**: não existe config
  ESLint no projeto (`next lint` cai no wizard interativo e falha). Isso
  significa que o Code Auditor nunca rodou lint de fato até hoje — todo
  código já mesclado passou sem essa verificação. Tratar isso como
  bloqueador (Stage 2) antes de qualquer outra correção de qualidade faz
  sentido: sem lint funcionando, futuras tasks deste próprio backlog não têm
  como ser auditadas de forma completa.
- **A lacuna de persistência do orçamento (seção 4 do `docs/STATUS.md`) não
  entra neste backlog de correção.** É uma lacuna de escopo/produto (RF-002/
  RF-009 do PRD original), não um defeito de segurança ou qualidade
  introduzido por código existente — o `docs/STATUS.md` já a registra como
  pendência conhecida sem prazo. Ela é relevante para priorização apenas
  indiretamente: como o orçamento em produção ainda vive em `useState`
  client-side (não passa por `/api/orcamentos`), o raio de exposição imediato
  dos achados de segurança fica concentrado no motor de cálculo e nas rotas
  de auth/cliente/orçamento já existentes — não há uma superfície adicional
  "orçamento em produção" para proteger agora.
- **Os achados de "PASSOU" da auditoria já reduzem o escopo deste backlog**:
  autorização por tenant nas rotas de Cliente/Orçamento, zero SQL raw, zero
  CORS permissivo, cookies de sessão corretos (httpOnly/sameSite/secure) e
  `.env` não versionado já estão certos — nenhuma task abaixo repete esse
  trabalho.
- **Dependências major (Next.js, Vitest) são risco real mas não emergencial
  isolado**: nenhum dos CVEs do `next@14.2.5` tem exploração confirmada
  documentada como ativa contra este projeto especificamente, e o CVE crítico
  do `vitest@2.0.5` só se aplica com o UI server do Vitest escutando (não é o
  caso do pipeline de testes atual, que roda `vitest run`, não `vitest --ui`).
  Ainda assim ambos exigem bump major — tratados em Stage 4 com avaliação de
  risco, não execução imediata.

---

## Pipeline Stage 1 — Segurança: Crítico

### Task 1.1 — Remover senha hardcoded do script de seed QA
- **Status**: ✅ Concluído (2026-07-21, mesclada em `feature/stage1-security-critical`, aprovada por Code Auditor + Security Auditor)
- **Modelo Recomendado**: Haiku
- **Prioridade**: 🔴 Crítica
- **Executor sugerido**: Backend Engineer
- **Descrição objetiva**: `.maestro/scripts/seed-qa-user.ts:19` usa
  `process.env.QA_USER_PASSWORD ?? "MaestroQA!2026"` como fallback, ou seja,
  se a env var não estiver definida no ambiente que roda o script, uma senha
  literal em texto plano é usada para criar/autenticar uma conta real via
  Supabase Service Role Key. O mesmo arquivo já trata `SUPABASE_URL` e
  `SUPABASE_SERVICE_ROLE_KEY` corretamente (linhas 22–30: falha explícita com
  `process.exit(1)` se ausentes) — o mesmo padrão deve ser replicado para
  `QA_USER_PASSWORD`. Nenhuma lógica de negócio do produto depende disso;
  é isolado ao tooling de QA do pipeline .maestro.
- **Critérios de aceitação verificáveis**:
  - [ ] Nenhum valor literal de senha aparece em `.maestro/scripts/seed-qa-user.ts` (busca `grep -rn "MaestroQA" .maestro/` retorna vazio).
  - [ ] Script chama `process.exit(1)` com mensagem de erro clara se `QA_USER_PASSWORD` não estiver definida, antes de qualquer chamada ao Supabase.
  - [ ] `npx tsx .maestro/scripts/seed-qa-user.ts` sem a env var definida falha com exit code 1 e não realiza nenhuma chamada de rede.

### Task 1.2 — Mitigação compensatória para `expr-eval` sem fix disponível
- **Status**: ✅ Concluído (2026-07-21, mesclada em `feature/stage1-security-critical`, aprovada por Code Auditor + Security Auditor)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🔴 Crítica
- **Executor sugerido**: Backend Engineer
- **Descrição objetiva**: `expr-eval@2.0.2` (dependência direta) tem duas
  vulnerabilidades altas sem correção disponível na versão atual do pacote
  (Prototype Pollution GHSA-8gw3-rxh4-v6jx e execução de função não
  restrita GHSA-jc85-fpwf-qm7x). Como não há upgrade possível hoje, a
  correção precisa ser compensatória no ponto de uso: `lib/engine/
  evaluator.ts:25-52` deve normalizar/congelar o `scope` passado ao
  `parser.parse(expr).evaluate(scope)` (ex.: `Object.freeze`, bloquear chaves
  `__proto__`/`constructor`/`prototype` no objeto de variáveis) e restringir
  explicitamente quais funções o parser expõe (a doc `docs/09-devops-ci-cd.md`
  já previa "interpretador sem eval — whitelist de operadores e funções",
  nunca implementado). Documentar a mitigação como controle compensatório
  temporário até um upgrade ou substituição de biblioteca ser viável.
- **Critérios de aceitação verificáveis**:
  - [ ] `evaluator.ts` rejeita (lança erro tratado, não exceção não capturada) qualquer fórmula ou chave de `scope` contendo `__proto__`, `constructor` ou `prototype`.
  - [ ] Teste automatizado cobre uma tentativa de poluição de protótipo via fórmula/variável maliciosa e confirma que é bloqueada (não corrompe `Object.prototype`).
  - [ ] Comentário no código referencia as duas advisories (GHSA-8gw3-rxh4-v6jx, GHSA-jc85-fpwf-qm7x) e explica que é mitigação compensatória, não correção da lib.

### Task 1.3 — Endurecer acesso a `/api/calcular`
- **Status**: ✅ Concluído (2026-07-21 — operador decidiu "passar a exigir login"; mesclada em `feature/stage1-security-critical`, aprovada por Code Auditor + Security Auditor)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🔴 Crítica
- **Executor sugerido**: Backend Engineer
- **Descrição objetiva**: Hoje `POST /api/calcular` (`app/api/calcular/
  route.ts:26`) não verifica sessão e aceita `templates?: Record<string,
  ModuloTemplate>` no body sem nenhuma validação de schema (não há zod/joi/
  ajv no projeto) — o objeto chega direto ao motor e cada
  `quantidade`/`dimensoes.altura`/`dimensoes.largura` (strings livres,
  `lib/engine/types.ts:14-17`) é avaliado por `expr-eval`. A implementação
  exata depende da resposta à pergunta em aberto no topo deste documento:
  (a) exigir sessão via `middleware.ts` como as rotas de cliente/orçamento,
  (b) manter pública mas ignorar `templates` do body sem sessão, ou (c)
  manter como está (não recomendado, mas é decisão de negócio, não técnica).
  Em qualquer cenário escolhido, adicionar validação de schema estrutural
  (tamanho máximo de string de fórmula, caracteres permitidos, profundidade
  máxima do objeto `templates`) antes do body chegar ao motor.
- **Critérios de aceitação verificáveis**:
  - [ ] Comportamento de `/api/calcular` reflete literalmente a opção escolhida pelo operador na pergunta em aberto (documentar qual opção foi escolhida no PR).
  - [ ] Body de `templates` passa por validação de schema (biblioteca a escolher pelo executor) antes de chegar a `calcularEngine`/`resolveTemplate`, rejeitando payloads malformados com HTTP 400.
  - [ ] Teste automatizado cobre o caso de acesso sem sessão reproduzindo o comportamento decidido (bloqueado com 401, ou aceito mas sem repassar `templates`, conforme a opção escolhida).

### Task 1.4 — Isolar dependência de Supabase Service Role do caminho de deploy
- **Status**: ✅ Concluído (2026-07-21, mesclada em `feature/stage1-security-critical`, aprovada por Code Auditor + Security Auditor)
- **Modelo Recomendado**: Haiku
- **Prioridade**: 🟡 Alta (rebaixada de crítica por já estar isolada em devDependency, mas roda com credencial privilegiada real)
- **Executor sugerido**: Backend Engineer
- **Descrição objetiva**: `@supabase/supabase-js` está em `devDependencies` e
  só é importado por `.maestro/scripts/seed-qa-user.ts` — confirmado que
  nenhum arquivo em `app/`, `lib/` ou `prisma/` referencia Supabase (a
  autenticação real do produto é Prisma + jose + bcryptjs). O script roda
  com `SUPABASE_SERVICE_ROLE_KEY`, uma credencial privilegiada real. Mover o
  script para fora de qualquer diretório que participe do build/deploy de
  produção (confirmar que `.maestro/` já está excluído do bundle do Next —
  validar explicitamente) e documentar no próprio script que ele nunca deve
  rodar em CI de produção, apenas em ambiente local/QA controlado.
- **Critérios de aceitação verificáveis**:
  - [ ] Confirmado (via `next build` output ou config de tracing) que nada em `.maestro/` é incluído no output de build/deploy da Vercel.
  - [ ] Cabeçalho do script explicita que `SUPABASE_SERVICE_ROLE_KEY` real de produção nunca deve ser usado ao rodá-lo, e que é ferramenta de QA local, não de CI automatizado.
  - [ ] `package.json` não expõe um script npm (`db:seed`, etc.) que rode `seed-qa-user.ts` automaticamente em pipelines de deploy.

---

## Pipeline Stage 2 — Qualidade: Tooling (Bloqueador do Pipeline)

### Task 2.1 — Criar configuração ESLint funcional (destrava `npm run lint`)
- **Status**: ✅ Concluído (2026-07-21, mesclada em `feature/2.1-eslint-config`, aprovada por Code Auditor — `.eslintrc.json`, não `eslint.config.mjs`: `next lint` 14.2.x usa API legada e não reconhece flat config, confirmado empiricamente)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🔴 Crítica (bloqueador de processo — sem isso, o Code Auditor de toda task futura deste backlog é incompleto)
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: Não existe nenhum arquivo de configuração ESLint
  (`.eslintrc.json`, `.eslintrc.js` ou `eslint.config.*`) no projeto — `next
  lint` tenta abrir um wizard interativo de setup e falha (`exit 1`) em
  qualquer ambiente não interativo (CI, Code Auditor, terminal automatizado).
  Isso significa que **o projeto nunca teve lint rodando de fato** em nenhuma
  sessão anterior. Criar a configuração (flat config `eslint.config.mjs`,
  compatível com Next.js 14 + TypeScript, usando `next/core-web-vitals`)
  resolve isso de uma vez sem exigir interação humana. `docs/09-devops-
  cicd.md` já previa "Lint + typecheck" como primeira etapa do pipeline de CI
  — hoje essa etapa não existe de fato.
- **Critérios de aceitação verificáveis**:
  - [ ] `npm run lint` roda até o fim sem abrir prompt interativo e sem `exit 1` por ausência de config, em ambiente não interativo (`CI=true npm run lint`).
  - [ ] Configuração cobre `app/`, `lib/`, `engine/` (TypeScript + regras React/Next relevantes).
  - [ ] Erros de lint reais encontrados na primeira execução (se houver) são corrigidos ou documentados como exceção justificada no mesmo PR — não deixados como débito silencioso.

### Task 2.2 — Adicionar gate de lint ao pipeline de CI documentado
- **Status**: ⏱️ Planejado
- **Modelo Recomendado**: Haiku
- **Prioridade**: 🟡 Alta
- **Executor sugerido**: Backend Engineer
- **Descrição objetiva**: Depende da Task 2.1 estar concluída. `docs/09-
  devops-ci-cd.md` já descreve "Lint + typecheck (ESLint, tsc)" como etapa 1
  do pipeline de CI, mas o repositório não tem workflow de GitHub Actions
  correspondente versionado ainda (ou, se existir, não bloqueia merge sem
  lint funcional — validar antes de assumir). Garantir que o workflow de CI
  real execute `npm run lint` e `npm run typecheck` e bloqueie merge em
  falha, alinhando o comportamento real ao que a documentação já promete.
- **Critérios de aceitação verificáveis**:
  - [ ] Workflow de CI (`.github/workflows/*.yml`) executa `npm run lint` e `npm run typecheck` em todo PR.
  - [ ] Falha de lint ou typecheck bloqueia o merge (branch protection ou check obrigatório).
  - [ ] PR de teste com um erro de lint proposital confirma que o CI falha como esperado (evidência anexada ao PR, depois revertida).

---

## Pipeline Stage 3 — Segurança: Média/Baixa

### Task 3.1 — Rate limiting em `/api/auth/login` e `/api/auth/register`
- **Status**: ⏱️ Planejado
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🟡 Média
- **Executor sugerido**: Backend Engineer
- **Descrição objetiva**: `POST /api/auth/login` e `POST /api/auth/register`
  não têm nenhum mecanismo de throttling — nenhuma dependência de rate
  limiting está presente no projeto (`express-rate-limit`, `@upstash/
  ratelimit` ou equivalente), o que expõe as rotas a força bruta de senha e
  enumeração de e-mail. `docs/09-devops-ci-cd.md` já prevê Redis (Upstash)
  como cache de tabelas de preço na arquitetura — o mesmo provedor pode
  hospedar um limitador por IP/conta sem introduzir infraestrutura nova.
  Aplicar limite razoável (ex.: N tentativas por IP/e-mail por janela de
  tempo) com resposta HTTP 429 ao exceder.
- **Critérios de aceitação verificáveis**:
  - [ ] `/api/auth/login` e `/api/auth/register` retornam 429 após exceder o limite configurado de tentativas por IP (e por e-mail no caso do login) dentro da janela definida.
  - [ ] Limite não afeta uso legítimo em teste manual (poucas tentativas espaçadas continuam funcionando).
  - [ ] Configuração do limite (janela, contagem) documentada em variável de ambiente ou constante nomeada, não hardcoded sem explicação.

### Task 3.2 — Limitar tamanho do cache de fórmulas em `lib/engine/evaluator.ts`
- **Status**: ⏱️ Planejado
- **Modelo Recomendado**: Haiku
- **Prioridade**: 🟡 Média
- **Executor sugerido**: Backend Engineer
- **Descrição objetiva**: `const cache = new Map<string, ReturnType<typeof
  parser.parse>>()` em `lib/engine/evaluator.ts:18` nunca é limpo e cresce
  sem limite, indexado diretamente pela string de fórmula recebida — inclui
  fórmulas vindas do body de `/api/calcular` (rota pública, ver Task 1.3).
  Um volume grande de fórmulas distintas (mesmo variações triviais de
  espaçamento) infla a memória do processo indefinidamente, já que o cache é
  um singleton em nível de módulo que sobrevive entre requisições. Introduzir
  um limite de entradas (ex.: LRU com tamanho máximo) resolve sem alterar o
  comportamento funcional do cache para o caso de uso normal (poucas
  dezenas de fórmulas de templates fixos).
- **Critérios de aceitação verificáveis**:
  - [ ] Cache tem um limite máximo de entradas configurável (constante nomeada), com política de eviction (ex.: LRU) ao atingir o limite.
  - [ ] Teste automatizado envia mais fórmulas distintas que o limite configurado e confirma que o `Map`/estrutura de cache nunca ultrapassa o tamanho máximo.
  - [ ] Comportamento de cache para o conjunto normal de templates da Biblioteca de Engenharia não regride (mesmos testes de `engine.test.ts` continuam passando).

### Task 3.3 — Instrumentar a tabela `Auditoria` nas operações sensíveis
- **Status**: ⏱️ Planejado
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🔵 Baixa
- **Executor sugerido**: Backend Engineer
- **Descrição objetiva**: A tabela `Auditoria` existe no schema
  (`prisma/schema.prisma:207-217`, campos `entidade`, `entidadeId`, `acao`,
  `diff`, `usuarioId`, `criadoEm`) mas nunca é referenciada em nenhum arquivo
  `.ts` do projeto — zero logging de login, registro, exclusão de cliente
  (`app/api/clientes/[id]/route.ts` `DELETE`) ou criação de nova versão de
  orçamento (`app/api/orcamentos/[id]/versoes/route.ts`). Adicionar
  `prisma.auditoria.create(...)` nesses quatro pontos alimenta o módulo
  Histórico já previsto em `docs/02-arquitetura-sistema.md`. Escopo desta
  task é só os quatro eventos já citados pelo Security Auditor — não expandir
  para todos os endpoints do sistema sem uma decisão explícita à parte.
- **Critérios de aceitação verificáveis**:
  - [ ] Login bem-sucedido, registro de usuário, exclusão de cliente e criação de nova versão de orçamento gravam uma linha em `Auditoria` com `entidade`, `entidadeId`, `acao` e `usuarioId` corretos.
  - [ ] `diff` (quando aplicável, ex.: exclusão) registra o estado anterior relevante.
  - [ ] Falha ao gravar auditoria não derruba a operação principal (log de auditoria é best-effort, não transacional bloqueante — decisão a documentar no PR).

### Task 3.4 — Adicionar headers de segurança (CSP, X-Frame-Options, etc.)
- **Status**: ⏱️ Planejado
- **Modelo Recomendado**: Haiku
- **Prioridade**: 🔵 Baixa
- **Executor sugerido**: Backend Engineer
- **Descrição objetiva**: `next.config.js` só define `reactStrictMode: true`
  (arquivo completo de 6 linhas) e `middleware.ts` não injeta nenhum header
  de segurança nas respostas. Adicionar `Content-Security-Policy`,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e
  `Strict-Transport-Security` via `headers()` em `next.config.js` (ou
  injeção no `middleware.ts`, cobrindo também as rotas fora do matcher
  atual). CSP deve ser desenhado permitindo o que o app realmente usa
  (evitar `unsafe-inline` sem necessidade real).
- **Critérios de aceitação verificáveis**:
  - [ ] Resposta de qualquer rota da aplicação (não só as do matcher de `middleware.ts`) inclui os cinco headers listados.
  - [ ] CSP não quebra nenhuma funcionalidade existente testada manualmente (login, wizard, `/modulo`, `/biblioteca`).
  - [ ] Headers verificáveis via `curl -I` em ambiente local/staging após o deploy da task.

### Task 3.5 — Eliminar warning de Edge Runtime causado por `bcryptjs`
- **Status**: ⏱️ Planejado
- **Modelo Recomendado**: Haiku
- **Prioridade**: 🔵 Baixa
- **Executor sugerido**: Backend Engineer
- **Descrição objetiva**: `npm run build` reporta warning de que `bcryptjs`
  usa `process.nextTick`/`setImmediate`, incompatível com Edge Runtime.
  `lib/auth.ts` importa `bcrypt` no topo do módulo junto com `jose`, e
  `middleware.ts` (que roda em Edge Runtime) importa `verifySession` do
  mesmo `lib/auth.ts` — mesmo `verifySession` só usando `jose` internamente,
  o bundler do Next inclui o módulo inteiro (incluindo `bcryptjs`) no bundle
  de edge, gerando o warning. Separar `hashPassword`/`verifyPassword`
  (funções que realmente usam `bcryptjs`) para um módulo próprio (ex.:
  `lib/auth-node.ts`), importado só pelas rotas de login/registro (que rodam
  em Node.js runtime), elimina a referência a `bcryptjs` do bundle de edge
  sem mudar nenhum comportamento funcional.
- **Critérios de aceitação verificáveis**:
  - [ ] `npm run build` não reporta mais o warning de incompatibilidade de `bcryptjs` com Edge Runtime.
  - [ ] `middleware.ts` continua importando apenas `SESSION_COOKIE`/`verifySession` (ou equivalente pós-refatoração), sem `bcryptjs` na cadeia de imports.
  - [ ] Testes de login/registro existentes continuam passando sem alteração de comportamento.

---

## Pipeline Stage 4 — Dependências (Avaliação de Risco — Sem Compromisso de Execução)

> As duas tasks abaixo exigem bump de **versão major**. Não estão sendo
> executadas neste ciclo — ficam registradas com os riscos declarados para o
> operador decidir quando alocar um sprint dedicado a cada uma.

### Task 4.1 — Avaliar upgrade major `next@14.2.5` → `next@16.2.11`
- **Status**: ⏱️ Planejado (avaliação — não iniciar sem sprint dedicado)
- **Modelo Recomendado**: Opus (avaliação de breaking changes exige raciocínio sobre múltiplas áreas do App Router)
- **Prioridade**: 🟡 Alta (mitiga DoS via Image Optimizer, SSRF via WebSocket upgrade, cache poisoning, XSS em CSP nonces e HTTP request smuggling — mas é bump major, não corretiva pontual)
- **Executor sugerido**: Backend Engineer + Frontend Engineer (upgrade cruza ambas as camadas)
- **Descrição objetiva**: `next@14.2.5` (dependência direta) tem múltiplos
  CVEs de severidade alta cuja correção exige upgrade major para
  `next@16.2.11` (`isSemVerMajor: true` no `npm audit`). Um salto de duas
  versões major (14→15→16) do Next.js historicamente envolve mudanças de
  App Router, possível exigência de bump de React (verificar compatibilidade
  com a versão de React já usada no projeto), mudanças em `next.config.js`,
  comportamento de cache/fetch e possíveis mudanças de API de Middleware —
  qualquer uma dessas pode quebrar o motor V1/V3 coexistente descrito em
  `docs/STATUS.md` seção 7 ou o comportamento de `middleware.ts`. Esta task é
  **só a avaliação e o plano** — não o upgrade em si.
- **Critérios de aceitação verificáveis**:
  - [ ] Documento de avaliação lista, para a versão alvo (`next@16.2.11`), toda breaking change do changelog oficial que afeta padrões usados no projeto (App Router, `middleware.ts`, `next.config.js`, Edge Runtime).
  - [ ] Documento identifica se a versão de React atual do projeto é compatível ou também precisa de bump, e qual o impacto disso nas dependências de UI existentes.
  - [ ] Documento propõe um plano de rollback e critério de "go/no-go" (ex.: suíte de 86 testes + smoke test manual do wizard/`/modulo`/`/biblioteca` passando) antes de recomendar execução real.
  - [ ] Nenhuma alteração de código é feita nesta task — só o documento de avaliação.

### Task 4.2 — Avaliar upgrade major `vitest@2.0.5` → `vitest@4.1.10`
- **Status**: ⏱️ Planejado (avaliação — não iniciar sem sprint dedicado)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🟢 Normal (dependência de desenvolvimento; o CVE crítico reportado — GHSA-5xrq-8626-4rwp, CVSS 9.8 — só se aplica com o UI server do Vitest escutando, o que o pipeline atual, `vitest run`, não faz)
- **Executor sugerido**: Backend Engineer
- **Descrição objetiva**: `vitest@2.0.5` e a cadeia `vite`/`esbuild`/
  `vite-node`/`@vitest/mocker` reportam severidade crítica no `npm audit`
  ("arbitrary file can be read and executed quando UI server está
  escutando"). O fix exige upgrade major para `vitest@4.1.10`
  (`isSemVerMajor: true`), que historicamente muda formato de configuração,
  possivelmente exige Vite 5/6 (verificar compatibilidade com o restante do
  toolchain do projeto) e pode alterar comportamento de mocks/snapshots.
  Como o pipeline de testes do projeto roda `vitest run` (não `vitest --ui`,
  confirmado em `package.json`), o vetor de exploração do CVE crítico não
  está ativo no fluxo atual — isso reduz a urgência frente à Task 4.1, mas
  não elimina o valor de atualizar. Esta task é **só a avaliação e o plano**
  — não o upgrade em si.
- **Critérios de aceitação verificáveis**:
  - [ ] Documento de avaliação confirma que nenhum script do projeto ou de CI invoca `vitest --ui` (ou registra a mudança necessária se algum dia passar a invocar).
  - [ ] Documento lista as breaking changes relevantes do changelog do Vitest 3 e 4 que afetam a suíte atual (86 testes em 6 arquivos).
  - [ ] Documento propõe critério de "go/no-go": os 86 testes existentes devem passar sem alteração de asserts após o upgrade, só ajustes de configuração/import são aceitáveis.
  - [ ] Nenhuma alteração de código é feita nesta task — só o documento de avaliação.

---

## Épico — Refatoração Visual da Jornada do Cliente (Stages 5–9)

> Gerado pelo Solution Architect em 2026-07-21, a pedido do operador, a
> partir das 3 respostas de direcionamento (estilo SaaS moderno/clean tipo
> Linear/Notion; usuário-alvo marceneiro/lojista profissional com
> **prioridade desktop**; escopo Produção → Editor de Módulo → Biblioteca →
> Proposta, nesta ordem). Contrato de valores visuais: `docs/Design-System.md`
> — nenhuma task abaixo deve introduzir cor/espaçamento/raio fora do que está
> lá. Todas as tasks seguem para Code Auditor **e** UX Auditor (visual) antes
> do merge, como já é o padrão do pipeline — não repetido em cada task
> individualmente abaixo.

### ✅ Decisão registrada — Migração para Tailwind + shadcn/ui (2026-07-21)

O operador decidiu **migrar a camada de apresentação para Tailwind CSS +
shadcn/ui** (a v1 deste épico assumia CSS puro; a "pergunta em aberto" foi
respondida). Isso alinha o projeto ao próprio framework .maestro — o persona
`frontend-engineer.md` já define Tailwind + shadcn/ui como stack obrigatória.
Consequências (ver `docs/Design-System.md` v2, Seções 8 e 9):

- A **Stage 5 deixa de ser "trocar tokens em `globals.css`"** e passa a ser o
  **setup completo de Tailwind + shadcn/ui + fundação de tokens** (instalar
  dependências, criar `tailwind.config.ts`/`postcss.config.js`/
  `components.json`/`lib/utils.ts`, migrar `globals.css` para as diretivas
  Tailwind + CSS variables do shadcn com os hex da paleta, carregar Inter).
  Continua sendo **bloqueador único** das Stages 6–9.
- As **Stages 6–9 convertem página por página** de `style={{}}` inline para
  classes utilitárias Tailwind + componentes shadcn instalados via CLI
  (`npx shadcn@latest add …`), preservando 100% do comportamento (rotas,
  handlers, estado React, lógica de cálculo). Cada task segue para Code
  Auditor **e** UX Auditor antes do merge — a conversão incremental por página
  é justamente o que reduz o risco de regressão num produto já funcional.
- `app/proposta/proposta.css` é a **única exceção que permanece CSS**
  (documento de impressão A4 com `@media print`) — ver Task 9.1 e
  Design-System Seção 6.11.

Onde as tasks abaixo dizem "tokens" / "conforme Design-System Seção X",
leia-se agora "utilitários Tailwind / componente shadcn correspondente",
conforme reescrito em `docs/Design-System.md` v2.

---

## Pipeline Stage 5 — Setup Tailwind + shadcn/ui (fundação, bloqueador único)

> Pré-requisito de todas as demais tasks deste épico. Instala a stack nova,
> cria os arquivos de configuração, migra `app/globals.css` (compartilhado por
> `/`, `/modulo`, `/biblioteca`; `/proposta` usa CSS próprio, ver Task 9.1) e
> prova que build/lint/testes seguem verdes ANTES de qualquer conversão de
> página. Fatiada em 2 tasks (5.1 setup + 5.2 fundação/POC) para que o Code
> Auditor valide o ambiente antes de tokens.

### Task 5.1 — Instalar e configurar Tailwind + shadcn/ui
- **Status**: ✅ Concluído (2026-07-21, mesclada em `feature/5.1-setup-tailwind-shadcn`, aprovada por Code Auditor — Tailwind v3.4.19, shadcn `Button` provado via CLI; `app/globals.css` recebeu só as diretivas `@tailwind`, tema legado intacto; carregamento de Inter e CSS variables reais ficam para a Task 5.2, conforme os critérios de aceitação já definiam)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🔴 Crítica (bloqueia 5.2 e Stages 6–9)
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: Instalar as dependências listadas em
  `docs/Design-System.md` Seção 9 (`tailwindcss`, `postcss`, `autoprefixer`
  como devDeps; `class-variance-authority`, `clsx`, `tailwind-merge`,
  `lucide-react`, `tailwindcss-animate` como deps — confirmar versões
  compatíveis com Next 14.2.x / React 18). Criar `tailwind.config.ts` com
  `content` cobrindo `app/**` e `components/**` e o `theme.extend` completo dos
  tokens do Design-System (cores Seção 2, fontSize Seção 3, spacing Seção 4,
  borderRadius/boxShadow Seção 5, screens Seção 7) + plugin
  `tailwindcss-animate`. Criar `postcss.config.js`, `lib/utils.ts` (`cn()` com
  clsx + tailwind-merge) e inicializar o shadcn (`npx shadcn@latest init` →
  `components.json`, confirmando o alias `@/*` já presente em `tsconfig.json`).
  **Não converter nenhuma página ainda** — só deixar a stack instalada e
  compilando.
- **Critérios de aceitação verificáveis**:
  - [ ] `tailwind.config.ts`, `postcss.config.js`, `components.json` e `lib/utils.ts` existem e `npm run build` compila sem erro com Tailwind ativo.
  - [ ] `theme.extend` reproduz exatamente os hex/px de `docs/Design-System.md` Seções 2–7 (nenhum valor divergente da paleta documentada).
  - [ ] `npm run lint` (config `.eslintrc.json` da Task 2.1) e `npm run typecheck` passam.
  - [ ] `npm run test` (86 testes) passa sem alteração — nenhuma lógica tocada.
  - [ ] `npx shadcn@latest add button` roda com sucesso (prova de que o CLI está configurado), gerando `components/ui/button.tsx`.

### Task 5.2 — Fundação de tokens em `globals.css` + prova de conceito
- **Status**: ✅ Concluído (2026-07-21, mesclada em `feature/5.2-fundacao-tokens`, aprovada por Code Auditor + UX Auditor — CSS variables em HSL, Inter carregada, botão "Criar orçamento" convertido para `Button` shadcn. **Nota técnica não-bloqueante para Stage 6+**: `html { font-size: 15px }` é resquício do CSS legado pré-existente — todo componente `h-*`/`text-*` do Tailwind é calculado em `rem` a partir desse valor, não de 16px. Confirmar/normalizar antes ou durante a Task 6.1, para as alturas em px do Design-System (Seção 6.1: botão 36px) baterem exatamente.)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🔴 Crítica (bloqueia Stages 6–9)
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: Depende da Task 5.1. Substituir o tema escuro de
  `app/globals.css:1-12` pelas diretivas `@tailwind base/components/utilities`
  + `@layer base` com as CSS variables semânticas do shadcn (Design-System
  Seção 2.4) apontando para os hex da paleta clara; `html, body` com fundo
  `cinza-0` e texto `cinza-900`. Carregar Inter via `next/font/google` em
  `app/layout.tsx` (expondo `--font-inter`, `font-sans` no `<body>`).
  Converter **um** componente pequeno de ponta a ponta como prova de conceito
  (sugestão: o cabeçalho/toolbar de `app/page.tsx` OU o botão primário) para
  classes Tailwind + `Button` do shadcn, confirmando que o pipeline visual
  funciona antes das Stages 6–9. As classes CSS legadas (`.card`, `.modulo`
  etc.) que ainda forem usadas por páginas não convertidas podem coexistir
  temporariamente (removidas conforme cada página migra nas Stages 6–9).
- **Critérios de aceitação verificáveis**:
  - [ ] `app/globals.css` não contém mais hex do tema escuro antigo (`#0f1115`, `#171a21`, `#1f232c`, `#2a2f3a`, `#4f8cff`) — `grep` vazio.
  - [ ] `app/layout.tsx` carrega Inter via `next/font/google`; aba Network confirma fonte servida pelo próprio domínio (não `fonts.googleapis.com`).
  - [ ] O componente escolhido como POC renderiza via Tailwind/shadcn com os tokens corretos (inspeção visual + ausência de `style={{}}` inline nele).
  - [ ] `npm run build`/`lint`/`typecheck`/`test` passam.
  - [ ] Nenhuma página existente fica visualmente quebrada (tema claro aplicado; páginas ainda não convertidas continuam legíveis com as classes legadas coexistindo).

---

## Pipeline Stage 6 — Refatoração Visual: Produção (Fluxo Principal)

> Maior prioridade do escopo (definida pelo operador) — é a tela que o
> marceneiro usa no dia a dia para montar orçamentos. Depende da Task 5.1.

### Task 6.1 — Cabeçalho e barra de ações de `app/page.tsx`
- **Status**: ✅ Concluído (2026-07-21, mesclada em `feature/6.1-header-producao`, aprovada por Code Auditor + UX Auditor — `html { font-size: 15px }` legado corrigido para 16px nesta task, confirmado que `Button` agora renderiza os 36px exatos do Design System; zero overflow em 375px/1280px)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🔴 Alta
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: `app/page.tsx:311-331` (`<header className="top">`
  + `.toolbar`) hoje é um `<h1>`/`<p>` simples com links de texto separados
  por "·" e dois botões soltos (`Criar orçamento`, `Recarregar preset`).
  Reestruturar como um cabeçalho de produto (título `display` 28px/700 +
  navegação secundária com espaçamento `--gap-lg` entre itens, não mais
  separada por caractere "·" literal) e uma barra de ações com hierarquia
  clara entre a ação primária ("Criar orçamento", botão `.primary`) e a
  secundária ("Recarregar preset…", rebaixada a `.ghost` — já é `.ghost`
  hoje, só precisa herdar o novo token). Nenhuma mudança de comportamento/
  rota, só de apresentação.
- **Critérios de aceitação verificáveis**:
  - [ ] Header usa os tokens `display`/`titulo-secao` de `docs/Design-System.md` Seção 3, sem tamanho de fonte hardcoded fora da escala.
  - [ ] Navegação secundária (`/modulo`, `/biblioteca`, `/configuracoes/*`) não usa mais "·" como separador visual — usa espaçamento (`--gap-lg`) ou divisor sutil (`--cinza-200`).
  - [ ] Em largura < 768px, a navegação secundária quebra linha (`flex-wrap: wrap`) sem cortar nenhum link.
  - [ ] `npm run build`/`npm run test` passam; nenhuma rota ou handler de clique foi alterado.

### Task 6.2 — Stepper visual do `NovoModuloWizard` (Ambiente → Tipo → Modelo)
- **Status**: ✅ Concluído (2026-07-22, mesclada em `feature/6.2-stepper-wizard`, aprovada por Code Auditor + UX Auditor — `components/ui/stepper.tsx` novo; estados concluída/atual/pendente e fallback mobile "Passo N de 3" confirmados ao vivo no browser. Overflow horizontal de ~24px em 375px reportado 2x (Tasks 6.1 e 6.2) como pré-existente em `.card`/`.modulo` legado — não causado pelo stepper; endereçar explicitamente nas Tasks 6.3/6.4)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🔴 Alta
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: `NovoModuloWizard` (`app/page.tsx:803-899`) hoje
  mostra "1. Ambiente"/"2. Tipo"/"3. Modelo" como texto de label acima de
  cada `<select>`, sem indicador visual de progresso. Implementar o stepper
  horizontal especificado em `docs/Design-System.md` Seção 6.5 (círculos
  conectados, estados pendente/atual/concluída) acima dos três campos,
  com fallback compacto (rótulo "Passo N de 3" + barra fina) abaixo de
  768px. O estado "concluída" reflete `ambiente`/`tipo` já preenchidos
  (props já existentes no componente — não precisa de novo estado React).
  Manter o fluxo de 3 selects como está; só adiciona a camada visual de
  progresso por cima.
- **Critérios de aceitação verificáveis**:
  - [ ] Estados do stepper (pendente/atual/concluída) usam exatamente as cores/raios da Seção 6.5 do Design System.
  - [ ] Selecionar um ambiente marca a etapa 1 como "concluída" e avança o destaque para a etapa 2, sem re-render quebrado (testar manualmente o fluxo completo Ambiente→Tipo→Modelo).
  - [ ] Abaixo de 768px, o stepper completo não aparece — só a versão compacta (texto + barra), confirmando ausência de overflow horizontal.
  - [ ] Caso `presets.length === 0` (estado vazio já tratado em `app/page.tsx:820-830`), o stepper não aparece — o aviso de "nenhum módulo cadastrado" continua como está.

### Task 6.3 — Card de módulo expandido (`BoxModuloCard` / `TemplateModuloCard`)
- **Status**: ✅ Concluído (2026-07-22, mesclada em `feature/6.3-card-modulo-expandido`, aprovada por Code Auditor + UX Auditor — **causa raiz do overflow das Tasks 6.1/6.2 resolvida**: grid blowout em `.campos` legado, `grid-template-columns: repeat(auto-fit, minmax(90px,1fr))` sem `min-width:0`; corrigido para grid Tailwind com `min-w-0` por célula. Confirmado ao vivo: 0 overflow em 375px/768px/1280px com os 7 módulos do preset demo expandidos)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🟡 Média
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: `BoxModuloCard` (`app/page.tsx:904-1085`) e
  `TemplateModuloCard` (`app/page.tsx:693-799`) reestilizados conforme
  `docs/Design-System.md` Seção 6.3 (estado expandido): preview + campos
  principais (largura/altura/profundidade/cor/espessura) em grid com
  `--gap-sm`, botão "Outras configurações" (`app/page.tsx:1011-1014`)
  reestilizado como toggle secundário (não botão cheio), e o bloco de
  `TamponamentoConfig`/`MaterialModulo` com divisores `--cinza-200` entre
  seções ao invés das bordas atuais `var(--border)` (token antigo). Não
  altera nenhuma lógica de estado (`onAtualizar`, `outrasAbertas` etc.).
- **Critérios de aceitação verificáveis**:
  - [ ] Nenhuma referência a `var(--border)`/`var(--panel-2)` (tokens do tema antigo) permanece nestes dois componentes — todas as bordas usam `--cinza-200`/`--cinza-300`.
  - [ ] "Outras configurações" e "+ Personalizar cor das portas" seguem o padrão de botão secundário (ghost) da Seção 6.1, visualmente distintos do botão primário "Salvar".
  - [ ] Card expandido segue o padding/raio/sombra da Seção 6.3 (`--gap-lg`, `--radius-lg`, `--shadow-xs`).
  - [ ] Testar manualmente: abrir/fechar "Outras configurações", trocar cor/espessura de porta e tamponamento por lado continuam funcionando sem erro no console.

### Task 6.4 — Card de módulo colapsado (`ResumoModulo`) e ações (Salvar/Duplicar/Excluir)
- **Status**: ✅ Concluído (2026-07-22, mesclada em `feature/6.4-card-modulo-colapsado`, aprovada por Code Auditor + UX Auditor — card inteiro clicável para reabrir (com `stopPropagation` nos botões de ação), botão "Excluir" confirmado em `cinza-700` em repouso (não vermelho fixo). **Bug retroativo corrigido em `components/ui/button.tsx`**: ordem das chaves do `cva` (`variant` antes de `size`) fazia o `twMerge` descartar a cor de texto em botões `size="sm"` — afetava silenciosamente os botões ghost/danger pequenos já mesclados nas Tasks 6.1–6.3; corrigido sem mudar nenhum token. Ressalva: hover do `danger` não foi confirmável dinamicamente pela ferramenta de automação (limitação da ferramenta, não do CSS — análise estática de especificidade/ordem confirma que deve funcionar); recomenda-se checagem manual com mouse real em algum momento)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🟡 Média
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: `ResumoModulo` (`app/page.tsx:625-690`) e a linha
  de ações abaixo de cada módulo (`app/page.tsx:421-435`) reestilizados
  conforme `docs/Design-System.md` Seção 6.3 (estado colapsado): fundo
  `--cinza-50`, hover indicando que o card inteiro é clicável para
  "Editar" (hoje só o botão "Editar" reage — avaliar se o clique no card
  também deve reabrir, mantendo o botão como alternativa explícita, sem
  remover o botão). Botões Salvar/Duplicar/Excluir seguem a hierarquia
  primary/ghost/danger da Seção 6.1, com `flex-wrap: wrap` abaixo de 768px.
- **Critérios de aceitação verificáveis**:
  - [ ] Estado colapsado usa fundo `--cinza-50` e padding `--gap-md`, distinto visualmente do card expandido (`--cinza-0`/`--gap-lg`).
  - [ ] Botão "Excluir" usa a variante danger da Seção 6.1 (borda/texto neutro em repouso, vermelho só no hover) — não vermelho sólido permanente.
  - [ ] Em <768px, a linha de ações (Salvar/Duplicar/Excluir) quebra em múltiplas linhas sem cortar texto de nenhum botão.
  - [ ] Comportamento de expandir/colapsar (`minimizar`/`expandir` em `app/page.tsx`) não foi alterado — só a apresentação.

### Task 6.5 — Painel de resultado (Simulação comercial, KPIs, insumos, plano de corte)
- **Status**: ✅ Concluído (2026-07-22, mesclada em `feature/6.5-painel-resultado`, aprovada por Code Auditor + UX Auditor — KPI destaque em `accent` #2563EB, alerta de margem mínima em `--erro` confirmado nos dois sentidos ao vivo, tabelas conforme Seção 6.9, sliders com CSS customizado — Radix Slider avaliado e descartado por exigir mudar a assinatura `valor/onChange` do componente, fora do escopo "só apresentação". **Stage 6 (Produção) concluída.**

### Task 6.3b — [Mini-task de correção] Fix overflow horizontal em `BoxModuloCard`/`TemplateModuloCard`
- **Status**: ✅ Concluído (2026-07-22, mesclada em `feature/6.3b-fix-overflow-header`, aprovada por Code Auditor + UX Auditor)
- **Causa raiz confirmada**: `ModulePreview`/`BoxCanvas` (`<canvas>` de largura fixa, 168px/180px) dentro de `<div className="flex gap-3">` sem `flex-wrap`, ao lado da coluna de conteúdo — combinado com o grid legado de 1 coluna, causava "blowout" de min-content em telas estreitas.
- **Fix**: `flex flex-wrap gap-3 sm:flex-nowrap` nos dois containers (`app/page.tsx`), preview empilha acima do conteúdo abaixo de 480px.
- **Validação com metodologia reforçada** (para não repetir os 3 falsos-negativos anteriores): cross-check de `scrollWidth` vs `clientWidth`/`getBoundingClientRect().width` **+** varredura de pintura real (`elementFromPoint` em toda a altura da página) **+** teste de `scrollLeft` forçado. Confirmado independentemente pelo Maestro: em 375px, `scrollWidth === clientWidth` (0 residual); em 320px, um resíduo de 9px no `scrollWidth` isolado NÃO corresponde a nenhum elemento realmente pintado além da borda nem permite scroll real — é artefato de medição, documentado para não gerar falso alarme em auditorias futuras.
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🟡 Média
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: Coluna direita de `app/page.tsx:442-613` (cards
  "Simulação comercial", "Resultado" com KPIs, "Pré-orçamento de insumos",
  "Plano de corte"). Aplicar Seção 6.8 (KPI) — especialmente o `.kpi.destaque`
  do preço final passando de `--green` para `--accent` — e Seção 6.9
  (tabela) a `montarLinhasInsumos`/`engine.globais`. O slider de margem/
  desconto (`Slider`, `app/page.tsx:1286-1313`) ganha trilho/thumb na cor
  `--accent` no lugar do estilo nativo do navegador sem estilização atual.
  Botão "Gerar proposta (PDF)" permanece como ação primária de destaque no
  fim do painel.
- **Critérios de aceitação verificáveis**:
  - [ ] `.kpi.destaque` usa `--accent` (não mais `--green`) no valor e `--accent-subtle`/`--accent-border` no fundo/borda do tile.
  - [ ] Tabelas de insumos e elementos contínuos seguem o cabeçalho/linha/hover da Seção 6.9.
  - [ ] Sliders de margem/desconto têm indicação visual clara de valor atual (trilho preenchido até o thumb em `--accent`), testado nos extremos min/max.
  - [ ] KPI com `abaixoDaMargemMinima` (borda vermelha condicional, `app/page.tsx:484`) usa `--erro` (não mais `var(--red)`) e continua aparecendo condicionalmente.

---

## Pipeline Stage 7 — Refatoração Visual: Editor de Módulo (Laboratório `/modulo`)

> Segunda prioridade do escopo. Depende da Task 5.1. O laboratório é a fonte
> da verdade da engenharia (ver `docs/STATUS.md` Seção 3) — a task não pode
> alterar nenhum comportamento de seleção/cálculo, só a apresentação do
> accordion e do canvas.

### Task 7.1 — Accordion shell (`SecaoHeader` + 5 cards de seção)
- **Status**: ✅ Concluído (2026-07-22, mesclada em `feature/7.1-accordion-shell`, aprovada por Code Auditor + UX Auditor na Tentativa 2 — Tentativa 1 reprovada: header "aberta" sem `font-semibold`, corrigido e revalidado ao vivo, 600/16px confirmado. Ver Task 7.1b para um achado mais profundo encontrado durante esta revalidação)

### Task 7.1b — [Achado durante a Task 7.1] Fix estrutural: `cn()`/`tailwind-merge` descarta tokens de tipografia customizados
- **Status**: ✅ Concluído (2026-07-22, mesclada em `feature/7.1b-fix-tailwind-merge`, aprovada por Code Auditor + UX Auditor — `lib/utils.ts` usa `extendTailwindMerge` registrando os 7 tokens de fontSize como classGroup próprio, validado isoladamente (14 combinações) e ao vivo. **Escopo real maior que o estimado**: afetava TODO `<Button>` do app (não só `size="sm"`), incluindo o botão "Criar orçamento" (`variant="primary" size="default"`) — todos os botões já mesclados nas Stages 6/7.1 renderizavam texto em 16px em vez de 14px `text-corpo` até este fix. Confirmado corrigido ao vivo em `components/ui/stepper.tsx` e nos botões de produção)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🔴 Alta (bug de fundação, afeta silenciosamente qualquer combinação de tamanho de fonte customizado + cor via `cn()`)
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: `lib/utils.ts` usa `twMerge()` do pacote `tailwind-merge` sem configuração customizada. `tailwind-merge` não conhece os tokens de `fontSize` definidos em `tailwind.config.ts` (`display`, `titulo-secao`, `titulo-card`, `corpo`, `corpo-pequeno`, `legenda`, `valor-destaque`) e os trata como conflitantes com qualquer classe `text-{cor}`, descartando silenciosamente uma das duas (a que vier primeiro na string) sempre que ambas passam por `cn()`. Reproduzido isoladamente: `twMerge('text-legenda text-cinza-600')` → `"text-cinza-600"` (perde o tamanho). Achado ao vivo em `components/ui/stepper.tsx` (rótulos do Stepper renderizando 16px em vez de 12px/`legenda`). A correção da Task 6.4 no `button.tsx` (reordenar `size` antes de `variant` no objeto `variants` do `cva`) não resolveu a causa raiz — só reordenou qual classe vence nesse caso específico; o problema de fundo permanece.
- **Critérios de aceitação verificáveis**:
  - [ ] `lib/utils.ts` usa `extendTailwindMerge()` (ou equivalente) registrando os 7 tokens de `fontSize` customizados como grupo próprio, distinto do grupo de cor de texto.
  - [ ] `twMerge('text-legenda text-cinza-600')` (e as demais 6 combinações de token+cor) preserva AMBAS as classes, testado isoladamente via script Node.
  - [ ] Auditoria retroativa de todo componente em `components/ui/` e todo uso de `cn(...)` em `app/` (Stages 5-7 já mescladas) atrás de combinações silenciosamente quebradas — usar o mesmo método de `getComputedStyle` ao vivo (não só leitura de código) nos pontos onde token de tipografia + cor coexistem. Reportar e corrigir cada ocorrência encontrada (ex: `components/ui/stepper.tsx` já confirmado).
  - [ ] `npm run build`/`lint`/`typecheck`/`test` passam sem regressão.
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🔴 Alta
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: `SecaoHeader.tsx` e o cabeçalho dos 5 cards
  (`CaixaCard.tsx`, `DivisoesCard.tsx`, `PortasCard.tsx`, `GavetasCard.tsx`,
  `PuxadorCard.tsx`) reestilizados conforme `docs/Design-System.md` Seção
  6.4: estado "aberta" com header 16px/600 e borda inferior separando do
  corpo; estado "colapsada" com fundo `--cinza-50`, texto 14px/500
  `--cinza-600` e badge "editar" em `--accent` com ícone de lápis (SVG
  inline, sem lib de ícone). Adicionar o indicador de progresso da Seção
  6.5 acima da pilha de 5 cards, refletindo `secaoAberta`/`ORDEM_SECOES`
  (`app/modulo/page.tsx:73-74`) sem novo estado React — é só leitura do que
  já existe. Reduzir o gap entre os 5 cards para `--gap-sm` (reforça que são
  etapas de um fluxo, não painéis independentes — distinto do gap padrão
  entre cards de `--gap-lg`).
- **Critérios de aceitação verificáveis**:
  - [ ] Estados "aberta"/"colapsada" do header seguem exatamente os valores da Seção 6.4 (cores, tipografia, cursor).
  - [ ] Stepper acima dos 5 cards mostra a etapa atual sincronizada com `secaoAberta` em tempo real ao clicar "Salvar" em cada card (avança) e "editar" num card anterior (volta o destaque).
  - [ ] Gap entre os 5 cards do accordion é `--gap-sm` (8px), distinto do `--gap-lg` usado entre cards independentes nas demais páginas.
  - [ ] Fluxo completo Caixa→Divisões→Portas→Gavetas→Puxador testado manualmente sem regressão de comportamento (avançar/reabrir seções continua funcionando).

### Task 7.2 — Canvas de seleção (`BoxCanvas` modo laboratório + toolbar de modos)
- **Status**: ✅ Concluído (2026-07-22, mesclada em `feature/7.2-canvas-selecao`, aprovada por Code Auditor + UX Auditor — contêiner `#F8FAFC`/`#E2E8F0`/8px/100% confirmado; botão de modo ativo `#EFF6FF`/`#BFDBFE`/`#2563EB` confirmado; seleção de vão confirmada por leitura de pixel do canvas (`getImageData` → `#EFF6FF`); hover tracejado adicionado como funcionalidade nova, não existia antes. Zero overflow em 375px. **Gap identificado, sem task própria**: botões internos (Aplicar/Excluir/Salvar) dentro de `DivisoesCard`/`PortasCard`/`GavetasCard` continuam com CSS legado — nenhuma task do Backlog cobre explicitamente esses botões (7.1 = shell/header, 7.2 = canvas/toolbar de modo, 7.3 = painel direito). Decisão do operador pendente sobre se abre uma task 7.2b)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🔴 Alta
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: `BoxCanvas.tsx` (modo laboratório, usado em
  `app/modulo/page.tsx:505-516`) e a toolbar de botões "Selecionar vãos/
  divisões/portas/gavetas" (`app/modulo/page.tsx:497-504` + os botões
  equivalentes dentro de `DivisoesCard`/`PortasCard`/`GavetasCard`)
  reestilizados conforme Seção 6.6 (contêiner do canvas) e 6.1 ("botão de
  ícone", estado ativo/selecionado em `--accent-subtle`). Estados de vão
  hover/selecionado no canvas passam a usar `--accent`/`--accent-subtle` no
  lugar do `var(--accent)` antigo (mesmo conceito, valor de token
  atualizado). É puramente visual — nenhuma lógica de `onToggleVao`/
  `modoSelecao`/`vaosSelecionados` muda.
- **Critérios de aceitação verificáveis**:
  - [ ] Contêiner do canvas usa fundo `--cinza-50`, borda `--cinza-200`, `--radius-md`, `max-width: 100%` — testar em viewport de 375px de largura sem overflow horizontal.
  - [ ] Botão "Selecionar vãos" (e equivalentes de divisões/portas/gavetas) no estado ativo usa fundo `--accent-subtle` + borda `--accent-border`, distinto visualmente do estado inativo.
  - [ ] Vão hover (tracejado) e vão selecionado (sólido + fundo tintado) no canvas usam os valores exatos da Seção 6.6.
  - [ ] Os 4 modos de seleção (vãos único/múltiplo, divisões, portas, gavetas) testados manualmente sem regressão — clique continua selecionando/desselecionando corretamente.

### Task 7.2b — [Gap identificado na Task 7.2] Botões internos de `DivisoesCard`/`PortasCard`/`GavetasCard`
- **Status**: ⏱️ Planejado
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🟢 Normal
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: Os botões de ação internos (Aplicar, Excluir, Salvar e equivalentes) dentro de `app/modulo/DivisoesCard.tsx`, `PortasCard.tsx` e `GavetasCard.tsx` continuam com `<button className="primary"|"danger"|"ghost">` legado (CSS antigo), não convertidos por nenhuma das Tasks 7.1 (shell/header) ou 7.2 (canvas/toolbar de modo). Converter para o componente `Button` do shadcn (`variant="primary"/"ghost"/"danger"`, `size` conforme o contexto), consistente com o resto do editor já convertido. Não altera nenhuma lógica de estado/aplicação de divisão/porta/gaveta — só apresentação.
- **Critérios de aceitação verificáveis**:
  - [ ] Nenhum `<button className="primary"|"danger"|"ghost">` legado remanescente nos três arquivos.
  - [ ] Hierarquia visual primary/ghost/danger idêntica à já usada no resto do editor (Seção 6.1).
  - [ ] Fluxo de aplicar/excluir divisão, porta e gaveta testado manualmente sem regressão de comportamento.
  - [ ] `npm run build`/`lint`/`typecheck`/`test` passam sem regressão.

### Task 7.3 — Painel direito do editor (Custo ao vivo, Peças, Plano de corte)
- **Status**: ⏱️ Planejado
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🟢 Normal
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: Cards da coluna direita de `app/modulo/page.tsx:
  494-581` ("Custo ao vivo" com KPIs, "Peças" com tabela técnica, "Plano de
  corte" com `PlanoCorteCanvas`). Aplicar as mesmas Seções 6.8/6.9/6.6 já
  usadas nas Tasks 6.5/7.2, garantindo consistência visual entre produção e
  laboratório (mesmo componente de KPI e tabela, tokens idênticos). Sem
  mudança de dados exibidos.
- **Critérios de aceitação verificáveis**:
  - [ ] KPIs "Preço final"/"Custo direto" seguem exatamente o mesmo estilo da Task 6.5 (mesma classe/tokens, não uma variante paralela).
  - [ ] Tabela de peças técnicas segue a Seção 6.9 (cabeçalho, hover, colunas numéricas alinhadas à direita).
  - [ ] `PlanoCorteCanvas` mantém `max-width: 100%` e legibilidade em escala 1:10 testada em viewport de 1280px e 768px.
  - [ ] `npm run test` (86 testes) passa sem alteração — task não toca `lib/engine/box/cutting.ts` nem nenhuma lógica de cálculo.

---

## Pipeline Stage 8 — Refatoração Visual: Biblioteca (`/biblioteca`)

> Terceira prioridade do escopo. Depende da Task 5.1. Página só de tabelas/
> formulário simples — menor complexidade visual das quatro áreas.

### Task 8.1 — Tabelas de categorias e módulos cadastrados
- **Status**: ⏱️ Planejado
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🟢 Normal
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: `app/biblioteca/page.tsx` inteiro (101–219):
  tabela de categorias/ambientes com ações inline (Renomear/Excluir,
  variante pequena da Seção 6.1), formulário de nova categoria, filtros de
  categoria/tipo e tabela de módulos cadastrados com ação "Abrir no editor".
  Aplicar Seção 6.9 (tabela) e 6.7 (campos de filtro/input). O botão
  "Abrir no editor" (link + botão aninhado, `app/biblioteca/page.tsx:208`)
  vira um único botão/link estilizado, sem alterar a navegação
  (`/modulo?preset=ID`).
- **Critérios de aceitação verificáveis**:
  - [ ] As duas tabelas (categorias, módulos) seguem a Seção 6.9 (cabeçalho `--cinza-50`, hover de linha, alinhamento numérico onde aplicável).
  - [ ] Filtros de categoria/tipo (`<select>`) seguem a Seção 6.7 (altura, borda, foco).
  - [ ] Ações "Renomear"/"Excluir" usam a variante pequena de botão (28px) da Seção 6.1; "Excluir" segue a variante danger (neutro em repouso, vermelho só no hover).
  - [ ] Fluxo completo testado manualmente: criar categoria, renomear, trocar categoria de um preset, excluir categoria vazia, tentar excluir categoria em uso (deve continuar bloqueando com o alerta existente) — nenhuma regressão de comportamento.
  - [ ] Em <768px, nenhuma tabela gera overflow horizontal do `body` — scroll fica contido no próprio wrapper da tabela.

---

## Pipeline Stage 9 — Refatoração Visual: Proposta (documento final ao cliente)

> Quarta prioridade na ordem pedida pelo operador, mas o próprio operador
> observou que é "provavelmente o mais importante para causar boa
> impressão" — é o único artefato deste produto que o marceneiro entrega
> diretamente ao cliente final dele. Depende apenas da leitura de
> `docs/Design-System.md` (não depende da Task 5.1, pois `proposta.css` é
> isolado de `globals.css` por design — ver `docs/STATUS.md`/comentário no
> topo do arquivo).

### Task 9.1 — Migrar `proposta.css` para os tokens do Design System
- **Status**: ⏱️ Planejado
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🟡 Alta
- **Executor sugerido**: Frontend Engineer
- **Descrição objetiva**: `app/proposta/proposta.css` (167 linhas) hoje
  tem uma paleta hardcoded própria (`#1c2430`, `#64748b`, `#94a3b8`,
  `#e2e8f0`, `#2563eb`, `#f1f5ff`, etc.) que por coincidência já é muito
  próxima da paleta nova — substituir cada valor pelo token equivalente da
  Seção 2/6.11 do Design System (mapeamento exato já listado lá), sem
  alterar a estrutura HTML de `app/proposta/page.tsx` nem o comportamento de
  impressão (`@media print`, `window.print()`). Aplicar a fonte Inter
  (carregada globalmente na Task 5.1 via `next/font`) também neste
  documento, e revisar a hierarquia tipográfica da capa (`.capa h1`, hoje
  30px sem token definido) para usar o token `display` (28px/700) da Seção
  3 — ajuste de 2px, decisão consciente de manter consistência com o resto
  do produto em vez de um valor solto só para a proposta.
- **Critérios de aceitação verificáveis**:
  - [ ] Nenhum valor hex de cor permanece hardcoded em `proposta.css` — todos correspondem a um token de `docs/Design-System.md` (mapeamento da Seção 6.11).
  - [ ] `.capa h1` usa o token `display` (28px/700), não mais 30px solto.
  - [ ] `window.print()` gerando PDF via "Salvar em PDF" do navegador continua produzindo layout correto em papel A4 (testar manualmente: capa, tabela de composição, rodapé sem cortes entre páginas).
  - [ ] Estado vazio (`.proposta-vazia`, sem dados em `sessionStorage`) também migra para os tokens novos (hoje usa `#cbd5e1`/`#4f8cff` do tema escuro antigo, órfãos desde sempre nesse arquivo claro).
  - [ ] Testar manualmente o fluxo completo: calcular orçamento em `/`, clicar "Gerar proposta (PDF)", conferir visual da proposta em nova aba e o botão "Imprimir/Salvar em PDF".

---

## Resumo por Stage

| Stage | Tasks | Prioridade dominante |
|---|---|---|
| 1 — Segurança: Crítico | 1.1 ✅, 1.2 ✅, 1.3 ✅, 1.4 ✅ | 🔴 Crítica (concluída) |
| 2 — Qualidade: Tooling | 2.1 ✅, 2.2 | 🔴 Crítica / 🟡 Alta (bloqueador de processo) |
| 3 — Segurança: Média/Baixa | 3.1, 3.2, 3.3, 3.4, 3.5 | 🟡 Média / 🔵 Baixa |
| 4 — Dependências | 4.1, 4.2 | 🟡 Alta / 🟢 Normal (avaliação, não execução) |
| 5 — Visual: Setup Tailwind + shadcn/ui | 5.1, 5.2 | 🔴 Crítica (bloqueador das Stages 6–9) |
| 6 — Visual: Produção | 6.1, 6.2, 6.3, 6.4, 6.5 | 🔴 Alta / 🟡 Média |
| 7 — Visual: Editor de Módulo | 7.1, 7.2, 7.3 | 🔴 Alta / 🟢 Normal |
| 8 — Visual: Biblioteca | 8.1 | 🟢 Normal |
| 9 — Visual: Proposta | 9.1 | 🟡 Alta |

**Total: 26 tasks em 9 Pipeline Stages** (13 de correção/dívida técnica —
Stage 1 e Task 2.1 já concluídas — + 13 do épico de refatoração visual da
jornada do cliente, agora sobre Tailwind + shadcn/ui).

---

# ÉPICO V2 — Reorientação do Produto (Briefing V2)

> **Adicionado na Fase A (Discovery), 2026-07-24.** Fonte:
> `docs/00-briefing-v2-reorientacao_1.md`, `docs/Modelo-de-Dominio.md`,
> `docs/PRD.md`, `docs/Mapa-de-Telas.md`. Isto **reorienta** o backlog: as
> Stages 1–9 acima eram correção + refatoração visual da V1; daqui em diante é
> a construção da V2 do produto (motor estendido + Supabase multi-tenant + UI
> reconstruída). As Stages seguem a numeração e continuam em Fase B (motor/
> dados) e Fase C (telas).

## Status das Stages 1–9 sob a ótica da V2

| Stage | Reaproveitamento na V2 |
|---|---|
| 1 (Segurança crítica) ✅ | **Mantido.** Princípios valem. `/api/calcular` e `seed-qa-user.ts` mudam de forma na migração Supabase, mas as correções não se perdem. |
| 2.1 (ESLint) ✅ | **Mantido integralmente.** |
| 2.2 (CI lint gate) | **Mantido** — reavaliar após a migração de infra. |
| 3.x (segurança média/baixa) | **Parcial.** 3.1 (rate limiting) e 3.5 (bcrypt Edge) ficam obsoletos com Supabase Auth. 3.3 (auditoria) e 3.4 (headers) seguem válidos. Rever na Fase B. |
| 4.x (upgrades major) | **Mantido** como avaliação. |
| 5.1/5.2 (Tailwind+shadcn) ✅ | **Base da Fase C.** Reaproveitado integralmente. |
| 6.1–6.5 (Produção) ✅ | **Parcialmente superseguido.** `app/page.tsx` é decomposto nas abas de `/orcamento/[id]`. Componentes/padrões (Button, Stepper, KPI, tabela) sobrevivem; o layout de página única não. |
| 7.1/7.2 ✅ | **Base direta do Editor de Item** (`/modulo` → `/orcamento/[id]/item/[itemId]`). Reaproveitado. |
| 7.2b, 7.3, 8.1, 9.1 (planejadas) | **Reabsorvidas** pela Fase C: 7.3 (painel direito) → Editor de Item; 8.1 (Biblioteca) → tela `/biblioteca` da V2; 9.1 (proposta.css) → tela de proposta da V2. Executar dentro da Fase C, não isoladamente. |

---

## Pipeline Stage 10 — Remoção do Motor V1 (Fase B, primeiro passo pós-PRD)

> **Bloqueia** o resto da Fase B (o modelo de dados novo não deve conviver com
> os tipos do V1). Lista **verificada no código**, não presumida.

### Task 10.1 — Remover o motor de templates (V1), preservando o compartilhado
- **Status**: ✅ Concluído (2026-07-24, mesclada em `feature/10.1-remover-motor-v1`, aprovada por Code Auditor + teste funcional ao vivo — `consolidarResultados` extraído para `lib/engine/consolidar.ts`; 11 arquivos V1 removidos (~1900 linhas líquidas); `ModuloOrcamento` reduzido a `{origem: "custom_box"}` (união de 1 membro, Task 12.1 adiciona `"placa"`); fluxo completo confirmado no browser (preset de caixa → BOM → preço → insumos, R$ 2.590,21). **69/96 testes restantes** (não 73 — o Backlog não contava os 4 testes de `app/api/calcular/route.test.ts`, 100% V1, removidos junto). Achado lateral: nenhuma rota além de `/api/calcular` tinha teste próprio de padrão `getSession()`→401 — gap pré-existente, não regressão, registrado para Stage 11)
- **Modelo Recomendado**: Sonnet
- **Prioridade**: 🔴 Alta
- **Executor sugerido**: Backend Engineer
- **Descrição objetiva**: Remover o motor V1 de templates. **Nuance crítica
  verificada**: `lib/engine/engine.ts` exporta `consolidarResultados` (linha
  327 — COMPARTILHADO, usado pelo caminho de caixa em `lib/orcamento.ts`) E
  `calcularEngine` (linha 380 — só V1). **Não apagar `engine.ts` inteiro** —
  extrair `consolidarResultados` para um módulo próprio (ex:
  `lib/engine/consolidar.ts`) antes de remover o resto.
- **Arquivos a remover** (V1-only, confirmados por grep):
  - `lib/engine/templates.ts`, `lib/engine/evaluator.ts` (+ `evaluator.test.ts`)
  - `lib/templateOverrides.ts`
  - `lib/engine/engine.ts` (após extrair `consolidarResultados`) + `engine.test.ts` (17 testes V1)
  - `lib/validation/templates.ts` (validava o body de templates de `/api/calcular`)
  - `app/api/calcular/route.ts` (100% V1 hoje — recebe `ModuloInstanciado[]`, chama `calcularEngine`; o caminho de caixa roda client-side, não por esta rota) — remover ou reconstruir na Fase C se uma rota de cálculo server-side for necessária
  - `app/api/templates/route.ts`
  - `app/configuracoes/engenharia/page.tsx` (editor de fórmulas do V1)
- **Arquivos a alterar**:
  - `lib/orcamento.ts` — trocar o branch `origem: "template"` por `origem: "placa"` (NÃO colapsar o union); remover `calcularOrcamentoMisto`'s ramo de template.
  - `app/page.tsx` — remover os 10 pontos de `origem === "template"` / criação de item template (será decomposto na Fase C de qualquer forma; nesta task, no mínimo, deixar de referenciar o V1 sem quebrar o build).
  - `prisma/seed.ts` — remove seed de templates (sai junto com o Prisma na Task 11.1 de qualquer forma).
- **Critérios de aceitação verificáveis**:
  - [ ] Nenhum import de `lib/engine/engine`, `templates`, `evaluator`, `templateOverrides` fora dos arquivos removidos (grep vazio).
  - [ ] `consolidarResultados` preservado e o caminho de caixa (`explodeBox` → BOM → plano de corte) continua funcionando.
  - [ ] `npm test` verde **sem** os 23 testes de V1 (`engine.test.ts` 17 + `evaluator.test.ts` 6) e **sem testes órfãos**. Restam os testes do V3.
  - [ ] `npm run build`/`lint`/`typecheck` limpos.

## Pipeline Stage 11 — Persistência multi-tenant (Fase B)

> Maior mudança de infraestrutura do plano (D-14). Detalhamento fino de cada
> migration/política fica para quando a Stage iniciar; aqui o recorte.

- **Task 11.1** — ✅ **Concluído (2026-07-24**, mesclada em `feature/11.1-supabase-auth`, aprovada por Code Auditor + Security Auditor). Projeto Supabase `orcamentofacil` (`ioakptuwhfvlirvrciwg`). 4 migrations versionadas em `supabase/migrations/` **e** aplicadas: `organizacao` + `perfil` com RLS e políticas, função `private.org_do_usuario()` (SECURITY DEFINER, `search_path=''`, fora do PostgREST) e trigger `on_auth_user_created` que cria org+perfil no signup (torna D-13 real). Clientes Supabase separados (`lib/supabase/{client,server,middleware}.ts`). **Prisma removido inteiro** (schema, seed, `@prisma/client`, `prisma`, `bcryptjs`, `jose`) + rotas V1 `/api/auth/*`, `/api/clientes/*`, `/api/orcamentos/*` (desenhadas para o modelo V1, nunca ligadas ao fluxo de caixa — Fase C constrói o acesso a dados do V2). **`get_advisors` security: zero achados** (o executor endureceu as funções SECURITY DEFINER após 2 achados intermediários). Verificado pelo Maestro: `.env` não rastreado, `.env.example` só com placeholders, zero `service_role` hardcoded. 69/69 testes; fluxo de caixa intacto (R$ 2.590,21, idêntico à Task 10.1).
  - **Pendências herdadas para 11.2+**: (a) `modo_precificacao_padrao`/`modo_montagem_padrao` gravados como `jsonb` com defaults placeholder — a Task 12.6 define o shape real; (b) UPDATE em `organizacao`/`perfil` liberado para qualquer membro da org, sem granularidade por `papel` — definir regra quando houver caso de uso.
- **Task 11.2** — ✅ **Concluído (2026-07-27**, mesclada em
  `feature/11.2-modelo-dados-multitenant`, aprovada por Code Auditor +
  auditoria de segurança do Maestro). 9 tabelas criadas e aplicadas ao projeto
  real (`ioakptuwhfvlirvrciwg`), uma migration por tabela (`ambiente`+`parede`
  juntas, mesma unidade conceitual): `cliente`, `produto`, `gabarito`,
  `orcamento`, `ambiente`, `parede`, `elemento_continuo`, `linha_proposta`,
  `lista_material`. Todas com RLS + políticas explícitas na própria migration,
  usando `private.org_do_usuario()` (initplan-otimizada, padrão da 11.1).
  **`get_advisors` security: zero achados** (verificado pelo Maestro, não só
  relatado pelo executor). **Decisões de design fechadas nesta task** (ver
  `.maestro/tmp/schema.sql` para o rascunho de referência completo):
  `organizacao_id` denormalizado em toda tabela (RLS direta, não via join —
  facilita o teste de isolamento por tabela da 11.3); `gabarito` é a única
  tabela com `organizacao_id` nullable (null = base global read-only, D-15);
  `lista_material` sem política de UPDATE (snapshot imutável, Seção 5.4);
  `elemento_continuo.alvo` é jsonb solto sem FK (Conjunto não é entidade
  persistida nesta task — fora de escopo, não inventado). `produto` e
  `gabarito` nascem vazios; população (cópia no signup / fork) é Task 11.4.
  `npm run build`/`lint` limpos.
  - **Pendência herdada para 11.3+**: `orcamento.cliente_id` não tem
    verificação de integridade cross-tabela (trigger) garantindo que o
    cliente pertence à mesma `organizacao_id` do orçamento — hoje mitigado só
    pela RLS de `cliente` impedir o app de selecionar cliente de outra org.
    Considerar ao desenhar os testes de isolamento.
- **Task 11.3** — ✅ **Concluído (2026-07-27**, mesclada em
  `feature/11.3-teste-isolamento-tenant`, aprovada por Code Auditor +
  verificação independente do Maestro). `supabase/tests/isolamento-tenant.sql`:
  script único `begin;...rollback;`, roda contra o projeto real
  (`ioakptuwhfvlirvrciwg`) sem deixar resíduo e sem precisar da
  `service_role_key` — simula cada tenant via `set local role authenticated`
  + `set local request.jwt.claims`, cobrindo as **11 tabelas multi-tenant**
  (as 9 da Task 11.2 + `organizacao`/`perfil` da 11.1, que ainda não tinham
  esse teste). Confirma, por tabela: controle positivo (tenant A vê a própria
  linha), tenant B não lê/edita/apaga linha de tenant A (SELECT/UPDATE/DELETE
  = 0), caso especial `gabarito` (linha global visível a ambos, editável por
  nenhum), caso especial `lista_material` (UPDATE = 0 até para o dono, sem
  política). Maestro rodou o script de novo por conta própria (não só
  aceitou o relato do executor) e confirmou zero resíduo em `auth.users` e
  `gabarito` depois. 🔴 Alta · Sonnet. **Critério de aceitação, não
  follow-up — cumprido.**
- **Task 11.4** — ✅ **Concluído (2026-07-27**, mesclada em
  `feature/11.4-estrategia-catalogo`, aprovada por Code Auditor + verificação
  independente do Maestro). Duas migrations: (1) `seed_produtos_padrao()` +
  trigger `on_organizacao_created` (AFTER INSERT em `organizacao`, separada
  de `handle_new_user` de propósito — não mistura responsabilidades) copia o
  catálogo padrão pra cada org nova: 8 chapas (`lib/catalog.ts`
  `CATALOGO_PADRAO.mdf`) + 10 ferragens + 1 fita (`lib/engine/prices.ts`
  `PRECOS_REFERENCIA`) = 19 linhas em `produto`. `led`/`acessorio` nascem
  vazios (sem dado de referência hoje). `montagemPorM2`/`freteFixo`
  propositalmente **não** migrados (D-23/D-26 — já viraram
  `organizacao.modo_montagem_padrao`/`orcamento.frete`). (2)
  `fork_gabarito(uuid)` (SECURITY INVOKER — leitura via RLS normal do
  chamador, escrita cria linha própria com `origem_gabarito_id` de linhagem);
  sem seed de gabaritos globais (não existe biblioteca "oficial" de módulos
  no código ainda — fica para quando o operador definir). `get_advisors`
  security zero achados. Maestro rodou o teste transacional de novo por
  conta própria (contagem exata 8/10/1/0/0/19, fork validado, exceção
  correta para id inexistente, zero resíduo). 🟡 Média · Sonnet.
  - **Nota do operador**: os ~380 padrões reais de MDF do operador (tem em
    Excel) ficam para depois — via Supabase Table Editor diretamente
    (`produto` já tem RLS completa por org) ou, preferencialmente, quando a
    tela de catálogo da Fase C existir (Stage 13). Não adiantado aqui por
    decisão explícita do operador.

## Pipeline Stage 12 — Extensões do motor (Fase B)

- **Task 12.1** — Primitiva `Placa` + modificadores. `ItemOrcamento` union
  `BoxModule | Placa`. 🔴 Alta · Sonnet.
  **Regras corrigidas na auditoria de 2026-07-24** (`docs/Modelo-de-Dominio.md`
  2.1 — usar como especificação, não a versão antiga):
  *engrossada* = placa + sarrafos de 70mm nas bordas (peça OCA), camadas por
  lado `{30→1, 45→2, 60→3}`, sarrafo do eixo maior inteiro e do menor
  encaixado entre eles; *dobrada* = placas inteiras laminadas (MACIÇA)
  `{30→2, 45→3, 60→4}`; **seleção de quais lados engrossar**; **fita derivada
  da espessura final** (15/18→22 · 30→35 · 45/60→65).
  **Testes obrigatórios**: reproduzir os 6 exemplos trabalhados do operador
  (peça a peça) + casos de engrossamento parcial + validação de nível máximo
  por base (ver nota abaixo).
  **Decisão fechada (2026-07-27)**: base 18 mm tem nível máximo **2** (54 mm)
  — nível 3 (72 mm) excede a fita disponível e não é oferecido para essa
  base, nas duas técnicas. Base 15 mm mantém os 3 níveis. Não é mais
  pendência — a task implementa a validação, não decide o valor
  (`docs/Modelo-de-Dominio.md` Seção 2.1).
  - ✅ **Concluído (2026-07-27**, mesclada em `feature/12.1-primitiva-placa`,
    aprovada por verificação independente do Maestro — checagem manual da
    matemática dos 6 exemplos contra o código, não só o relato do executor).
    Novo módulo `lib/engine/placa/` (`types.ts`, `explode.ts`, `explode.test.ts`,
    `index.ts`): `Placa` reaproveita `BoxMaterial` (não criou `MaterialRef`
    novo); `explodePlaca()` no mesmo estilo puro de `box/explode.ts`.
    `ModuloOrcamento` em `lib/orcamento.ts` virou union real de 2 membros;
    `app/page.tsx` só ganhou o glue mínimo de tipagem pra continuar
    compilando (sem editor de Placa — fica pra Fase C, de propósito). 83/83
    testes (14 novos, 0 regressão), build/lint/typecheck limpos.
    **Decisões de design sem resposta explícita na spec** (documentadas no
    código, revisadas pelo Maestro): `material_tipo: "prateleira"` pra `Peca`
    de placa (enum compartilhado com V1, não alterado sem validar);
    `AcabamentoBorda = { presente: boolean }` (largura da fita é metadado de
    pricing futuro, não alimenta `Peca` ainda); `fita_m` sempre 0 em peças de
    Placa (mesmo motivo); ripado tem precedência sobre engrossamento quando
    ambos setados (combinação fora dos 6 exemplos trabalhados); fórmula do
    ripado: N ripas cobrindo a dimensão menor, espaçamento derivado da maior.
- **Task 12.2** — ✅ **Concluído (2026-07-27**, mesclada em
  `feature/12.2-parede-ambiente-posicionamento`, aprovada por verificação
  independente do Maestro — matemática dos casos de teste conferida à mão).
  Novo módulo `lib/engine/parede/` (`types.ts`, `validar.ts`,
  `validar.test.ts`, `index.ts`): `Parede`, `Ambiente`, `ElementoParede`,
  `ItemPosicionado`, `Faixa`, `AlturasFaixas`. `derivarY(faixa, alturas)`
  deriva Y sem input digitado (D-20) — fórmula adotada: `inferior`/`torre` =
  0 (chão), `bancada`/`aereo` = altura configurada da faixa.
  `validarParedeTier1`/`validarParedeTier2` retornam `EngineWarning[]`
  (reaproveita o canal já existente em `EngineOutput.warnings`, antes nunca
  populado). Tier 1: cabe na parede (largura/altura) + itens não se
  sobrepõem na mesma faixa. Tier 2: faixas não colidem entre si (checagem
  por item contra o teto configurado da faixa seguinte) + itens não
  sobrepõem elementos da parede (janela/porta/tomada/ponto hidráulico,
  overlap 2D). Tier 3 (folgas/ergonomia) propositalmente não implementado.
  100/100 testes (17 novos), build/lint/typecheck limpos.
  **Decisão de design documentada**: `alturaRodape` faz parte de
  `AlturasFaixas` (exigido pela spec) mas não participa da geometria desta
  task — reservado para a derivação futura do elemento contínuo "rodapé"
  (Task 12.4). 🔴 Alta · Sonnet.
- **Task 12.3** — ✅ **Concluído (2026-07-27**, mesclada em
  `feature/12.3-deteccao-conjuntos`, aprovada por verificação independente do
  Maestro após **1 rodada de correção**). Primeira task executada pelo
  **Motor Engineer** (papel novo, ver `.maestro/agents/motor-engineer.md` —
  não versionado no repo por decisão do operador). Novo módulo
  `lib/engine/conjunto/` (`types.ts`, `detectar.ts`, `detectar.test.ts`,
  `index.ts`): `detectarConjuntos()` agrupa itens adjacentes (mesma parede,
  mesma faixa, bordas encostadas dentro de 2mm de tolerância, sem elemento de
  parede bloqueante entre eles — reproduz os 2 exemplos literais do briefing
  6.2: porta bloqueia, janela acima da bancada não bloqueia); `aplicarOverrides()`
  aplica o "handle de junção" manual (união/quebra) sobre o resultado
  automático, sempre vencendo a detecção. Reaproveita `derivarY` e o overlap
  2D de `lib/engine/parede/validar.ts` (agora exportados) em vez de duplicar.
  Persistência do override é fora de escopo (não há tabela `conjunto`, decisão
  da Task 11.2) — fica pra Fase C.
  **Correção de domínio pega na revisão do Maestro**: a primeira entrega
  incluía "Conjunto de 1 item" quando um item ficava sem vizinho unido — o
  próprio executor tinha citado a Seção 3.4 do Modelo de Domínio
  (`ElementoContinuo.alvo: { conjuntoId } | { moduloId }` — "bloco ou módulo
  isolado") como evidência contra essa leitura antes de decidir a favor mesmo
  assim, guiado por uma frase de teste imprecisa do próprio Maestro no
  contrato original. Corrigido: `Conjunto` nunca tem tamanho 1 — item sem
  vizinho unido não aparece no resultado (é referenciado depois via
  `moduloId` direto, não via um `conjuntoId` de 1). 112/112 testes,
  build/lint/typecheck limpos. 🟡 Média · Sonnet.
- **Task 12.4** — ✅ **Concluído (2026-07-27**, mesclada em
  `feature/12.4-elementos-continuos`, aprovada por verificação independente
  do Maestro — matemática dos 4 tipos conferida à mão, com destaque pro
  resgate de A-06/A-07 da auditoria de domínio pra fechar duas ambiguidades
  reais da tabela da Seção 3.4). Novo módulo `lib/engine/elemento-continuo/`
  (`types.ts`, `explode.ts`, `explode.test.ts`, `index.ts`): `ElementoContinuo`
  unificado (tampo/rodapé/tamponamento/fechamento) com dimensão derivada por
  tipo — tampo (largura=soma, profundidade=maior+30mm, engrossável/dobrável
  via `explodePlaca` reaproveitado da Task 12.1), rodapé (largura=total−30mm,
  altura=150mm padrão, ambos editáveis via `override`), fechamento (sarrafo
  na largura ou altura total conforme posição, 50mm padrão, editável),
  tamponamento (deriva do módulo da extremidade — Seção 3.5 — `override`
  sempre ignorado, única exceção "nunca digitável"). Validação de posição por
  tipo (`validarPosicao`, lança `Error` em combinação inválida).
  `BayContent` deixa de ser union — tamponamento ESTRUTURAL sai (Seção 3.6),
  substituído por este módulo; `migrate.ts` descarta presets antigos com esse
  bay, com `console.warn` identificando o vão. 131/131 testes,
  build/lint/typecheck limpos.
  **Pendência registrada, não resolvida nesta task** (decisão do Maestro,
  não do executor — ele reportou em vez de decidir sozinho, como instruído):
  o campo antigo `BoxModule.tamponamento`/`TamponamentoInstancia`
  (tamponamento de INSTÂNCIA, doc 12 — usado por `larguraInstalacaoBox()`,
  `BoxCanvas.tsx`, ainda ativo na página única `app/page.tsx`) **continua
  coexistindo, intocado**, com o novo `ElementoContinuo` tipo "tamponamento".
  A Seção 3.6 só cobre o tamponamento estrutural do `BayContent` — não
  resolve esse segundo mecanismo. Decisão do Maestro: não mexer agora (serve
  o fluxo atual de página única); o `ElementoContinuo` é o que a Fase C
  (Stage 13) vai consumir quando as telas novas existirem — resolver a
  duplicidade (substituir ou aposentar `TamponamentoInstancia`) faz parte do
  planejamento da Fase C, não desta Stage. 🔴 Alta · Sonnet.
- **Task 12.5** — ✅ **Concluído (2026-07-27**, mesclada em
  `feature/12.5-veio-chapa`, aprovada por verificação independente do
  Maestro — reclassificação manual da regra em todas as famílias de peça
  conferidas + validação da mecânica de `cutting.ts`). **Escopo reduzido por
  decisão do operador**: só motor nesta task — "exibição/alteração visual
  para placas" fica pra quando o editor de Placa existir (Fase C), não
  furamos "não pular pra Fase C" por causa disso.
  `BoxMaterial.temVeio?: boolean` (opcional, ausente = sem veio);
  `Peca.temVeio`/`sentidoVeio` (obrigatórios, denormalizados do material —
  mesmo padrão de `cor`/`espessura_mm`). **22 pontos de peça em
  `lib/engine/box/explode.ts` classificados individualmente** (Lateral,
  Base, Tampo, Prateleira, Portas, Gavetas, Fundo, Tamponamento de
  instância...), cada um com comentário explicando o raciocínio — regra
  verificada: a dimensão que É a profundidade do módulo sempre cai no eixo
  curto da chapa (1840mm), a que vem de altura/largura sempre no eixo longo
  (2750mm), não importa em qual campo (`altura_mm`/`largura_mm`) da `Peca`
  ela esteja armazenada. `Placa`/`ElementoContinuo` usam placeholder
  documentado (`sentidoVeio:"comprimento"`, `temVeio` herdado do material
  quando existe) até a Fase C ter UI.
  `lib/engine/box/cutting.ts`: com `temVeio`, a orientação é fixada em
  `expandirPecas` (conforme `sentidoVeio`) **antes** do empacotamento —
  `empacotarChapas` nunca tenta a rotação alternativa pra essas peças; se a
  orientação fixa não cabe, vai pra `foraDaChapa` sem forçar. Peças sem veio
  continuam com rotação livre, sem mudança de comportamento. 142/142 testes,
  build/lint/typecheck limpos.
  **⚠️ Aviso ao operador (não é regressão)**: o aproveitamento de chapas pra
  materiais com `temVeio: true` vai **piorar** a partir de agora — antes, o
  bin-packing girava qualquer peça sem restrição pra caber; agora peças com
  veio que só cabem rotacionadas contam como "fora da chapa". É o
  comportamento fisicamente correto (girar quebraria o sentido do veio).
  Hoje nenhum preset/material cadastrado usa `temVeio: true`, então não há
  impacto visível ainda — só passa a valer quando algum material ganhar essa
  flag (cadastro de catálogo, Task 11.4+ ou Fase C). 🟡 Média · Sonnet.
- **Task 12.6** — ✅ **Concluído (2026-07-27**, mesclada em
  `feature/12.6-precificacao-rateio`, aprovada por auditoria financeira
  independente do Maestro em Opus — exemplo do briefing conferido número a
  número à mão, invariante soma==total validado por construção). Executada
  pelo **Motor Engineer em Opus** (regra financeira). Módulo NOVO
  `lib/engine/precificacao/` (`types.ts`, `custo-material.ts`, `modos.ts`,
  `rateio.ts`, `precificacao.test.ts`, `index.ts`) — `pricing.ts` V1
  **intocado** (coexistência até a Fase C, ainda ativo em 4 telas).
  **Decisão de negócio confirmada com o operador**: markup do modo de
  precificação incide **só sobre o custo de material**; montagem e frete
  somados por cima sem markup (`precoFinal = precoMoveis + montagem + frete`,
  coerente com D-07 e o Lucro final da Seção 5.5). 4 modos de precificação
  (multiplicador/percentual/por_chapa/fixo) + 3 de montagem
  (percentual_material/por_chapa/manual). **Rateio modular por componente**:
  móveis e frete por custo alocado; montagem pela base que acompanha seu modo
  (custo, ou chapas alocadas se por_chapa — regra de coerência do briefing).
  **Exemplo trabalhado do briefing reproduzido em teste, número a número**:
  Caso 1 (19 chapas → 7,4/11,3/0,3) e Caso 2 (20 chapas → 7,789/11,895/0,316,
  banheiro R$78,95). Arredondamento: cada componente com resíduo na última
  linha, totais pré-arredondados a centavos → `Σ valorRateado == precoFinal`
  exato (testado com 19000/3). `RateioSnapshot` = resultado congelável (função
  pura; persistência é Fase C). Resumo financeiro de 6 campos. 163/163 testes
  (21 novos), build/lint/typecheck limpos. **Fecha a Stage 12.** 🔴 Alta ·
  Opus.
  - **Notas de escopo documentadas**: (a) "acessórios/LED" não têm categoria
    separada no `EngineOutput` hoje — entram via `ferragens`; campo
    `custoAcessorios` fica =0 até a categoria existir. (b) `engine.globais`
    (elementos contínuos no consolidado) é sempre `[]` no caminho V2 atual
    (`calcularOrcamentoMisto` nunca popula) — a atribuição de custo dos
    globais aos grupos fica pra quando a integração da Fase C ligar isso;
    não afeta o invariante soma==total (rateio normaliza pela soma dos
    grupos).
- **Task 12.7** — ✅ **Concluído (2026-07-27**, mesclada em
  `feature/12.7-integracao-elemento-continuo`, aprovada por verificação
  independente do Maestro — 0 divergência do contrato, conferida linha a
  linha). **Resolve a Dívida B1** (registrada na Task 12.6): liga
  `ElementoContinuo` (Task 12.4) ao pipeline `calcularOrcamentoMisto`
  (`lib/orcamento.ts`) — cada elemento explodido vira um `ResultadoModulo`
  **sintético** empurrado em `porModulo` (mesmo padrão de `BoxModule`/`Placa`,
  **não** em `globais`/`PecaLinear`, formato antigo V1 incompatível de
  shape — achado do Maestro antes de despachar, evitou quebrar
  `lib/insumos.ts`). `CalcMistoInput.elementosContinuos?` novo campo,
  opcional/retrocompatível. `AlvoResolvido` continua sendo responsabilidade
  do CHAMADOR resolver (Conjunto/Parede → dimensões é I/O de domínio, fora
  do motor puro) — fica pra Task 13.2, quando a Fase C tiver os dados reais.
  168/168 testes (5 novos), build/lint/typecheck limpos. Trabalho de motor
  puro, sem UI — por isso pôde ser feito antes da Stage 13, diferente das
  Dívidas A e B2 (ver nota na Stage 13 abaixo). 🟡 Média · Sonnet.

## Pipeline Stage 13 — Reconstrução da experiência (Fase C)

> **Discovery/planejamento feito pelo Maestro em 2026-07-27** (detalhamento
> deste recorte, antes vago). Só inicia com o modelo de dados (Stages 11–12)
> de pé — **cumprido**. Cadência: **validação em lote por conjunto de telas**
> (decisão do operador), não task-a-task. Ordem de dependência real (não é
> só numeração): 13.0 → 13.1 → **13.2a → 13.2b → 13.2c** → 13.3 → {13.4, 13.5
> em paralela} → 13.6 → 13.7 (13.7 pode andar em paralelo desde o início, é
> isolada). **13.0 e 13.1 concluídas (2026-07-28)**; Task 13.2 foi quebrada
> em 3 sub-tasks nessa mesma data (ver abaixo) por ser densa demais pra uma
> branch efêmera só. A partir daqui, **Frontend Engineer é o executor
> principal** (Motor/Backend Engineer entram só quando uma task específica
> pede, ver notas); UX Auditor volta ao loop de validação
> (`.maestro/pipelines/03-quality.md`).
>
> **Duas dívidas arquiteturais herdadas do motor (Stages 11-12), fechadas
> como decisão em 2026-07-27, código amarrado às tasks abaixo** (decisão do
> operador: não forçar código antes da tela existir):
> - **Dívida A** (`BoxModule.tamponamento`/`TamponamentoInstancia` vs.
>   `ElementoContinuo` tipo "tamponamento"): **`TamponamentoInstancia` é
>   RETIRADO nesta Stage, dentro da Task 13.2** — é o único lugar que ainda o
>   usa (`larguraInstalacaoBox()`, `BoxCanvas.tsx`), e é exatamente onde o
>   tamponamento novo (via `ElementoContinuo`) ganha UI real. Não é
>   coexistência permanente — é sequenciamento.
> - **Dívida B2** (rateio novo → telas): a Task 13.5 é quem liga
>   `ratearPrecificacao` (Task 12.6) à tela Financeiro pela primeira vez,
>   usando Linhas de Proposta (Task 13.6) como `GrupoItens`. Não há trabalho
>   de wiring a fazer antes disso existir.
> - (Dívida B1 — `ElementoContinuo` → `EngineOutput.globais`/`porModulo` — foi
>   resolvida como código em 2026-07-27, Task 12.7, motor puro sem UI. Ver
>   Stage 12.)

- **Task 13.0** — **Pré-requisito de canvas**: refatorar `BoxCanvas.geometria`
  para aceitar **lista de itens posicionados**, não um `BoxModule` só (render
  de conjunto — `docs/Modelo-de-Dominio.md` Seção 6). Vem antes de qualquer
  tela que dependa dele (13.2, 13.6). **Critério de aceitação**: renderizar
  N módulos/placas lado a lado a partir de `ItemPosicionado[]` (posição `x` +
  `faixa`, Y via `derivarY` da Task 12.2), sem regressão visual do render de
  item único usado hoje em `/modulo`. 🔴 Alta · Sonnet.
  **Status**: ✅ Concluído (2026-07-28, mesclada em
  `feature/13.0-canvas-lista-itens`, Frontend Engineer/Sonnet). Nova função
  pura `geometriaConjunto` (exportada, testada isoladamente — 8 testes novos,
  176/176 no total) calcula escala/origem pela bounding box do conjunto (X =
  `posicao.x`, Y = `derivarY(faixa, alturas)`, nunca digitado); com 1 item na
  faixa "torre"/x=0 a conta se reduz matematicamente à fórmula antiga —
  prova de equivalência pixel-a-pixel, não só alegação. `BoxCanvas` ganhou um
  segundo shape de props (`itens`+`alturas`) aditivo — o modo `box` existente
  (usado em `/modulo` e nos cards de `app/page.tsx`) ficou intocado. Item
  `custom_box` no modo conjunto reaproveita as mesmas funções de desenho do
  modo comercial (sem duplicar lógica); item `placa` (sem editor próprio
  ainda — Task 13.1) desenha só um retângulo com a cor do material, por
  escopo. Sem régua/elementos de parede/handle de junção — isso é a Task
  13.2, propositalmente fora daqui. Validado pelo Maestro de forma
  independente (não só relato do executor): lint/typecheck/build/test
  rodados de novo, e `/modulo` conferido ao vivo via browser (canvas com
  73,7% de pixels não-vazios, sem erro de console) — screenshot indisponível
  neste ambiente (limitação conhecida), evidência via `getImageData`.
- **Task 13.1** — Editor de Item (módulo + placa, dirigido por capacidade,
  `docs/Modelo-de-Dominio.md` Seção 4) — base em `/modulo` (Tasks 7.1/7.2).
  Absorve a 7.3 (painel de custo/peças ao vivo). **Critério de aceitação**:
  (a) schema de capacidades decide as seções visíveis por `origem` (nenhum
  `if` de tipo espalhado no componente); (b) **seletor de lados do
  engrossamento** (Modelo de Domínio 2.1.1) — clique nos 4 lados da
  referência visual da placa, BOM recalcula ao vivo; (c) **sentido do veio
  visível e alterável para Placa** (Modelo de Domínio Seção 8, Task 12.5
  deixou isso pendente de propósito — é aqui que entra: campo
  `sentidoVeio`/`temVeio` do material vira controle visual); módulos-caixa
  usam os defaults sem exigir escolha. Depende de 13.0 pro canvas de
  seleção. 🔴 Alta · Sonnet.
  **Status**: ✅ Concluído (2026-07-28, mesclada em
  `feature/13.1-editor-de-item`; sequenciada Motor Engineer → Frontend
  Engineer, mesma branch). Motor: `Placa.sentidoVeio?: SentidoVeio` novo,
  `explodePlaca` deixa de hardcodar `"comprimento"` (placeholder da Task
  12.5 fechado). Frontend: `CAPACIDADES` (`lib/orcamento.ts`) é a fonte
  única de verdade de seções visíveis — `app/modulo/secoes.ts` deriva a
  lista de seções de Placa filtrando por esse schema (não uma lista fixa
  coincidente, com teste-guarda contra divergência); `/modulo` ganhou toggle
  Módulo-caixa/Placa preservando estado dos dois lados; `PlacaVisual.tsx`
  (novo) resolve o seletor de lados do engrossamento (matemática conferida
  ao vivo contra a Seção 2.1.1 — sarrafo do eixo maior = comprimento cheio,
  eixo menor = dimensão − 70×perpendiculares selecionados) e o indicador/
  inversor de veio, condicionado a `material.temVeio`; painel direito
  (custo/peças/plano de corte) migrado para os tokens 6.5/7.2, absorvendo a
  7.3. Fora de escopo, reportado e não inventado: Placa sem biblioteca de
  presets (`lib/boxPresets.ts` é tipado a `BoxModule`). **1 rodada de
  correção** (circuit breaker tentativa 1): grid blowout no `<svg>` de
  `PlacaVisual` (atributos `width`/`height` HTML participando do min-content
  do grid legado sem `min-width:0` — mesma causa-raiz da Task 6.3b, agora
  num SVG em vez de `<canvas>`) causava 19px de overflow horizontal em
  375px só no modo Placa; corrigido (viewBox + CSS puro) e revalidado pelo
  Maestro via `getBoundingClientRect`/`scrollWidth` ao vivo, não só relato.
  185/185 testes, lint/typecheck limpos.
- **Task 13.2 — quebrada em 3 sub-tasks** (2026-07-28, decisão do Maestro a
  pedido do operador: era "a tela mais densa da Stage", grande demais pra
  uma branch efêmera só). Ordem de dependência real: **13.2a → 13.2b →
  13.2c**. Todas ainda dependem de 13.0 (canvas de lista) e 13.1 (biblioteca
  de itens editáveis) — ambas concluídas. Rota temporária **`/ambientes`**
  (lab novo, mesmo espírito de `/modulo`/`/biblioteca`: estado local, sem
  Supabase ainda) — a integração ao shell `/orcamento/[id]` (com dados reais
  do orçamento) é Task 13.3, não aqui. **Nota de escopo**: a "biblioteca" de
  itens posicionáveis em 13.2a só tem módulos-caixa por enquanto
  (`lib/boxPresets.ts`) — Placa não tem persistência/preset ainda (relatado
  explicitamente como fora de escopo na Task 13.1); posicionar uma Placa na
  parede fica pra quando essa lacuna for fechada (task futura de dados, não
  desta Stage).

  ### Task 13.2a — Elevação 2D + posicionamento + validação Tier 1/2
  - **Status**: ✅ Concluído (2026-07-28, mesclada em
    `feature/13.2a-elevacao-parede`). Nova rota `/ambientes` (laboratório
    local, sem Supabase): régua de largura + 4 faixas (inferior/bancada/
    aéreo/torre) com alturas do perfil configuráveis na própria tela;
    elementos de parede (janela/porta/tomada/hidráulico) desenhados por
    posição/dimensão absoluta; itens posicionados via `lib/boxPresets.ts` +
    faixa/x, atualizando o `BoxCanvas` modo conjunto (Task 13.0) ao vivo.
    `validarParedeTier1`/`Tier2` rodam a cada mudança — avisos aparecem como
    lista textual **e** destaque visual (contorno + fundo tintado) no item
    problemático, prop nova `itensComAviso` em `BoxCanvasPropsConjunto`
    (reaproveita `geometriaConjunto`, que ganhou `itemId`, em vez de overlay
    HTML/SVG duplicando geometria — decisão documentada no código). Validado
    ao vivo pelo Maestro: aviso textual conferido, destaque visual **e sua
    cor (`#DC2626`) conferidos por leitura de pixel do canvas** — achado
    durante a auditoria (não bloqueante, registrado abaixo) — 0 overflow
    horizontal em 375/768/1440px, sem erros de console. 196/196 testes (11
    novos), lint/typecheck limpos.
    **Achado da auditoria (não bloqueante, aceito como está)**: quando dois
    itens se sobrepõem EXATAMENTE (mesmo x e largura, caso sintético — não
    reflete uso real, já que presets diferentes ou X diferentes são o caso
    comum), o item desenhado por último cobre o destaque visual do primeiro
    (fill opaco por cima). Só um dos dois itens recebe `moduloId` no
    warning de qualquer forma (regra pré-existente de `validarParedeTier1`,
    Task 12.2, fora de escopo desta task). Com sobreposição parcial (caso
    real testado: x=0 e x=400, largura 800) o destaque aparece corretamente.
    Não vale a pena corrigir agora — fica de nota para se algum dia virar
    problema real.
  - **Modelo Recomendado**: Sonnet
  - **Prioridade**: 🔴 Alta
  - **Executor**: Frontend Engineer
  - **Descrição objetiva**: Nova rota `/ambientes` (estado local: uma
    `Parede` editável — largura/altura — com `elementos: ElementoParede[]`
    adicionados manualmente e `itens: ItemPosicionado[]` posicionados a
    partir da biblioteca de presets existente). Toda a lógica pura já existe
    e só precisa ser consumida, não reimplementada:
    `lib/engine/parede::derivarY`, `validarParedeTier1`, `validarParedeTier2`
    (retornam `EngineWarning[]`, Task 12.2) e o `BoxCanvas` modo "conjunto"
    (`itens`+`alturas`, Task 13.0) pra desenhar todos os itens posicionados
    juntos — não é render de 1 item por vez.
  - **Critérios de aceitação**:
    - [ ] Régua de largura da parede + as 4 faixas (inferior/bancada/aéreo/
          torre) desenhadas, com as alturas do perfil (`AlturasFaixas`)
          configuráveis na própria tela (não há tela de perfil da
          organização ainda — input local mesmo).
    - [ ] Elementos de parede (janela/porta/tomada/ponto hidráulico)
          adicionáveis com posição/dimensão (x, y, largura, altura) e
          desenhados como retângulos na elevação.
    - [ ] Escolher um preset da biblioteca e posicionar por faixa + `x`
          (drag ou input numérico — decisão de UX do executor) atualiza o
          `BoxCanvas` modo conjunto em tempo real.
    - [ ] `validarParedeTier1`/`validarParedeTier2` rodam a cada mudança de
          posicionamento; avisos/erros (`EngineWarning[]`) aparecem como
          lista legível E destaque visual (ex.: contorno de erro) no item
          problemático — nenhum dos dois canais sozinho basta.
    - [ ] `npm run lint`/typecheck/test passam; testado em 3 breakpoints.

  ### Task 13.2b — Conjuntos + handle de junção (persistência de override)
  - **Status**: ⏱️ Planejado
  - **Modelo Recomendado**: Sonnet (Backend) + Sonnet (Frontend)
  - **Prioridade**: 🔴 Alta
  - **Executores**: Backend Engineer (fatia pequena) → Frontend Engineer,
    mesma branch, nessa ordem — depende de 13.2a (precisa de itens
    posicionados reais pra detectar conjunto sobre eles).
  - **Descrição objetiva**: Toda a lógica pura já existe
    (`lib/engine/conjunto::detectarConjuntos`/`aplicarOverrides`, Task 12.3;
    tipo `OverrideJuncao = { itemIdA, itemIdB, forcar: "unido"|"quebrado" }`
    já definido em `lib/engine/conjunto/types.ts`) — falta só persistir o
    override e desenhar o handle. **Backend**: adicionar coluna
    `parede.overrides_juncao jsonb not null default '[]'` (migration nova;
    `parede` já tem RLS pronta via `organizacao_id` denormalizado, Task
    11.2 — não precisa de política nova, só a coluna). **Frontend**: em
    `/ambientes` (13.2a), rodar `detectarConjuntos` sobre os itens da
    parede, desenhar contorno/colchete visual acima de cada bloco
    detectado, e um handle clicável entre cada par de itens adjacentes que
    alterna união/separação chamando `aplicarOverrides` com o array de
    `OverrideJuncao` (persistido via a coluna nova).
  - **Critérios de aceitação**:
    - [ ] Migration cria `parede.overrides_juncao` (jsonb, default `[]`);
          `get_advisors` (security) roda zero achados novos depois dela.
    - [ ] Conjuntos automáticos (2+ itens adjacentes, mesma faixa, sem
          elemento bloqueante — regra já implementada) aparecem com
          contorno/colchete visual distinto do item avulso.
    - [ ] Clicar no handle entre dois itens adjacentes alterna união/quebra;
          o resultado reflete exatamente `aplicarOverrides` (ex.: quebrar um
          conjunto de 3 no meio gera 2 conjuntos de 2, não sobra um de 1 —
          já é a regra da função, só confirmar que a UI não a contorna).
    - [ ] Recarregar a tela mantém o override (lido da coluna persistida,
          não volta pro automático puro).
    - [ ] `npm run lint`/typecheck/test passam.

  ### Task 13.2c — Elementos contínuos + resolve a Dívida A
  - **Status**: ⏱️ Planejado
  - **Modelo Recomendado**: Sonnet (Motor) + Sonnet (Frontend)
  - **Prioridade**: 🔴 Alta
  - **Executores**: Motor Engineer (remove o mecanismo antigo) → Frontend
    Engineer (UI do mecanismo novo), mesma branch — depende de 13.2b
    (painel lateral abre ao selecionar um Conjunto, que só existe depois
    dessa task).
  - **Descrição objetiva — Motor (resolve a Dívida A)**: remover
    `TamponamentoInstancia`/`TamponamentoLado`/`BoxModule.tamponamento` de
    `lib/engine/box/types.ts` (hoje linhas ~90-121) e todo uso em
    `lib/engine/box/explode.ts` se houver; `larguraInstalacaoBox()` perde a
    soma de tamponamento — avaliar se ainda se justifica como função
    própria ou se `lib/orcamento.ts::larguraDoItem` passa a usar
    `box.largura` direto para `custom_box` (decisão do executor, documentar
    a escolha). Migração de presets antigos com `tamponamento` setado:
    mesmo padrão já usado em `lib/engine/box/migrate.ts` pra descarte com
    aviso (Task 12.4 já fez isso pro branch `BayContent` "tamponamento" —
    reaproveitar o padrão, não inventar um novo).
  - **Descrição objetiva — Frontend (mecanismo novo)**: remover o bloco de
    desenho de `box.tamponamento` em `BoxCanvas.tsx` (hoje ~linhas 409-430)
    e o `TamponamentoConfig` de `app/page.tsx` (UI do mecanismo antigo,
    ligada ao campo que está sendo removido). Adicionar, em `/ambientes`
    (13.2a/b), um painel lateral que abre ao selecionar um Conjunto (ou
    módulo isolado): lista os `ElementoContinuo` aplicáveis (tampo/rodapé/
    tamponamento/fechamento — `POSICOES_VALIDAS` já define quais posições
    valem por tipo, `lib/engine/elemento-continuo/types.ts`), usando a
    integração já pronta da Task 12.7 (`calcularOrcamentoMisto` aceita
    `elementosContinuos?: ElementoContinuoResolvido[]`). **Tamponamento só
    nas extremidades expostas**: decisão de qual lado de um bloco/módulo
    conta como "extremidade exposta" (não encostada em outro item nem
    fazendo parte do meio do bloco) não está fechada na spec — é decisão de
    UX/domínio a fechar durante a execução, documentar a escolha no código
    (mesmo padrão de "decisão sem resposta explícita" dos outros
    executores).
  - **Critérios de aceitação**:
    - [ ] `grep` por `TamponamentoInstancia`/`TamponamentoLado` no projeto
          inteiro retorna vazio (tipo removido, não só deixado de usar).
    - [ ] Presets antigos com tamponamento de instância migram com aviso,
          sem quebrar (mesmo padrão de `migrate.ts`).
    - [ ] Selecionar um Conjunto abre o painel lateral; adicionar um tampo/
          rodapé/fechamento reflete no BOM/custo ao vivo (mesma integração
          da Task 12.7, já testada no motor — aqui é só ligar à UI).
    - [ ] Tamponamento só é oferecido nas extremidades expostas do bloco
          (não em todo módulo do meio) — testar num bloco de 3+ itens.
    - [ ] `npm run lint`/typecheck/test passam (motor: nenhum teste
          existente de `box.tamponamento` sobra órfão — remover ou migrar
          os testes que cobriam o mecanismo antigo).
- **Task 13.3** — Shell `/orcamento/[id]` com abas + Dashboard `/` + fluxo de
  novo orçamento/cliente (captura nome/telefone/endereço + prazo de entrega
  na criação, `docs/Mapa-de-Telas.md` 3.2). Reaproveita `cliente`/`orcamento`
  (Task 11.2, RLS já pronta). Depende de 13.2a/b/c pra ter algo real dentro
  do shell (a aba "Ambientes" migra de `/ambientes` pra cá; `/modulo` migra
  pro Editor de Item em `/orcamento/[id]/item/[itemId]`). 🟡 Média · Sonnet.
  **Dívida de retrofit visual (2026-07-28, decisão do operador)**:
  `docs/Design-System.md` foi reescrito integralmente nesta data (v3 —
  sidebar navy/laranja a partir de 12 mockups + logo oficial, substitui o
  tema claro/neutro da v2). As telas já mescladas antes dessa mudança
  (Task 13.0/13.1 `/modulo`, Task 13.2a `/ambientes`) ainda usam os tokens
  v2 (`accent` azul, cinza técnico no canvas) — **não foram retrofitadas
  ainda, de propósito**: como `/modulo` e `/ambientes` migram pro shell real
  nesta própria task (13.3), reskinar antes seria trabalho duplicado. É
  **aqui** que o Frontend Engineer aplica o v3 (sidebar/topbar/cards) pela
  primeira vez em código real, e também corrige o único ponto pontual já
  identificado: `app/components/BoxCanvas.tsx` hardcoda `AVISO = "#D97706"`
  (Task 13.2a) — deve passar a consumir `aviso.DEFAULT`/`aviso.subtle`
  (`#A16207`/`#FFFBEB`, Design-System v3 Seção 2.4) para não colidir
  visualmente com `accent.vivid` (contorno de seleção/marca, mesmo hex
  antigo). Ver `docs/Design-System.md` Seção 9 pra paleta de material do
  canvas técnico (2D elegante, sem 3D — decisão fechada do operador).
- **Task 13.4** — Corte & Material (pré-pedido, adição manual, congelamento
  em `lista_material` — tabela já existe, Task 11.2 — extração texto/CSV,
  D-08). Reaproveita `PlanoCorteCanvas`/`montarLinhasInsumos`; plano de corte
  agora respeita restrição de veio (Task 12.5) — exibir chapas
  compradas/área/sobra, nunca a fração intermediária de custo (Seção 5.2,
  "onde a sobra aparece e onde não"). Depende de 13.3 (shell). 🟡 Média ·
  Sonnet.
- **Task 13.5** — Financeiro (6 campos, modos de precificação/montagem,
  frete editável). **Resolve a Dívida B2** (ver nota acima) — primeira
  ligação real de `ratearPrecificacao` (Task 12.6) a uma tela, usando as
  Linhas de Proposta da Task 13.6 como `GrupoItens`. Reaproveita o painel de
  KPIs já convertido (Task 6.5), com os campos novos. Depende de 13.3
  (shell) e é mais fácil depois de 13.6 existir (precisa de grupos reais pra
  ratear) — **considerar inverter a ordem 13.5↔13.6** se fizer mais sentido
  na prática; não é dependência rígida, é conveniência. 🔴 Alta · Sonnet.
- **Task 13.6** — Linhas de Proposta (render de conjunto via 13.0, rateio via
  13.5, override manual com rebalanceamento — Seção 5.2/6) + PDF com marca
  (absorve a 9.1, dados do emitente da Organização + do Cliente,
  `docs/Mapa-de-Telas.md` 3.8). `valorRateado` persiste em
  `linha_proposta.valor_rateado` (coluna já existe, Task 11.2) no
  congelamento (Task 12.6 `RateioSnapshot` é o que persiste). Depende de
  13.3, 13.5. 🔴 Alta · Sonnet.
- **Task 13.7** — Perfil / Organização + Catálogo de produtos + Biblioteca
  (absorve a 8.1). CRUD de `produto` (Task 11.4, RLS já pronta — inclusive
  onde o operador cadastra os ~380 padrões de MDF, se ainda não tiver feito
  via Table Editor) e `gabarito` (fork via `fork_gabarito`, Task 11.4).
  **Isolada** — pode ser feita em paralelo com qualquer outra task da Stage,
  não depende de canvas/posicionamento. 🟡 Média · Sonnet.

---

## Resumo do Épico V2

| Fase | Stages | Foco |
|---|---|---|
| A — Discovery ✅ | — | PRD, Modelo de Domínio, Mapa de Telas, este replanejamento (2026-07-24) |
| B — Motor e dados | 10 (remoção V1), 11 (multi-tenant), 12 (extensões do motor) | Backend Engineer; base sem a qual a UI seria refeita |
| C — Experiência | 13 (telas) | Frontend Engineer; reaproveita fundação Tailwind + Editor `/modulo`; validação em lote |

**Gate de saída da Fase A**: aprovação do operador sobre PRD + Modelo de
Domínio + Mapa de Telas antes de iniciar a Stage 10 (Fase B).

---

## Backlog futuro (pós-MVP — avaliado, não agendado)

> Registrado em 2026-07-28 pelo Maestro a pedido do operador, depois de uma
> conversa dele com o ChatGPT sobre diferenciais de produto. **Nada aqui
> está agendado nem autorizado pra execução** — é só pra não perder a ideia.
> Quando (e se) alguma entrada virar task real, ela segue o mesmo processo
> de sempre: contrato, modelo recomendado, branch efêmera, auditoria.

### Preview 3D leve e sincronizado (ideia com maior maturidade)

O operador quer um preview 3D **estático** (sem órbita de câmera livre) da
parede sendo montada em `/ambientes`, derivado dos **mesmos dados** do
canvas 2D (`Parede.itens[]`, `ItemPosicionado`, material) — nunca modelado
à mão, nunca uma segunda fonte de verdade. Objetivo é só **conseguir ver em
3D o que já foi configurado em 2D**, não impressionar visualmente: **sem
iluminação realista/PBR, sem texture mapping fiel** — geometria simples
(caixas por módulo, com portas/gavetas/prateleiras como sub-formas) com cor
sólida aproximada do material, luz plana/ambiente básica só pra dar volume
mínimo (distinguir face/topo/lateral). Sincronizado com a seleção: marcar
um módulo no 2D destaca o mesmo módulo no preview 3D (e vice-versa, se
fizer sentido).

**Importante — isto não reabre a decisão "sem 3D" de hoje**: o
Design-System v3 (Seção 9) mantém `BoxCanvas`/`ElevacaoParede`/
`PlanoCorteCanvas` estritamente 2D, para sempre — essa regra continua
valendo e não deve ser violada por esta ideia. O preview 3D, se e quando
for construído, é um **componente novo e adicional** (ex.: painel
"3D Live" ao lado da elevação, canto da aba Ambientes), não uma
substituição nem uma segunda versão dos canvases 2D existentes. Stack
sugerida (não decidida): React Three Fiber + Three.js (padrão do
ecossistema React, mas isso é decisão de execução, não deste registro).

**Nota de escopo vs. a proposta original do ChatGPT** (colada pelo operador
— não confundir os dois): o texto do ChatGPT sugeria PBR/materiais
realistas e "clique expande pra tela cheia com órbita de câmera" — o
operador **não** endossou essa parte; a instrução real dele foi "3D
estático, sem movimentação livre" e "não precisa de iluminação pra tentar
ser realista". A versão que vale, se isto virar task, é a do parágrafo
acima, não a do ChatGPT.

**Pré-requisito de PRD**: `docs/PRD.md` diz hoje "sem exigir modelagem 3D"
como frase de posicionamento de produto — quando (e se) esta ideia virar
task real, essa frase precisa de uma revisão explícita do operador antes
(não é modelagem 3D *exigida do usuário*, é um preview *gerado
automaticamente*, mas a frase do PRD merece releitura consciente, não
presumida).

### Telas adicionais sugeridas (não desenhadas no Mapa-de-Telas atual)

- **`/clientes`** — tela dedicada de CRUD/lista/busca de clientes. Hoje o
  Mapa-de-Telas só cobre captura de cliente **inline** no fluxo de "Novo
  Orçamento" (Task 13.3) — não existe uma tela própria de gestão de
  clientes (histórico de orçamentos por cliente, edição isolada, etc.).
- **Histórico de Orçamentos** (timeline de alterações/versões de um
  orçamento) — hoje só existe o registro de auditoria de baixo nível
  (Stage de logging, login/exclusão/nova versão), não uma UI de timeline
  voltada ao usuário.
- **Central de Ajuda** (tutoriais/onboarding) — não existe nenhuma versão
  disso hoje, nem básica.
- *(Já cobertos, não são novidade)*: "Novo Orçamento" e "Seleção de
  Cliente" já têm alguma cobertura dentro do escopo da Task 13.3 (fluxo de
  criação captura cliente) — se a ideia acima for além disso (ex.: busca
  com autocomplete, criação inline sem sair do fluxo), precisa comparar com
  o que a 13.3 entregar antes de virar task nova, pra não duplicar escopo.

### Componentes "premium" sugeridos (nível de polish, não de fluxo)

Lista trazida pelo operador, sem sequenciamento nem prioridade definida:
Command Palette (⌘K, busca global de módulos/produtos/clientes/orçamentos/
comandos), Centro de notificações (além do sino simples — aprovação de
orçamento, proposta visualizada, atualização de catálogo, convite de
usuário), Histórico lateral de atividade dentro do orçamento aberto,
Breadcrumb (Dashboard > Orçamentos > Cliente > Ambiente > Módulo), Painel
de propriedades contextual ao selecionar item/parede/conjunto (nota: isto
já existe **parcialmente** como padrão nas Tasks 13.2a-c — o painel lateral
de elemento contínuo ao selecionar um Conjunto já é esse conceito; a ideia
aqui é generalizar o padrão pra qualquer seleção, não é 100% nova), Empty
states ilustrados em todas as telas, Tour guiado de primeiro acesso,
Skeleton loading (em vez de spinner), Atalhos de teclado globais (N, Ctrl+S,
Delete, Ctrl+K, Esc, Ctrl+P), Modo foco (esconde sidebar/header/painéis
laterais na aba Ambientes).

**Como tratar daqui pra frente**: se o operador quiser priorizar algum item
desta lista, ele vira uma task normal do Backlog (contrato + modelo
recomendado + branch), inserida na ordem que fizer sentido em relação às
Stages em andamento — nenhuma automatização ou agendamento implícito só por
estar registrada aqui.
