# Status Atual

> Atualizado em 2026-08-05 (Task 1.7, 5.10-back fechadas). Este arquivo é o ponto de partida de qualquer
> sessão nova. Histórico task-a-task (auditorias, tentativas, decisões)
> não vive mais aqui — está no `git log` e nos commits de merge de cada
> branch `feature/<task-id>`. Este arquivo mantém só o essencial.

## 1. Onde estamos

**Épico V2 completo** (Fases A–C); **Épico V2.1/Fase D em execução** (Lote 0
iniciado 2026-08-03). Painel de orçamento para marceneiros: motor de caixa
paramétrico (V3), persistência multi-tenant real via Supabase, todas as telas
da experiência construídas. Fases A (Discovery), B (Motor e dados) e C
(Experiência/telas) — todas concluídas. 

Fase D (Pré-Lançamento) — Lote 0 (Fundação de dados) ✅ fechado:
**Tasks 0.1–0.3, 0.4, 0.5a, 0.7a, 0.7b, 0.5b mescladas** (wiring multi-Ambiente/Parede, migration, Server Actions, alturas de faixa, dados de cliente, congelamento real, formulário de cliente — Lote 0 completo 6/6).

**Lote 1 (Confiança e estado) back concluído** — 5/5 fatias back concluídas; Task 1.9-front pendente:
- **Task 1.1–1.3** ✅ (2026-08-04) — Invalidação de cache após mutação + aba persistida na URL + "atualizar render" sem F5. `code-auditor` indisponível (2x sem veredito, estouro técnico) — revisão assumida pelo Maestro. `qa-engineer` aprovou com veredito próprio (verificação real: aba sobrevive a F5, `forceMount` e `router.refresh()` validados). Sem impacto visual.
- **Task 1.8** ✅ (2026-08-04) — Investigação: link "← calculadora" em `/modulo` já aponta para `/` (Dashboard), destino mais adequado. Sem mudança de código. Investigação factual verificada antes do merge.
- **Task 1.5–1.6** ✅ (2026-08-05) — Teste automatizado de paridade financeiro ↔ proposta. Causa raiz: `FinanceiroTabConectada.tsx` faltava `router.refresh()` após `salvarConfiguracaoPrecificacao`. `code-auditor` indisponível (estouro técnico) — revisão assumida pelo Maestro (lint/typecheck/test + diff relido). `qa-engineer` aprovado (5/5 critérios). Sem impacto visual.
- **Task 1.7** ✅ (2026-08-05) — Bug de chapas de 6 mm em "valor por chapa": `consolidarResultados` derivava contagem de chapas por fórmula de área, desacoplada do bin-packing real. Correção: fonte única de verdade do `planoDeCorte`. `code-auditor` indisponível (estouro técnico) — revisão assumida pelo Maestro (lint/typecheck/test + diff relido, 348 testes). `qa-engineer` aprovado (5/5 critérios, reprodução do bug confirmada). Sem impacto visual.
- **Task 5.10 (back)** ✅ (2026-08-05, Lote 5) — Coluna `orcamento.etapa_esteira` (migration aplicada no Supabase real), Server Action `atualizarEtapaEsteira` (transições T1–T3), gatilho de avanço automático para `aguardando_aprovacao` no congelamento. `code-auditor` aprovado (veredito em arquivo), `qa-engineer` aprovado (358 testes, 5 critérios). Sem RLS nova, sem UI. Desbloqueia a Task 1.9 (back/front).
- **Task 1.9-back** ✅ (2026-08-05) — Server Action `reabrirOrcamento` com autorização por papel (`admin` obrigatório), congelamento revertido, etapa avançada quando aplicável. `code-auditor` aprovado, `security-auditor` aprovado (gate obrigatório para autorização por papel), `qa-engineer` aprovado (364 testes, 6 novos). Sem impacto visual. **Fecha o Lote 1 (back) por completo.**
- **Pendentes**: Task 1.9-front (botão "Reabrir", visível e habilitado apenas para `admin` quando `congeladoEm !== null`).

