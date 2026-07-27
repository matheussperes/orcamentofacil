# Status Atual, Decisões, Pendências e Próximos Passos

> Atualizado em 2026-07-24. Este arquivo é o ponto de partida de qualquer
> sessão nova — leia antes de assumir o que já existe. **O projeto virou V2
> nesta sessão** (ver Seção 1) — não confie em nada anterior a 2026-07-24
> sobre arquitetura/motor sem checar contra os documentos da Seção 7.

## 1. Onde estamos agora (resumo de uma linha)

O projeto deixou de ser "refatoração visual da V1" e virou **a V2 do
produto**: painel de orçamento para marceneiros, motor de caixa (V3)
estendido, persistência real multi-tenant via Supabase. **Fase A (discovery)
aprovada pelo operador. Fase B (motor + dados) em andamento**: Task 10.1
(remoção do motor V1), Task 11.1 (Supabase Auth + RLS, Prisma removido),
Task 11.2 (modelo de dados multi-tenant completo — 9 tabelas com RLS) e
Task 11.3 (teste de isolamento por tabela, 11/11 tabelas multi-tenant) já
concluídas, mescladas e publicadas. Próximo passo: **Task 11.4** (estratégia
de catálogo).

## 2. Como orientar-se (leia nesta ordem)

1. **`docs/00-briefing-v2-reorientacao_1.md`** — o briefing do operador que
   disparou a V2. Fonte de verdade de produto/negócio.
2. **`docs/PRD.md`** — visão, persona, jornada, requisitos funcionais, escopo
   negativo, decisões D-01 a D-26 (todas fechadas ou assumidas).
3. **`docs/Modelo-de-Dominio.md`** — a fundação técnica. `ItemOrcamento` union
   (`BoxModule | Placa`), Parede/Ambiente/Conjunto, elementos contínuos
   unificados (tampo/rodapé/tamponamento/fechamento), rateio de preço por
   custo alocado, veio de chapa. **Já corrigido e auditado pelo operador**
   (Seção 10 do próprio doc — todas as assunções confirmadas).
4. **`docs/Mapa-de-Telas.md`** — IA em telas separadas (`/orcamento/[id]` com
   abas), derivada do modelo de domínio.
5. **`docs/Backlog.md`** — o backlog de execução. Stages 1–9 são a
   dívida técnica/visual da V1 (maioria concluída ou reabsorvida — ver a
   tabela "Status das Stages 1–9 sob a ótica da V2" logo no início do Épico
   V2). **Stages 10–13 são o trabalho real da V2** — é aqui que a próxima
   sessão deve olhar para saber a próxima task.
6. **`.maestro/agents/maestro.md`** e demais arquivos em `.maestro/` — o
   framework de orquestração usado (branch efêmera por task → Code Auditor
   [+ Security/UX Auditor quando aplicável] → merge `--no-ff` na branch
   principal `claude/budget-planner-pipeline-fidr4y`, que faz papel de
   `main` neste repo).

## 3. O que está construído e funcionando

### Motor de cálculo (V3 — único motor agora)
- `lib/engine/box/*`: explosão recursiva de caixa → BOM, bin-packing/plano de
  corte, migração idempotente de presets (`migrate.ts`).
- `lib/engine/consolidar.ts` (novo — Task 10.1): `consolidarResultados`,
  extraída de `engine.ts` (V1) porque era compartilhada com o caminho de
  caixa. É o ponto de consolidação de BOM hoje.
- `lib/orcamento.ts`: `ModuloOrcamento` é union discriminada por `origem` —
  hoje só `{ origem: "custom_box"; box: BoxModule }` (união de 1 membro; a
  Task 12.1 adiciona `{ origem: "placa"; placa: Placa }`, **não colapsar em
  tipo único**).
- **O motor V1 de templates foi removido por completo** (Task 10.1, 2026-07-24):
  `lib/engine/engine.ts` (calcularEngine), `templates.ts`, `evaluator.ts`,
  `lib/templateOverrides.ts`, `lib/validation/templates.ts`,
  `app/api/calcular`, `app/api/templates`, `app/configuracoes/engenharia` —
  todos removidos. 96 → 69 testes (23 eram do V1; nenhum órfão).
- 69 testes passando, cobrindo só o motor V3.

