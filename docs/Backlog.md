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

## Resumo por Stage

| Stage | Tasks | Prioridade dominante |
|---|---|---|
| 1 — Segurança: Crítico | 1.1, 1.2, 1.3 (bloqueada), 1.4 | 🔴 Crítica |
| 2 — Qualidade: Tooling | 2.1, 2.2 | 🔴 Crítica / 🟡 Alta (bloqueador de processo) |
| 3 — Segurança: Média/Baixa | 3.1, 3.2, 3.3, 3.4, 3.5 | 🟡 Média / 🔵 Baixa |
| 4 — Dependências | 4.1, 4.2 | 🟡 Alta / 🟢 Normal (avaliação, não execução) |

**Total: 13 tasks em 4 Pipeline Stages.**
