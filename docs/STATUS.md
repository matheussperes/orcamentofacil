# Status Atual

> Atualizado em 2026-07-31. Este arquivo é o ponto de partida de qualquer
> sessão nova. Histórico task-a-task (auditorias, tentativas, decisões)
> não vive mais aqui — está no `git log` e nos commits de merge de cada
> branch `feature/<task-id>`. Este arquivo mantém só o essencial.

## 1. Onde estamos

**Épico V2 completo.** Painel de orçamento para marceneiros: motor de caixa
paramétrico (V3), persistência multi-tenant real via Supabase, todas as telas
da experiência construídas. Fases A (Discovery), B (Motor e dados) e C
(Experiência/telas) — todas concluídas. Não há task planejada em aberto além
do registrado em `docs/Backlog.md` (dívida de segurança não endereçada +
"Backlog futuro pós-MVP", nada agendado).

Próximos passos dependem de uma nova conversa com o operador: novo escopo,
item do Backlog futuro, ou operação/manutenção do que já existe.

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

**Testes**: 290 passando (`npm run test`). `npm run lint`/`npm run typecheck`
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
  destaque. **Sem 3D real** no canvas técnico — decisão explícita do
  operador.
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

## 6. Convenções operacionais desta esteira

- **Model routing**: antes de executar qualquer task, recomende o modelo
  ("Modelo Recomendado" no Backlog) e espere o operador confirmar.
- **Fluxo por task**: branch `feature/<task-id>` → Executor (subagente) →
  Code Auditor → Security Auditor (quando envolve RLS/secrets/infra) → QA
  Engineer → UX Auditor ao vivo (feito pelo Maestro via Browser pane, não
  por subagente — subagentes não têm ferramenta de browser) → merge
  `--no-ff` em `main` → memory-manager sincroniza Backlog/Status → commit →
  push.
- Screenshots do Browser pane dão timeout neste ambiente — usar `read_page`
  + `javascript_tool` (`getComputedStyle`, `getBoundingClientRect`,
  `elementFromPoint`) como evidência.
- Se um executor for interrompido no meio (limite de gasto, parar sem
  terminar), o Maestro retoma via `SendMessage` ou redelega — nunca
  implementa o código diretamente.
- Retrospectiva (`improvement-agent`) roda ao final de cada Pipeline Stage
  fechado — lições em `docs/Lessons-Learned.md`, propostas de mudança de
  framework em `.maestro/proposals/` (aguardam decisão humana).