### Persistência e Auth (novo — Supabase, Tasks 11.1 + 11.2)
- Projeto Supabase real conectado: **`orcamentofacil`**
  (`ioakptuwhfvlirvrciwg`, `ca-central-1`, Postgres 17). Use as ferramentas
  MCP do Supabase (`ToolSearch` por `mcp__7d44308e...`) para consultar/alterar.
- **Prisma foi removido inteiramente** do projeto (schema, seed, client,
  `bcryptjs`, `jose`). Autenticação própria (`lib/auth.ts`, `middleware.ts`
  JWT) também removida.
- Migrations aplicadas (versionadas em `supabase/migrations/`):
  `organizacao` + `perfil` (Task 11.1), RLS habilitada, políticas, função
  `private.org_do_usuario()` (SECURITY DEFINER, fora do PostgREST — não expor
  outra função assim sem o mesmo cuidado) e trigger `on_auth_user_created`
  que cria organização+perfil no signup (D-13 real).
- **Task 11.2 (2026-07-27)**: 9 tabelas novas, todas com RLS + políticas
  (`private.org_do_usuario()`, initplan-otimizada): `cliente`, `produto`,
  `gabarito`, `orcamento`, `ambiente`, `parede`, `elemento_continuo`,
  `linha_proposta`, `lista_material`. `organizacao_id` é denormalizado em
  toda tabela (RLS direta por coluna, não via join na tabela pai — decisão
  fechada pensando na Task 11.3). `gabarito` é a única com `organizacao_id`
  nullable (null = base global read-only, D-15 — fork fica para a 11.4).
  `lista_material` não tem política de UPDATE (snapshot imutável). `produto`
  e `gabarito` nascem vazios — população é Task 11.4. Rascunho de referência
  completo (spec de cada coluna) em `.maestro/tmp/schema.sql`.
- Clientes Next.js: `lib/supabase/{client,server,middleware}.ts` — **nunca
  misturar** o cliente de servidor com o de browser.
- `get_advisors` (security) rodando **zero achados** em 2026-07-27 (conferido
  pelo Maestro após a Task 11.2, não só relatado pelo executor) — rodar de
  novo depois de qualquer migration nova (é grátis e pega RLS esquecida).
- Rotas V1 de auth/clientes/orçamentos (Prisma) foram removidas junto — elas
  nunca estiveram ligadas ao fluxo de caixa (só ao modelo V1). A Fase C
  constrói o acesso a dados real contra o modelo novo.

### UI existente (Tailwind + shadcn/ui, Stages 5–7 da V1)
- Fundação Tailwind + shadcn/ui completa (`tailwind.config.ts`, tokens do
  `docs/Design-System.md`, `components/ui/{button,stepper}.tsx`).
- Bug estrutural corrigido (Task 7.1b): `lib/utils.ts`/`cn()` usa
  `extendTailwindMerge` registrando os 7 tokens de fontSize customizados como
  grupo próprio — sem isso, `tailwind-merge` descartava silenciosamente
  classes de tamanho de fonte customizado combinadas com cor.
- Laboratório `/modulo` (accordion Caixa→Divisões→Portas→Gavetas→Puxador +
  canvas de seleção) já convertido e é a **base direta do Editor de Item** da
  V2 (Task 13.1).
- `app/page.tsx` (produção, página única) segue existindo mas **será
  decomposto na Fase C** nas abas de `/orcamento/[id]` — não invista nele além
  do necessário para não quebrar o build.

## 4. Decisões tomadas (não reabrir sem motivo novo)

Todas as decisões D-01 a D-26 do briefing estão fechadas — ver `docs/PRD.md`
Seção 7. Destaques que mais afetam código:
- **Motor V3 mantido, V1 descartado** (feito). Motor **estendido** com Placa,
  veio de chapa, Parede/Ambiente, elementos contínuos unificados, rateio.
- **Supabase Auth + RLS, Prisma fora** (feito). Tenant = Organização.
- **Elementos contínuos**: tampo/rodapé/tamponamento(4 posições)/fechamento
  são o mesmo mecanismo, dimensão derivada (exceto rodapé/fechamento, que
  aceitam override). Ver `docs/Modelo-de-Dominio.md` Seção 3.4/3.5.
