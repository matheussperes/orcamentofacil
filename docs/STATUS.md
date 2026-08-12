# Status Atual

> Atualizado em 2026-08-11 (Task 3.6 mesclada). Este arquivo é o ponto de partida de qualquer
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

**Lote 1 (Confiança e estado) ✅ fechado por completo** — 7/7 tasks concluídas (5/5 back + 2/2 front).

**Lote 2 (Lacunas funcionais) ✅ fechado por completo — 17/17 tasks concluídas**.

**Lote 3 — Tasks 3.1/3.3 (motor + front), 3.2, 3.4, 3.5 (motor + front), 3.6, 3.8 (back + front), 3.10–3.11 (motor), 3.13 (catálogo-back) e 3.13 (catálogo-front) mescladas (12/~14)**:
- **Task 3.1/3.3 (motor)** ✅ (2026-08-11) — Bin-packing melhorado: guilhotina com lista de retângulos livres + simulated annealing (PRNG semeado, `MAX_ITERACOES=5000` fixo). Reescrito em `lib/engine/box/cutting.ts`. Kerf como parâmetro opcional em `GrupoChapas.meta?`, integração em Web Worker será na Task 3.1/3.3 (front). Todas as 7 invariantes V1–V7 (Modelo 8.5) com teste dedicado; 3 exemplos numéricos reproduzidos com valores exatos. `code-auditor` APROVADO (1ª real), `qa-engineer` APROVADO (1ª, 466 testes, verificação aritmética manual). **Desbloqueia Task 3.1/3.3 (front).**
- **Task 3.1/3.3 (front)** ✅ (2026-08-11) — Web Worker para `planoDeCorte` com estado UI `calculando → pronto`, estimativa síncrona + busca assíncrona, fallback para main thread. Kerf real do perfil (`espessuraSerraPadraoMm`, Task 4.16-back) integrado em `CorteMaterialLab` e `EditorItemNucleo`. Indicador "Otimizando plano de corte…" visual. `code-auditor` APROVADO (3ª convocação real), `qa-engineer` APROVADO (2ª tentativa, 472 testes ao final, teste de fallback coberto). **`ux-auditor` APROVADO (1ª tentativa real, screenshots confirmando estimativa síncrona sempre visível, sem flash de layout na substituição pelo resultado do Worker, tokens do Design System conformes)** — 2 observações não bloqueantes: (1) Critério do contrato sobre "canvas vazio em loading" não se aplica a este fluxo (a estimativa síncrona já preenche desde primeiro render); (2) `EditorItemNucleo.tsx` tem mistura pré-existente de classes CSS legadas com tokens Tailwind, fora do escopo desta task. Impacto Visual: Leve. **Fecha a Task 3.1/3.3 (motor + front) por completo — itens 3.1 (bug do marceneiro, faixa livre ignorada) e 3.3 (avaliação de troca de algoritmo) do backlog-fonte resolvidos ponta a ponta.**
- **Task 3.5 (motor)** ✅ (2026-08-11) — Fita de borda discriminada por cor: agregação em `lib/engine/consolidar.ts` com `larguraFitaMm()` (regra "menor fita ≥ espessura final" via `[22,35,65]`), `somaFita()` (Map por `cor|largura`), tipo `GrupoFita`, campo `fitaPorCor` em `EngineOutput["consolidado"]`. `fitaTotalM` preservado — invariante soma(fitaPorCor)===fitaTotalM verificada manualmente. 478 testes (10 novos), zero regressão. `code-auditor` APROVADO (1ª), `qa-engineer` APROVADO (1ª). **Desbloqueia Task 3.5 (front) e Task 3.6.**
- **Task 3.10–3.11 (motor)** ✅ (2026-08-11) — Tampo: tipo `ModeloTampo` e `ConfigTampo` em `lib/engine/elemento-continuo/types.ts`; `modeloDoTampo()` deriva `modelo` de `engrossamento` via projeção pura (impossibilita invariante `modelo ⟺ engrossamento` ser violada); `ESPESSURAS_VALIDAS_POR_MODELO_TAMPO` (simples 15/18/25; engrossado/dobrado base 15 → 30/45/60; base 18 → 36/54); funções de validação/operação em `lib/engine/elemento-continuo/explode.ts` (`validarEspessuraTampo`, `espessuraFinalDoConfigTampo`, `validarConfigTampo`, `trocarModeloTampo` — limpa espessura ao trocar modelo incompatível). `explodeTampo` calcula `fitaM` real. 490 testes (15 novos), zero regressão. 3 exemplos numéricos e 3 exemplos de rejeição reproduzidos. `code-auditor` APROVADO (1ª), `qa-engineer` APROVADO (1ª). **Desbloqueia Task 3.10–3.11 (front) e Task 3.12.**
- **Task 3.8 (back)** ✅ (2026-08-11) — Persistência de override de quantidade por item da lista de material: migration `supabase/migrations/20260811110000_lista_material_override.sql` cria tabela `lista_material_override` (colunas `organizacao_id`, `orcamento_id`, `item_chave`, `quantidade`; UNIQUE `(orcamento_id, item_chave)`, CHECK `quantidade >= 0`; RLS com SELECT/INSERT/UPDATE/DELETE escopadas por `organizacao_id`). Server Actions `definirOverrideQuantidade`, `removerOverrideQuantidade` e leitura `listarOverridesQuantidade` em `lib/lista-material/override.ts` com checklist de posse (organização do servidor, rejeição cross-tenant). Rejeição por orçamento congelado em ambas Server Actions de escrita, sem bypass. 506 testes (10 novos), zero regressão. `code-auditor` APROVADO (1ª), `security-auditor` APROVADO (1ª, RLS + posse + congelamento verificados), `qa-engineer` APROVADO (1ª, 5 critérios + posse cruzada). Sem UI/ux-auditor. **Migration NÃO aplicada no Supabase real** — bloqueio de CLI pendente operador. **Desbloqueia Task 3.8 (front).**
- **Task 3.13 (catálogo-back)** ✅ (2026-08-11) — Bucket de Storage `texturas` (read-only `authenticated`, escrita `service_role`), campo `texturaUrl?: string` em `EspecificacaoChapa`, validação anti-hotlink em `lib/produto/acoes.ts`. **2 rodadas de gate**: `security-auditor` reprovou 1ª tentativa por bypass no `.trim()` da validação — correção: `.replace(/[\u0000-\u0020\u007f]/g, "")` com testes de 10 variantes de bypass. `code-auditor` APROVADO (1ª), `security-auditor` APROVADO (2ª), `qa-engineer` APROVADO (1ª, 504 testes, 8 novos). Sem UI. **Migration NÃO aplicada no Supabase real** — bloqueio de CLI pendente operador. **Desbloqueia Task 3.13 (catálogo-front).**