Fases A–C + Task 0.1–0.3: ver histórico em `docs/Backlog.md` ("Resumo do
Épico V2" e "Lote 0 — Fundação de dados").

## 2. Como se orientar (leia nesta ordem)

1. **`docs/PRD.md`** — visão, persona, jornada, requisitos, decisões D-01 a
   D-26 (todas fechadas).
2. **`docs/Modelo-de-Dominio.md`** — a fundação técnica: `ItemOrcamento`
   union (`BoxModule | Placa`), Parede/Ambiente/Conjunto, elementos
   contínuos, rateio de preço, veio de chapa.
3. **`docs/Mapa-de-Telas.md`** — a árvore de telas (`/orcamento/[id]` com
   abas), derivada do modelo de domínio.
4. **`docs/Design-System.md`** — tokens de cor/tipografia/espaçamento (v3,
   sidebar navy + laranja). Não inventar valor visual fora daqui.
5. **`docs/Backlog.md`** — o que ainda não foi feito (dívida de segurança
   Stage 3, avaliações de upgrade Stage 4, ideias pós-MVP).
6. **`.maestro/agents/maestro.md`** e `.maestro/` — o framework de
   orquestração (branch efêmera → gates → merge `--no-ff` em `main`).
7. `docs/archive/` — planejamento original V1, só para curiosidade
   histórica. Não é fonte de verdade.

## 3. O que existe e funciona

**Motor de cálculo** (`lib/engine/*`, `lib/orcamento.ts`) — único motor (V1
removido por completo): explosão de `BoxModule`/`Placa` em peças, bin-packing
com restrição de veio, `Parede`/`Ambiente`/`Conjunto`/`ElementoContinuo`
(tampo/rodapé/tamponamento/fechamento unificados), precificação V2 (4 modos
de preço + 3 de montagem, rateio por custo alocado, `RateioSnapshot`
congelável). `pricing.ts` V1 segue coexistindo intocado (consumido só como
fallback/preview em `/modulo`).

**Persistência e Auth** — Supabase real (`orcamentofacil`,
`ioakptuwhfvlirvrciwg`). Multi-tenant por `organizacao` via RLS
(`private.org_do_usuario()`), auth por Supabase Auth (`/login`, `/signup`,
gate deny-by-default no `middleware.ts`). Tabelas: `organizacao`, `perfil`,
`cliente`, `produto`, `gabarito`, `orcamento`, `ambiente`, `parede`,
`elemento_continuo`, `linha_proposta`, `lista_material` — todas com RLS
própria. Teste de isolamento por tenant em
`supabase/tests/isolamento-tenant.sql` (rodar de novo após qualquer RLS
nova). Storage: bucket privado `linha-proposta-renders` (renders de
propostas). Prisma foi removido por completo.

**Telas** (shell autenticado `app/(app)/`, sidebar navy + topbar):
- `/` — Dashboard (lista de orçamentos).
- `/orcamento/[id]` — o coração do produto, 4 abas: Ambientes (elevação 2D,
  posicionamento, Conjuntos, Elementos Contínuos), Corte & Material (plano
  de corte agregado, lista de material congelável), Financeiro (resumo de 6
  campos, modos de precificação/montagem), Proposta (Linhas de Proposta com
  render automático, override com rebalanceamento, gera `/proposta/[id]/pdf`).
- `/orcamento/[id]/item/[itemId]` — Editor de Item (módulo-caixa ou placa).
- `/perfil` — dados da organização + pessoais, padrões de precificação.
- `/catalogo` — CRUD de produtos (chapas/ferragens/fita/LED/acessórios).
- `/biblioteca` — gabaritos reutilizáveis (base global + fork por
  organização).
- `/modulo` — laboratório de edição de gabaritos (mesmo núcleo do Editor de
  Item).
- `/dev/preview/*` — harnesses com dados mock, sem sessão, 404 em produção;
  usados pra auditoria visual sem precisar logar.

**Testes**: 329 passando (`npm run test`). `npm run lint`/`npm run typecheck`
limpos.

## 4. Decisões que não devem ser reabertas sem motivo novo

- Motor V3 é o único motor; **Placa** é peça plana (prateleira/fechamento/
  ripado), distinta de `BoxModule` (móvel com carcaça).
- Multi-tenant via Supabase RLS, tenant = Organização. Sem Prisma.
- Elementos contínuos (tampo/rodapé/tamponamento/fechamento) são um único
  mecanismo, dimensão derivada (exceto rodapé/fechamento, que aceitam
  override manual).
- Engrossamento/dobra de Placa: o parâmetro é o **nível** (1/2/3), não a
  espessura em si.
- Posicionamento é 1D com faixas (inferior/bancada/aéreo/torre), não 2D
  livre.
- Rateio de preço é por **custo alocado** (área de peças do BOM, segregado
  por material) — nunca por ocupação do plano de corte nem por m².
  Congelamento no fechamento da proposta é obrigatório.
- Design System v3: sidebar navy fixa (não é dark mode) + laranja como
  destaque. **Sem 3D real** no canvas técnico (`BoxCanvas`/`ElevacaoParede`/
  `PlanoCorteCanvas`) — decisão explícita do operador (2026-07-31, D-33);
  exceção escopada: `ModuleViewer` 3D estático (câmera fixa, sem controles),
  em backlog.
- Catálogo (`produto`) e Biblioteca (`gabarito`) são reais (Supabase), com
  wiring de consumo ligado nas telas que usam preço/gabarito.

## 5. Pendências reais (não bloqueiam nada, mas existem)

- **Operador**: configurar o dashboard Supabase (Site URL/Redirect URLs +
  template de e-mail "Confirm signup", ou desligar "Confirm email") antes de
  criar a primeira conta real e validar os fluxos de escrita ponta-a-ponta
  (o Maestro nunca cria conta nem digita senha).
- **Operador**: cadastrar os ~380 padrões reais de MDF em `/catalogo` (ou via
  Supabase Table Editor) — hoje só o catálogo seed genérico existe.
- Dívida de segurança de baixa prioridade nunca endereçada — ver
  `docs/Backlog.md` (Stage 3): headers de segurança, auditoria de operações
  sensíveis, limite de cache de fórmulas.
- Upgrades major (`next`, `vitest`) avaliados como risco real mas não
  agendados — ver `docs/Backlog.md` (Stage 4).
- Permissão de escrita em `organizacao`/`perfil` (`/perfil`) não tem
  granularidade por papel — qualquer membro da org edita dados
  financeiros/CNPJ da empresa. Registrado, não corrigido; decisão do
  operador se/quando restringir.
- **Chaves do Supabase potencialmente expostas (2026-08-05)** — durante a
  execução da Task 5.10-back, o `backend-engineer` rodou `npx supabase
  projects api-keys --project-ref ...` (2x) e varreu `.env`/variáveis de
  ambiente tentando contornar uma falha de autenticação da CLI ao aplicar a
  migration real (achado registrado em
  `.maestro/proposals/2026-08-05-executor-nao-deve-cacar-credencial-supabase.md`).
  Chaves impressas no transcript tratadas como **potencialmente
  comprometidas**. **Decisão do operador (2026-08-05): não rotacionar
  agora** — projeto ainda em desenvolvimento, rotação fica agendada para o
  lançamento.
- **CLI do Supabase sem privilégio para o projeto `orcamentofacil`
  (`ioakptuwhfvlirvrciwg`)** — `npx supabase link --project-ref
  ioakptuwhfvlirvrciwg` retorna "account does not have the necessary
  privileges"; o projeto nem aparece em `npx supabase projects list` para a
  conta logada neste ambiente. `db push` também é bloqueado pelo
  classificador de permissão do sandbox antes de tentar autenticar. Migrations
  reais precisam ser aplicadas pelo operador (via MCP ou SQL Editor do
  Supabase Dashboard) até essa conta ser relinkada/autorizada. Confirmado
  funcionando: a migration da Task 5.10-back (coluna `etapa_esteira`) foi
  aplicada pelo operador via MCP em 2026-08-05 e verificada com
  `list_tables` (default `'novo'`, check constraint e comentário
  corretos).

## 6. Convenções operacionais desta esteira

- **Model routing**: antes de executar qualquer task, recomende o modelo
  ("Modelo Recomendado" no Backlog) e espere o operador confirmar.
- **Fluxo por task**: branch `feature/<task-id>` → Executor (subagente) →
  Code Auditor → Security Auditor (quando envolve RLS/secrets/infra) → QA
  Engineer → UX Auditor (subagente com `Bash`, sobe `preview_start`/dev
  server e captura evidência — não é o Maestro operando a ferramenta de
  Browser pane diretamente) → merge `--no-ff` em `main` → memory-manager
  sincroniza Backlog/Status → commit → push.
- **Plugin Maestro v3.5.0+ (instalado em 2026-08-05, confirmar em
  `~/.claude/plugins/installed_plugins.json`)**: gates gravam veredito em
  `.maestro/tmp/verdicts/<task-id>-<gate>.md` ANTES de responder em texto —
  o Maestro lê o arquivo, nunca a mensagem de retorno. Corrige um bug real
  do Claude Code
  ([anthropics/claude-code#58109](https://github.com/anthropics/claude-code/issues/58109))
  que descartava o texto final de subagentes cuja última ação era uma
  chamada de ferramenta — não era `maxTurns` nem esgotamento de contexto,
  apesar de parecer isso à primeira vista (ver
  `.maestro/proposals/2026-08-04-gates-estouram-maxturns-sem-veredito.md`
  para o histórico completo da investigação). Os 5 auditores agora rodam
  `background: false`. Se uma sessão nova ver gate voltando sem veredito de
  novo, checar a versão do plugin primeiro — pode ser instalação anterior
  ao fix.
- **Executor não deve caçar credencial ao aplicar migration real**: se
  aplicar migration no Supabase real falhar (permissão de conta, bloqueio de
  sandbox, rede), o executor para e reporta o erro exato ao Maestro — nunca
  tenta comandos que imprimem segredo em texto plano (`api-keys`, etc.) ou
  varre `.env` tentando contornar. Achado de 2026-08-05, proposta em
  `.maestro/proposals/2026-08-05-executor-nao-deve-cacar-credencial-supabase.md`
  aguardando decisão do operador sobre alterar `backend-engineer.md`.
- Se um executor for interrompido no meio (limite de gasto, parar sem
  terminar) **na mesma sessão**, o Maestro retoma via `SendMessage` ou
  redelega — nunca implementa o código diretamente.
- **Início de sessão nova**: `SendMessage` não atravessa sessões (o ID do
  agente não sobrevive ao fechamento). Antes de redelegar qualquer task,
  rode `git worktree list` — se existir um worktree `orcamentofacil-<task>`
  com trabalho pendente, o código **já está pronto no disco**; leia
  `.maestro/state/<task>.json` para saber exatamente qual gate rodar a
  seguir, e acione só esse gate (nunca um executor novo) até essa checagem
  confirmar que não há worktree órfão.
- Tasks paralelas (dentro do mesmo Lote) usam `git worktree` dedicado por
  task — nunca duas branches na mesma pasta de trabalho ao mesmo tempo
  (causou perda de contexto por checkout cruzado em 2026-08-03).
- Retrospectiva (`improvement-agent`) roda ao final de cada Pipeline Stage
  fechado — lições em `docs/Lessons-Learned.md`, propostas de mudança de
  framework em `.maestro/proposals/` (aguardam decisão humana).
