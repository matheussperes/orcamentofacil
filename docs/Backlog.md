# Backlog — orcamentofacil

> Histórico detalhado de cada task (descrição completa, critérios de
> aceitação, auditorias, tentativas, decisões de design) vive no `git log`
> de cada commit/branch `feature/<task-id>` — não neste arquivo. Este
> documento mantém só o que ainda precisa de decisão ou execução, e um
> resumo do que já foi feito. Ver `docs/STATUS.md` para o estado atual do
> produto e as convenções da esteira.

---

## Pendente

### Dívida de segurança — Stage 3 (avaliação de 2026-07-21, nunca executada)

| Task | O que é | Status | Modelo |
|---|---|---|---|
| 3.1 Rate limiting login/register | Throttling em `/api/auth/*` | **Obsoleto** — rotas V1 removidas, Supabase Auth já trata isso | — |
| 3.2 Limitar cache de fórmulas | LRU no cache de `evaluator.ts` | **Obsoleto** — `evaluator.ts` (motor V1) foi removido na Task 10.1 | — |
| 3.3 Auditoria em operações sensíveis | Log de login/exclusão/nova versão de orçamento | Precisa de re-scoping — descrição original referenciava a tabela `Auditoria` do Prisma (removido); reavaliar se ainda faz sentido e onde viveria no schema Supabase atual | Sonnet |
| 3.4 Headers de segurança | CSP, X-Frame-Options, etc. em `next.config.js`/`middleware.ts` | Planejado, ainda válido | Haiku |
| 3.5 bcryptjs no Edge Runtime | Warning de build | **Obsoleto** — `bcryptjs`/JWT próprio removidos junto com o Prisma (Task 11.1), Supabase Auth não usa isso | — |

### Avaliação de upgrades major — Stage 4 (não agendado)

| Task | O que é | Modelo |
|---|---|---|
| 4.1 `next@14` → `next@16` | Avaliação de breaking changes, plano de rollback — não é o upgrade em si | Opus |
| 4.2 `vitest@2` → `vitest@4` | Idem | Sonnet |

### Gaps de schema registrados, sem task própria ainda

- `elemento_continuo` não tem coluna de cor — a cor de um tampo/rodapé/
  tamponamento/fechamento não sobrevive a reload (cai em fallback). Achado
  durante a Task 13.3d, nunca virou migration. Ver `docs/Lessons-Learned.md`
  (Padrão 5, 2026-07-31).
- `organizacao`/`perfil`: política de UPDATE libera qualquer papel
  (`admin`/`vendedor`/`projetista`), sem granularidade — um vendedor pode
  editar CNPJ/endereço/padrões financeiros da empresa. Achado na Task 13.7a.

### Backlog futuro (pós-MVP — avaliado, não agendado)

> Registrado em 2026-07-28 a pedido do operador. Nada aqui está autorizado
> pra execução — é só pra não perder a ideia. Vira task real (contrato,
> modelo, branch, gates) quando e se for priorizado.

- **Preview 3D leve e sincronizado** (maior maturidade das ideias): preview
  3D **estático** (sem órbita de câmera livre, sem PBR/iluminação
  realista) derivado dos mesmos dados do canvas 2D (`Parede.itens[]`,
  `ItemPosicionado`, material) — nunca uma segunda fonte de verdade. Não
  reabre a decisão "sem 3D" do Design-System v3 nos canvases existentes
  (`BoxCanvas`/`ElevacaoParede`/`PlanoCorteCanvas` continuam 2D pra
  sempre) — seria um componente novo e adicional. Pré-requisito: revisar a
  frase "sem exigir modelagem 3D" do `docs/PRD.md` antes de começar.
- **Telas adicionais**: `/clientes` (CRUD/lista dedicada, hoje só captura
  inline no fluxo de novo orçamento), Histórico de Orçamentos (timeline de
  versões, hoje só existe auditoria de baixo nível), Central de Ajuda
  (onboarding/tutoriais, não existe nada ainda).
- **Componentes de polish**: Command Palette (⌘K), centro de notificações,
  histórico lateral de atividade, breadcrumb completo, painel de
  propriedades contextual generalizado (já existe parcialmente pro
  Elemento Contínuo), empty states ilustrados, tour guiado, skeleton
  loading, atalhos de teclado globais, modo foco na aba Ambientes.