**Lote 4 — Primeira task mesclada (1/13)**:
- **Task 4.16 (back)** ✅ (2026-08-11) — Coluna `espessura_serra_padrao_mm numeric` em `organizacao` (default `3`, check `>= 0`), leitura/escrita no perfil. Round-trip mínimo, sem UI. `code-auditor` APROVADO (1ª), `qa-engineer` APROVADO (1ª, 452/452 testes). Sem impacto visual. Migration real não aplicada em Supabase (bloqueio CLI); pendente operador. **Desbloqueou a Task 3.1/3.3 (motor), Lote 3.**

Histórico das demais tarefas do Lote 2 (17/17 concluídas):
- **Task 2.1** ✅ (2026-08-06) — Investigação: caminho de "criar módulo do zero" já existe e funciona ponta a ponta (`/biblioteca` → botão "Novo módulo" → `/modulo` sem `?preset=` → salvar chama `criarGabarito` já existente → volta e aparece na listagem). Sidebar deliberadamente exclui `/modulo` do menu principal (Task 13.3b). Sem mudança de código necessária. Nenhuma branch de merge.
- **Task 2.1 (dedup)** ✅ (2026-08-06) — `deduplicarPromovidos()` em `lib/gabarito/listar.ts`: filtro derivado em memória escondendo gabaritosglobais promovidos da própria organização. 3 testes novos em `lib/gabarito/listar.test.ts`. `code-auditor` APROVADO (veredito em arquivo, build/lint/typecheck limpos), `qa-engineer` APROVADO (veredito em arquivo, 370 testes, 3 critérios). Sem RLS nova. Merge `--no-ff` em `main`.
- **Task 2.13** ✅ (2026-08-06) — Rename "Preset" → "Módulo" em toda a UI. Identificadores de código mantidos intactos. `code-auditor` APROVADO, `qa-engineer` APROVADO. Impacto Visual: Nenhum.
- **Task 2.8–2.11 (back)** ✅ (2026-08-06) — Backfill de `id`/`refX`/`refY`/`nome` em `ElementoParede` via migração de leitura. Sem migration SQL. `code-auditor` APROVADO, `qa-engineer` APROVADO (26 testes do domínio).
- **Task 2.7** ✅ (2026-08-06) — Motor: tipo `"pedra"`, bug fix em `existeElementoBloqueante`, aviso `TAMPO_SOBRE_PEDRA`. `code-auditor` APROVADO, `qa-engineer` APROVADO. Conflito de merge resolvido pelo motor-engineer.
- **Task 2.12 (back)** ✅ (2026-08-06) — Tabela `elemento_parede_preset`, RLS, domínio completo. `code-auditor` APROVADO, `security-auditor` APROVADO. Migration não aplicada em Supabase real (bloqueio de permissão de CLI).
- **Task 2.7-2.11 (front)** ✅ (2026-08-06) — UI de elemento de parede: tipo "Pedra" + edição inline convergente (lápis e clique 2D no mesmo estado) + seletores de referência de medida com rótulos descritivos. `code-auditor` APROVADO, `qa-engineer` APROVADO. **`ux-auditor` não executado (autorizado pelo operador em 2026-08-06)** — auditoria visual em screenshots confirmou critérios atendidos; veredito não gravado por bug known de transporte (gate indisponível, não reprovação). Achado incidental registrado para Task 5.5–5.6 (Lote 5).
- **Task 2.12 (front)** ✅ (2026-08-06) — UI de criar/listar/aplicar preset com threading via `AmbientesTabConectada`. Retrofit: campo "Nome (opcional)" adicionado ao formulário-base (gap descoberto na 1ª tentativa, type existia mas faltava input). `code-auditor` APROVADO, `qa-engineer` APROVADO, `ux-auditor` APROVADO. Impacto Visual: Leve.
- **Task 2.18 (motor)** ✅ (2026-08-06) — Posicionamento por vão até o vizinho: funções `calcularVizinhos`, `converterVaoParaX`, `converterXParaVao` em `lib/engine/parede/posicionamento.ts` (novo, 13 testes). Campo `refEntrada` em `ItemPosicionado`. Todos os 4 exemplos do Modelo 3.1.1 reproduzidos com valores exatos. Torre como vizinha cross-faixa. `code-auditor` APROVADO, `qa-engineer` APROVADO. Desbloqueia Task 2.18 (front).
- **Task 2.3–2.6** ✅ (2026-08-07) — Cadastro/edição/ordenação de múltiplos ambientes e paredes, seletor com indicação visual permanente de qual ambiente/parede está em edição (não depende de hover). `code-auditor` APROVADO (1ª tentativa, 425/425 testes), `security-auditor` APROVADO (2ª tentativa, cross-tenant corrigido), `qa-engineer` APROVADO (1ª tentativa, 426/426 testes, 8 critérios), `ux-auditor` NÃO EXECUTADO (autorizado pelo operador em 2026-08-07 — 1ª tentativa reprovou por bug CSS legado, corrigido; reconvocações posteriores rodaram com screenshots reais mas arquivo de veredito não gravou por bug de transporte, operador aprovouvisualmente). Impacto Visual: Completo.
- **Task 2.3–2.6 (alturas)** ✅ (2026-08-07) — UI de override de altura por parede em `AmbientesLab.tsx`: indicador "herdado"/"customizado" derivado, botão "Voltar ao herdado" que remove override. Aviso de propagação em `/perfil`. Funções puras `definirAlturaOverride`/`removerAlturaOverride` exportadas e testadas. `code-auditor` APROVADO (2ª tentativa), `qa-engineer` APROVADO (2ª tentativa, 445/445 testes), `ux-auditor` APROVADO (1ª tentativa, checklist §15.4, Impacto Visual Leve). Impacto Visual: Leve.
- **Task 2.18 (front)** ✅ (2026-08-08) — UI de inserção com campo de vão: substitui "X (mm)" por "Vão (mm)" com Select "Referência", conversão vão↔X via `converterVaoParaX`/`converterXParaVao`. Tabela "Itens posicionados" com colunas "Vão esq."/"Vão dir." recalculadas a cada render. `code-auditor` APROVADO (1ª tentativa), `qa-engineer` APROVADO (1ª tentativa, 445/445 testes), `ux-auditor` APROVADO (1ª tentativa, checklist §15.4, Impacto Visual Leve, 2 observações não bloqueantes para product-designer em task futura). Impacto Visual: Leve.
- **Task 2.19–2.23** ✅ (2026-08-08) — Bloco "Personalizar módulo" no formulário de inserção: 9 campos (largura/altura/profundidade, cor+espessura da caixa, cor+espessura das portas —ocultos sem `GrupoPortas`—, fundo, puxador), repopulados via `useEffect` a cada módulo. Spread não-mutativo sobre `preset.box`. `code-auditor` APROVADO (1ª), `qa-engineer` APROVADO (1ª, 445 testes), `ux-auditor` APROVADO (1ª, §15.4, Impacto Visual Leve). Impacto Visual: Leve.
- **Task 2.14–2.17** ✅ (2026-08-08) — Seleção em cascata ambiente → faixa → módulo: 2 itens novos (cascata real, rótulo "Meio"), 2 já implementados em tasks anteriores (confirmados sem reimplementação). `code-auditor` APROVADO (1ª), `qa-engineer` APROVADO (1ª, 445 testes), `ux-auditor` APROVADO (1ª, §15.4, Impacto Visual Leve). Achado incidental: mensagem de validação cita `"bancada"` — candidato a task futura. Impacto Visual: Leve.
- **Task 2.31** ✅ (2026-08-08) — Botão "Cancelar divisão" em `LinhaPropostaCard.tsx`: reverte divisão, devolve itens para linha mãe (rastro de origem efêmero em `origemSplit` React state). Trata mãe já excluída sem quebra. Reutiliza Server Actions existentes. `code-auditor`/`qa-engineer`/`ux-auditor` APROVADO (1ª tentativa cada). Impacto Visual: Leve.
- **Task 2.32** ✅ (2026-08-08) — Função pura `ambientesDaLinha` (`lib/linha-proposta/ambientes.ts`, 4 testes) deriva nomes dos ambientes de uma Linha de Proposta. Caption "Ambiente: {nome(s)}" em `LinhaPropostaCard.tsx`, recalculado do estado atual. Vínculo nunca se perdeu nos dados, só não era exibido; sobrevive a dividir/mesclar/renomear. `code-auditor`/`qa-engineer`/`ux-auditor` APROVADO (1ª cada). Achado incidental: `carregar.ts` cria linha padrão cobrindo TODOS os ambientes — decisão de produto pendente. Impacto Visual: Leve.
- **Task 2.24–2.26** ✅ (2026-08-08) — Elevação da parede passa a desenhar os módulos posicionados: item 2.25 (rótulo "Meio") já estava pronto, confirmado sem reimplementação. Novos: 2.24 (função `retangulosDosItens` deriva geometria via `derivarY`/`larguraDoItem`/`alturaDoItem` existentes) e 2.26 (torre desenhada com retângulo real, primeiro na ordem SVG, módulos das demais faixas por cima em sobreposição). `code-auditor` APROVADO (1ª), `qa-engineer` APROVADO (1ª, 452 testes), `ux-auditor` APROVADO (1ª real — 1ª rodada auditoria completa mas veredito não gravou por bug transporte; reconvocada sem contar reprovação; §15.4 com desktop/tablet/mobile). Impacto Visual: Completo.