- **Engrossamento/dobra**: o parâmetro real é o **nível** (1/2/3), não a
  espessura — `espessuraFinal = base × (1+nível)`. Vale para base 15mm e
  18mm. Ver Seção 2.1 do Modelo de Domínio — **todas as assunções auditadas e
  confirmadas pelo operador**.
- **Posicionamento 1D com faixas**, não 2D livre.
- **Rateio de preço por custo alocado** (área de peças do BOM, segregado por
  material), não por ocupação do plano de corte nem por m². Congelamento no
  fechamento da proposta é obrigatório.
- **Cadência de execução visual**: agrupar tasks e validar em lote (decisão
  do operador após a Stage 7) — não task-a-task como nas Stages 1-7.

## 5. Lacuna vs. o PRD original (V1) — resolvida pela V2

O `docs/PRD-PIPELINE.md` (histórico, V1) é mantido só como referência — o
`docs/PRD.md` (V2) o substitui. A lacuna que o STATUS.md antigo registrava
("orçamento não persiste, tudo em useState/localStorage") está sendo resolvida
pela própria Fase B (Stages 11-12): persistência real multi-tenant é
requisito explícito da V2, não um débito à parte.

## 6. Pendência em aberto agora (prioridade atual)

**Próxima task: 11.4 — Estratégia de catálogo** (D-15): produtos = cópia no
signup; gabaritos = base global read-only + fork na edição. As tabelas já
suportam isso (Task 11.2) — falta só a lógica de população/fork.

`supabase/tests/isolamento-tenant.sql` (Task 11.3) é o teste de isolamento
permanente: script `begin;...rollback;`, seguro de rodar contra o projeto
real quantas vezes quiser, sem resíduo e sem precisar de `service_role_key`.
Rode de novo depois de qualquer alteração de RLS futura.

Depois da Stage 11: Stage 12 (extensões do motor — Placa, Parede/Ambiente,
elementos contínuos, veio, precificação/rateio) e só então Stage 13 (telas da
Fase C). **Não pular para a Fase C antes do modelo de dados estar de pé** — é
regra explícita do briefing.

## 7. Convenções operacionais desta sessão (para a próxima também)

- **Model routing**: antes de executar qualquer task, recomende o modelo
  (tag "Modelo Recomendado" de cada task no Backlog) e espere o operador
  trocar (`/model ...`) e confirmar. Tasks de tooling/CRUD/SQL = Sonnet;
  decisões arquiteturais densas (discovery, rateio financeiro) = Opus.
- **Fluxo por task**: branch `feature/<task-id>` → subagente Executor
  (Backend/Frontend Engineer) → validação independente do Maestro (Code
  Auditor: build/lint/typecheck/test rodados de novo, não só relatados; UX
  Auditor via `preview_start` + `getComputedStyle`/pixel quando for visual;
  Security Auditor quando envolver RLS/secrets/infra) → merge `--no-ff` →
  atualizar status da task no `docs/Backlog.md` → commit → push.
- Screenshots do Browser pane dão timeout neste ambiente — usar `read_page` +
  `javascript_tool` como evidência.
- Memória do projeto (fora do repo, em `~/.claude/projects/.../memory/`) tem
  notas equivalentes — útil se este arquivo ficar desatualizado antes de eu
  lembrar de atualizá-lo de novo.

## 8. Mapa de dependências do motor V1 — HISTÓRICO, já executado

> Mantido só para auditoria histórica. O motor V1 **foi removido** na Task
> 10.1 (2026-07-24). A tabela abaixo é o que existia antes da remoção —
> não reflete mais o código atual.

| Arquivo (removido) | Uso do V1 |
|---|---|
| `lib/engine/engine.ts`, `templates.ts`, `evaluator.ts` | Motor de fórmulas em si |
| `lib/templateOverrides.ts` | Overrides de engenharia por template |
| `app/api/templates/route.ts`, `app/api/calcular/route.ts` | Rotas servindo templates/cálculo V1 |
| `app/configuracoes/engenharia/page.tsx` | Tela de edição de fórmulas/templates |
| `prisma/seed.ts` (Prisma inteiro removido na Task 11.1) | Semeava dados de template no banco |
| `lib/engine/engine.test.ts`, `evaluator.test.ts` | 23 testes do motor V1 |