---

## Concluído

### Fase A — Discovery ✅ (2026-07-24)
PRD, Modelo de Domínio, Mapa de Telas — todos em `docs/`, decisões D-01 a
D-26 fechadas.

### Fase B — Motor e Dados ✅ (Stages 10–12, concluídas 2026-07-24 a 07-27)

| Stage | O que entregou |
|---|---|
| 10 — Remoção do motor V1 | `lib/engine/engine.ts`/`templates.ts`/`evaluator.ts` removidos; `consolidarResultados` preservado (compartilhado com V3) |
| 11 — Persistência multi-tenant | Supabase real conectado; `organizacao`/`perfil` + RLS + trigger de signup (11.1); 9 tabelas do domínio com RLS (11.2); teste de isolamento por tenant, `supabase/tests/isolamento-tenant.sql` (11.3); seed de catálogo padrão no signup + `fork_gabarito()` RPC (11.4) |
| 12 — Extensões do motor | `Placa` + engrossamento/dobra (12.1); `Parede`/`Ambiente`/validação Tier 1-2 (12.2); `detectarConjuntos`/override de junção (12.3); `ElementoContinuo` unificado, remove tamponamento estrutural antigo (12.4); veio de chapa no bin-packing (12.5); precificação V2 — 4 modos + rateio por custo alocado (12.6, Opus); liga `ElementoContinuo` ao pipeline principal (12.7) |

### Fase C — Experiência ✅ (Stage 13, concluída 2026-07-28 a 07-31 — fecha o Épico V2)

| Task | Tela/entrega |
|---|---|
| 13.0 | `BoxCanvas` modo "conjunto" (lista de itens posicionados, não um por vez) |
| 13.1 | Editor de Item dirigido por capacidade (`BoxModule` ou `Placa`), seletor de engrossamento, sentido do veio |
| 13.2a/b/c | `/ambientes`: elevação 2D + validação Tier 1/2, Conjuntos + handle de junção, Elementos Contínuos (remove `TamponamentoInstancia` de vez) |
| 13.3a–e | Auth (`/login`/`/signup`), shell v3 + Dashboard, `/orcamento/[id]` com 4 abas + fluxo de novo orçamento, persistência real de Ambientes, Editor de Item ligado a item real |
| 13.4 | Aba Corte & Material: plano de corte agregado, lista de material congelável |
| 13.5 | Aba Financeiro: resumo de 6 campos, liga `ratearPrecificacao` a uma tela pela primeira vez |
| 13.6a/b | Aba Proposta: Linhas de Proposta com render automático e rateio por grupos reais; `/proposta/[id]/pdf` imprimível |
| 13.7a/b/c | `/perfil`, `/catalogo` (+ religa consumo real nas telas existentes), `/biblioteca` (+ fork-on-save em `/modulo`) |

**290 testes passando ao final.** Zero migrations pendentes de aplicar — tudo
que exigiu schema novo já foi aplicado no projeto Supabase real
(`ioakptuwhfvlirvrciwg`), confirmado por `get_advisors` (security) sem
achados novos a cada mudança.

### V1 — Correção e refatoração visual ✅/superseded (Stages 1, 2, 5–9)

Backlog original (auditoria de 2026-07-21) sobre o produto V1: correção de
segurança crítica (Stage 1, `expr-eval`/senha hardcoded/etc.) e refatoração
visual da página única pra Tailwind + shadcn/ui (Stages 5–9). Tudo isso foi
**absorvido pela reorientação V2** de 2026-07-24 — as telas que a Stage 13
construiu (`/orcamento/[id]` com abas) substituem por completo a página
única que as Stages 5–9 estavam só re-estilizando; os poucos itens ainda
não feitos daquele backlog original (7.3, 8.1, 9.1) foram reabsorvidos
dentro das tasks reais da Stage 13. Detalhe completo, se precisar, no
`git log` anterior a 2026-07-24 ou em `docs/archive/`.

---

## Resumo do Épico V2

| Fase | Foco | Status |
|---|---|---|
| A — Discovery | PRD, Modelo de Domínio, Mapa de Telas | ✅ |
| B — Motor e dados | Stages 10–12 | ✅ |
| C — Experiência | Stage 13 | ✅ |