**Lote 1 (Confiança e estado) — Histórico (7/7 tasks concluídas):**
- **Task 1.1–1.3** ✅ (2026-08-04) — Invalidação de cache após mutação + aba persistida na URL + "atualizar render" sem F5. `code-auditor` indisponível (2x sem veredito, estouro técnico) — revisão assumida pelo Maestro. `qa-engineer` aprovou com veredito próprio (verificação real: aba sobrevive a F5, `forceMount` e `router.refresh()` validados). Sem impacto visual.
- **Task 1.8** ✅ (2026-08-04) — Investigação: link "← calculadora" em `/modulo` já aponta para `/` (Dashboard), destino mais adequado. Sem mudança de código. Investigação factual verificada antes do merge.
- **Task 1.5–1.6** ✅ (2026-08-05) — Teste automatizado de paridade financeiro ↔ proposta. Causa raiz: `FinanceiroTabConectada.tsx` faltava `router.refresh()` após `salvarConfiguracaoPrecificacao`. `code-auditor` indisponível (estouro técnico) — revisão assumida pelo Maestro (lint/typecheck/test + diff relido). `qa-engineer` aprovado (5/5 critérios). Sem impacto visual.
- **Task 1.7** ✅ (2026-08-05) — Bug de chapas de 6 mm em "valor por chapa": `consolidarResultados` derivava contagem de chapas por fórmula de área, desacoplada do bin-packing real. Correção: fonte única de verdade do `planoDeCorte`. `code-auditor` indisponível (estouro técnico) — revisão assumida pelo Maestro (lint/typecheck/test + diff relido, 348 testes). `qa-engineer` aprovado (5/5 critérios, reprodução do bug confirmada). Sem impacto visual.
- **Task 5.10 (back)** ✅ (2026-08-05, Lote 5) — Coluna `orcamento.etapa_esteira` (migration aplicada no Supabase real), Server Action `atualizarEtapaEsteira` (transições T1–T3), gatilho de avanço automático para `aguardando_aprovacao` no congelamento. `code-auditor` aprovado (veredito em arquivo), `qa-engineer` aprovado (358 testes, 5 critérios). Sem RLS nova, sem UI. Desbloqueia a Task 1.9 (back/front).
- **Task 1.9-back** ✅ (2026-08-05) — Server Action `reabrirOrcamento` com autorização por papel (`admin` obrigatório), congelamento revertido, etapa avançada quando aplicável. `code-auditor` aprovado, `security-auditor` aprovado (gate obrigatório para autorização por papel), `qa-engineer` aprovado (364 testes, 6 novos). Sem impacto visual.
- **Task 1.9-front** ✅ (2026-08-06) — Botão "Reabrir orçamento" no Alert de congelamento, visível/habilitado só para `admin`, abre Dialog de confirmação, liga à Server Action `reabrirOrcamento`. Bug de causa raiz corrigido em `app/globals.css` (colisão de classe `.grid` legada com utilitário Tailwind `grid`, quebrava DialogContent em desktop). `code-auditor` aprovado, `qa-engineer` aprovado (367 testes), `ux-auditor` aprovado na 2ª tentativa. Impacto Visual: Leve.

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
- **Operador**: aplicar migration real `elemento_parede_preset` (Task 2.12-back)
  via MCP ou Dashboard Supabase — migration `20260806100000_elemento_parede_preset.sql` foi aprovada em audit mas não pode ser aplicada via CLI (bloqueio de permissão de conta).
- **Operador**: aplicar migration real `lista_material_override` (Task 3.8-back)
  via MCP ou Dashboard Supabase — migration `20260811110000_lista_material_override.sql` foi aprovada em audit mas não pode ser aplicada via CLI (mesmo bloqueio de permissão de conta).
- **Operador**: aplicar migration real `storage_texturas` (Task 3.13-catálogo-back)
  via MCP ou Dashboard Supabase — migration `20260811110000_storage_texturas.sql` foi aprovada em audit mas não pode ser aplicada via CLI (mesmo bloqueio de permissão de conta).
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
