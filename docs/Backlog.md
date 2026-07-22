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
- **Status**: ✅ Concluído (2026-07-22, mesclada em `feature/6.5-painel-resultado`, aprovada por Code Auditor + UX Auditor — KPI destaque em `accent` #2563EB, alerta de margem mínima em `--erro` confirmado nos dois sentidos ao vivo, tabelas conforme Seção 6.9, sliders com CSS customizado — Radix Slider avaliado e descartado por exigir mudar a assinatura `valor/onChange` do componente, fora do escopo "só apresentação". **Stage 6 (Produção) concluída.** Overflow horizontal em 375px reportado novamente (3ª vez), desta vez em `flex gap-3` sem `flex-wrap` no cabeçalho de `BoxModuloCard`/`TemplateModuloCard` (`app/page.tsx`, header com Parede+Largura/Altura/Profundidade) — não confirmado de forma conclusiva pela ferramenta de validação nesta rodada (medições inconsistentes de viewport), mas registrado como pendência a corrigir no início da Stage 7, antes de mais recorrências)
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
- **Status**: ⏱️ Planejado
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
- **Status**: ⏱️ Planejado
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
