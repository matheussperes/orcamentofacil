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

### Gaps de lógica/design registrados, sem task própria ainda

- `lib/linha-proposta/carregar.ts::criarLinhaPropostaDefault`: cria uma única
  Linha de Proposta default cobrindo TODOS os ambientes do orçamento, titulada
  com o nome do primeiro ambiente encontrado — simplificação pré-V2.1 nunca
  atualizada para suportar N ambientes (Lote 0). Achado incidental durante a
  Task 2.32 (2026-08-08) — a função `ambientesDaLinha` (nova, Task 2.32) corrige
  a exibição do vínculo, não a geração, mas a geração segue criando apenas uma
  linha de proposta bem fora da intenção da tarefa (em um projeto com 3 ambientes,
  usuário vê "Ambiente: Quarto, Cozinha, Banheiro" — esperado é ter linhas de
  proposta por ambiente, ou ao menos permitir split simples). Candidato a task
  futura, decisão de produto pendente se quer N linhas por padrão ou 1 linha
  compartilhada (como hoje).

### Gaps de rótulo/UI registrados, sem task própria ainda

- Mensagem de validação Tier 1/2 (elementos de parede, validação de posicionamento)
  ainda cita o identificador de domínio `"bancada"` em vez do rótulo atualizado
  "Meio". Achado incidental durante a Task 2.14–2.17 (2026-08-08) — renomear as
  mensagens é candidato a task futura de consistência, baixa prioridade.

### Épico V2.1 — Pré-Lançamento (Fase D)

> Fonte: `docs/01-backlog-pre-lancamento.md` (4 walkthroughs com um marceneiro
> real em produção, 87 itens) + `docs/PRD.md` Seção 10 (RF-19 a RF-38,
> decisões D-27, D-28, D-29, D-30, D-31, D-33 — D-32 foi revogada no mesmo dia
> em que foi registrada, ver nota abaixo) + `docs/Modelo-de-Dominio.md` Seções
> 3.1.1, 3.2, 3.2.1–3.2.3, 3.4.1, 4.1, 7.1, 8.1–8.6 e 11. **Numeração de item
> do documento-fonte preservada em cada Task ID** para rastreabilidade (ex.:
> Task "2.18" resolve o item 2.18 do backlog-fonte; Tasks "3.1/3.3" resolvem
> os itens 3.1 e 3.3 juntos — ver nota no Lote 3).
>
> **Revisão de 2026-07-31 — direção OR-Tools CANCELADA.** O operador
> descartou por completo a proposta "plano de corte assíncrono com Google
> OR-Tools" (worker Python externo, fila, entidade `PlanoCorteJob`). O antigo
> "Estágio OR-Tools — Plano de corte assíncrono" (tasks OR.1–OR.5) e as
> perguntas que o bloqueavam (Q-8 a Q-11) **saíram deste documento por
> completo** — não é histórico preservado, é remoção. Em seu lugar entrou a
> melhoria do bin-packing **100% TypeScript, síncrona, em Web Worker do
> navegador** (RF-34) — zero infraestrutura nova —, que fecha ao mesmo tempo
> os itens **3.1** (bug de aproveitamento relatado pelo marceneiro) e **3.3**
> (avaliação de troca de algoritmo) dentro do **Lote 3**, como tasks reais e
> sem bloqueio. Entrou também o **`ModuleViewer`** (RF-38, D-33) — visualização
> 3D estática do módulo em edição —, também no Lote 3.
>
> Legenda de tag (igual ao documento-fonte): 🔴 BLOQ · 🟠 BUG · 🟡 LACUNA ·
> 🔵 UX · ⚪ DEPOIS. Status: ⏱️ Planejado · ⛔ Bloqueada (decisão pendente,
> Seção 7.4 do PRD) — nenhuma task ⛔ deve ser executada antes da resposta do
> operador citada nela.
>
> **Ordem de dependência (regra do operador — não decidida diferente aqui):**
> Lote 0 → Lote 1 → Lote 2, em **sequência**. Lotes 3, 4 e 5 são
> **paralelos entre si e em relação ao Lote 0** — podem começar a qualquer
> momento. Lote 6 do documento-fonte é pós-lançamento e **não** entra como
> task agendada — foi registrado em "Backlog futuro" mais abaixo.
>
> **Critério de aceite transversal, toda task de UI desta fase (Design
> System Seção 15.4):** nenhuma task de frontend-engineer desta lista é
> aprovada sem passar no checklist de 12 itens da Seção 15.4 de
> `docs/Design-System.md`, verificado linha a linha pelo `ux-auditor`.
> Impacto Visual (Completo vs. Leve) é avaliado task a task pelo Maestro —
> sinalizado explicitamente nas tasks do Lote 5 e na Task 3.13 (front),
> abaixo.
>
> **Revisão de 2026-08-02 — Q-6, Q-13, Q-14 e Q-16 respondidas pelo
> operador.** `docs/Modelo-de-Dominio.md` Seções 7.2 (etapa de esteira), 7.3
> (cascade de exclusão de organização), 4.1.1 (textura real do
> `ModuleViewer`) e 5.4.1 (reabertura de orçamento congelado, invariante I6)
> documentam as quatro respostas; `docs/PRD.md` Seção 7.4 registra as duas
> perguntas novas que elas abriram — **Q-17** (quem pode excluir a
> organização) e **Q-18** (quem pode reabrir um orçamento) — nenhuma das duas
> decidida ainda. Consequência neste documento: o item **5.10** (esteira)
> deixa de ser placeholder e ganha tasks reais (Lote 5); a Task **4.15**
> (excluir conta) é reescrita com o escopo completo do cascade e passa a
> bloquear por **Q-17**, não mais por Q-13 (já respondida); entra a task nova
> **"Reabrir orçamento"** (1.9, Lote 1), bloqueada por **Q-18**; e a Task
> **3.13** (`ModuleViewer`) deixa de lançar só com cor sólida — ganha textura
> real e duas tasks de catálogo que a alimentam (3.13 catálogo-back/front).
>
> **Revisão de 2026-08-03 — Q-17 e Q-18 respondidas pelo operador, mesma
> resposta para as duas: só o papel `admin`/dono.** `docs/Modelo-de-Dominio.md`
> Seção 7.3, subseção "Quem pode disparar (Q-17)" (checagem `perfil.papel ===
> 'admin'` dentro da Server Action, erro `NAO_AUTORIZADO_EXCLUIR_ORG`/403) e
> Seção 5.4.1, invariante I6a (mesma checagem para reabrir, erro
> `NAO_AUTORIZADO_REABRIR`/403) documentam as duas respostas. Consequência
> neste documento: a Task **4.15** deixa de estar bloqueada e ganha a
> checagem de papel como parte do escopo (passo 0, antes de qualquer
> `delete`); as Tasks **1.9 (back)** e **1.9 (front)** deixam de estar
> bloqueadas — a primeira ganha a mesma checagem antes do caminho
> idempotente, a segunda passa a exibir o botão "Reabrir" só para `admin`.
> Nenhuma task deste documento permanece bloqueada por decisão pendente do
> operador.

#### Lote 0 — Fundação de dados

*Bloqueia Lote 1 e Lote 2. Nada aqui é visível na tela.* Achado do Data
Architect: os itens 0.1–0.3 são **gap de wiring da aplicação, não de
schema** — as tabelas `ambiente`/`parede` com RLS já existem
(`supabase/migrations/20260727090400_ambiente_parede.sql`), os tipos já
existem (`lib/engine/parede/types.ts`), mas `lib/ambiente/estado.ts`,
`lib/ambiente/salvar.ts` e `lib/ambiente/mapear.ts` estão presos a um
singleton "1 ambiente, 1 parede". A única mudança de **schema** real é a
adição de colunas cosméticas (`nome`, `ordem`, `alturas_override`) já
especificadas em `.maestro/tmp/schema-v2.1-delta.sql` Seções 1–2.

**Histórico de execução:**
- **Task 0.1–0.3** ✅ (2026-08-03) — Migration `20260801100000_ambiente_parede_ordem_nome_alturas.sql` + 7 Server Actions (`criarAmbiente`, `renomearAmbiente`, `reordenarAmbientes`, `excluirAmbiente`, `criarParede`, `atualizarParede`, `excluirParede`) + remoção cascata de itens órfãos. Aprovado code-auditor, security-auditor (2 tentativas), qa-engineer (2 tentativas). 306 testes ao final.
- **Task 0.5a** ✅ (2026-08-03) — Server Action `atualizarCliente` (nome, telefone, endereço). Aprovado code-auditor, security-auditor (2 tentativas), qa-engineer. Sem impacto visual.
- **Task 0.7a** ✅ (2026-08-03) — Congelamento real: migration `orcamento.congelado_em timestamptz null`, exposição de `congeladoEm` em `lib/orcamento/buscar.ts` (dois pontos em `OrcamentoDetalhe`), Server Action `congelarOrcamento(orcamentoId)`. Migration já aplicada em Supabase real. Aprovado code-auditor, security-auditor, qa-engineer (6/6 critérios). Sem impacto visual.
- **Task 0.4** ✅ (2026-08-03) — Alturas de faixa: `alturasEfetivas(parede, organizacao)` (perfil dá default, parede sobrescreve campo a campo), estado "herdado"/"customizado" derivado, `derivarY("inferior"|"torre")` corrigido para `alturaRodape` em vez de `0`. Corrige achado colateral: `lib/ambiente/salvar.ts` para nunca escrever `organizacao.alturas_padrao` em salvamento de parede/ambiente. Aprovado code-auditor, qa-engineer (2 tentativas), sem gate security (lógica pura). Sem impacto visual.
- **Task 0.7b** ✅ (2026-08-04) — Congelamento real — leitura e escrita de verdade: corrige o bug de leitura em `PropostaLab.tsx:77,141` (recalcula ao vivo em vez de checar o congelamento), encadeia `congeladoEm` como prop nova, corrige `handleGerarProposta` que nunca gravava `congeladoEm` (passa a chamar `congelarOrcamento` só depois que todas as linhas gravarem). Aprovado qa-engineer (337 testes). Sem impacto visual.
- **Task 0.5b** ✅ (2026-08-04) — Formulário de edição de dados do cliente na tela do orçamento. Aprovado code-auditor, security-auditor, qa-engineer (5/5 critérios, 332 testes), ux-auditor (12/12 itens checklist Design-System §15.4, Impacto Visual Leve; nota não bloqueante sobre ambiguidade visual hover/focus do botão). Sem impacto visual bloqueante.

*Nota: item 0.6 (nome livre de parede) está coberto pela migration da Task
0.1–0.3 (coluna `nome`, default `"Parede 1"`, `CHECK` de não-vazio — já no
delta SQL).*

**Lote 0 — 6/6 tasks concluídas** ✅ (2026-08-04)

#### Lote 1 — Confiança e estado

*Bloqueado até o Lote 0 fechar. Bloqueia o Lote 2.* Causa raiz única
(documento-fonte Seção 2.1): falta de invalidação de cache após mutação +
estado de aba fora da URL. **Exceção pontual** (mesmo padrão da exceção do
Lote 3 com a Task 4.16): a Task 1.9 (back) — nova, resposta à Q-16 — depende
também da Task 5.10 (back) (coluna `etapaEsteira`, Lote 5), porque a
reabertura mexe nos dois campos (`congeladoEm` e `etapaEsteira`) na mesma
transação (Modelo 5.4.1, I6).

| Task | O que é | Tag | Depende de | Executor | Modelo | Referências |
|---|---|---|---|---|---|---|
| 1.9 (back) | **Reabrir orçamento (Q-16, I6, I6a)** — Server Action `reabrirOrcamento`: **primeiro** verifica `perfil.papel === 'admin'` do usuário chamador (Q-18, invariante I6a) — se não for `admin` (ou sem sessão/`perfil` na org), rejeita com `NAO_AUTORIZADO_REABRIR`/403 antes até da checagem de idempotência, nada é escrito; só então: `congeladoEm ← null`; se `etapaEsteira === "fechado"`, move para `aguardando_aprovacao` (nas demais etapas não mexe na etapa — 7.2, T2); `valorRateado` de cada `linhaProposta` **não é alterado nem zerado** (fica dormente até um novo congelamento sobrescrever, I3); reabrir um orçamento já não-congelado (`congeladoEm` já `null`), chamado por um `admin`, é no-op idempotente, `ok: true`, sem mexer em etapa | 🔴 BLOQ | 0.7a, 0.7b, 5.10 (back) | backend-engineer | Sonnet | Modelo 5.4.1 (I6, I6a, casos de borda, exemplo trabalhado), 7.2 (T2); PRD RF-22, Q-16 (resolvida), Q-18 (resolvida) |
| 1.9 (front) | Botão "Reabrir" na tela do orçamento, visível e habilitado somente para o usuário com `perfil.papel === 'admin'` (Q-18, mesma UI especificada pelo `product-designer` em Design-System §7.13.1) quando `congeladoEm !== null`; para `vendedor`/`projetista` o botão não aparece (ou fica desabilitado, conforme o Design System); aviso explícito do efeito (descongela; os valores da proposta ficam recalculados ao vivo até novo "Gerar proposta"; nada do que já foi rateado é apagado) | 🔴 BLOQ | 1.9 (back) | frontend-engineer (web) | Sonnet | Modelo 5.4.1 (I6a); Design-System §7.13.1; PRD RF-22, Q-18 (resolvida) |

*Nota: item 1.4 do backlog-fonte (leitura do snapshot congelado, nunca
recalculado na renderização) não é mais task separada — é o mesmo defeito e
as mesmas linhas de código (`PropostaLab.tsx:77,141`) corrigidos pela Task
0.7b acima, no Lote 0. Sem entrega duplicada.*

**Histórico de execução:**
- **Task 1.1–1.3** ✅ (2026-08-04) — Invalidação de cache após mutação (salvar em qualquer aba propaga para as demais), aba persistida na URL (F5 mantém a aba), botão "atualizar render" funcional sem F5. `code-auditor` indisponível (2x sem veredito por estouro técnico) — revisão assumida pelo Maestro (lint/typecheck/test rodados pessoalmente, diff relido linha a linha). `qa-engineer` aprovou normalmente com veredito próprio (verificação comportamental real: aba sobrevive a F5, estado preservado entre abas via `forceMount`, cadeia `router.refresh()` confirmada). Sem gate security-auditor, sem impacto visual.
- **Task 1.8** ✅ (2026-08-04) — Corrigir link "calculadora" no editor: investigação conclui que `/` (Dashboard) é o destino mais adequado do link "← calculadora" em `/modulo`, superior ao candidato `/biblioteca`. Link já apontava para o destino correto — sem mudança de código necessária. Investigação factual verificada via leitura de código antes do merge. Texto "calculadora" resíduo de V1, escopo das Tasks 5.1–5.4 (Lote 5, renomeação). Sem impacto visual.
- **Task 1.5–1.6** ✅ (2026-08-05) — Teste automatizado de paridade financeiro ↔ proposta (soma das linhas == preço final) + resíduo de arredondamento absorvido pela última linha. Causa raiz encontrada: `FinanceiroTabConectada.tsx` faltava `router.refresh()` após `salvarConfiguracaoPrecificacao`, deixando `PropostaLab` com config obsoleta — mesma classe de bug da Task 1.1–1.3, ponto diferente. Arquivos: `components/orcamento/FinanceiroTabConectada.tsx`, `lib/engine/precificacao/precificacao.test.ts`. `code-auditor` indisponível (estouro técnico, 19 tool calls sem veredito) — revisão assumida pelo Maestro (lint/typecheck/test pessoalmente + diff relido linha a linha, 344 testes). `qa-engineer` aprovou com veredito próprio (5/5 critérios: teste de paridade financeiro-proposta e invariante de resíduo cobertos, causa raiz confirmada por leitura de código). Sem gate security-auditor, sem impacto visual.
- **Task 1.7** ✅ (2026-08-05) — Bug de chapas de 6 mm com baixo aproveitamento não contadas em "valor por chapa". Causa raiz real: `consolidarResultados` (`lib/engine/consolidar.ts`) derivava `GrupoMdf.chapas` via fórmula de área pura (`Math.ceil(area_com_perda_m2 / 5.06)`), desacoplada do bin-packing real (`planoDeCorte` em `lib/engine/box/cutting.ts`). Quando o bin-packing precisava de chapa extra com baixo aproveitamento, a fórmula podia arredondar para N menor, deixando aquela chapa fora do custo. Correção: `consolidarResultados` agora deriva `g.chapas` da contagem real do `planoDeCorte` — fonte única de verdade. `lib/insumos.ts::todasAsPecas` refatorado para reutilizar helper novo `pecaLinearParaPeca` (elimina ~20 linhas duplicadas). Arquivos: `lib/engine/consolidar.ts`, `lib/insumos.ts`, `lib/engine/consolidar.test.ts` (novo, 4 casos com cenário determinístico reproduzindo a divergência). Execução: 4 tentativas nesta sessão; Maestro investigou causa raiz na 3ª. `code-auditor` indisponível (estouro técnico, 12 tool calls sem veredito) — revisão assumida pelo Maestro (lint/typecheck/test pessoalmente + diff relido linha a linha, 348 testes). `qa-engineer` aprovou com veredito próprio (5/5 critérios + reprodução do bug: chapas=1 sem fix, chapas=2 com fix). Sem gate security-auditor (lógica pura), sem impacto visual.
- **Task 1.9-back** ✅ (2026-08-05) — Server Action `reabrirOrcamento` (`lib/orcamento/reabrir.ts`): checagem `perfil.papel === 'admin'` como primeira operação, antes de qualquer leitura/escrita em `orcamento` (invariante I6a, erro E-C3/`NAO_AUTORIZADO_REABRIR`); `congeladoEm ← null`, etapa `fechado → aguardando_aprovacao` só quando aplicável, `valorRateado` nunca tocado (I6); no-op idempotente se já descongelado; isolamento multi-tenant por `organizacao_id` resolvido do servidor. `code-auditor` APROVADO, `security-auditor` APROVADO (gate obrigatório nesta task por envolver autorização por papel), `qa-engineer` APROVADO (364/364 testes, 6 novos). Sem impacto visual (backend puro). **Fecha o Lote 1 (back) por completo.**
- **Task 1.9-front** ✅ (2026-08-06) — Botão "Reabrir orçamento" no Alert de congelamento (`components/orcamento/PropostaLab.tsx`): Alert variante aviso com texto W-C1 exato, botão visível/habilitado só para `perfil.papel === 'admin'` (nunca `disabled` para outros papéis), abre `Dialog` de confirmação (título/corpo/rodapé conforme Design-System §7.13.1), liga à Server Action `reabrirOrcamento` (Task 1.9-back). `papel` do usuário lido em `lib/perfil/papelAtual.ts` (novo), fluindo de `page.tsx` até `PropostaLab`. **2 rodadas de gate**: `ux-auditor` reprovou na 1ª tentativa por um bug de causa raiz sistêmica — `app/globals.css` tinha uma regra CSS legada `.grid` não-escopada colidindo com o utilitário Tailwind `grid` usado por todo `DialogContent` do projeto (quebrava o Dialog em 2 colunas no desktop); corrigido renomeando para `.legado-grid` e atualizando o único consumidor real (`app/modulo/EditorItemNucleo.tsx`) — corrigiu de graça o mesmo bug já visto no Dialog "Editar cliente" da Task 0.5b, sem precisar de task separada. `code-auditor` APROVADO, `qa-engineer` APROVADO (367/367 testes), `ux-auditor` APROVADO na 2ª tentativa (screenshot + `getComputedStyle` confirmando coluna única). Impacto Visual: Leve. **Fecha o Lote 1 por completo.**

#### Lote 2 — Lacunas funcionais

**Bloqueado até o Lote 0 e o Lote 1 fecharem** (regra do operador — cadeia
sequencial estrita: Lote 0 → Lote 1 → Lote 2, nunca Lote 2 em paralelo com o
Lote 1). Nenhuma task desta lista deve iniciar antes das Tasks do Lote 1
(1.1–1.8) estarem mescladas — o que por sua vez já pressupõe o Lote 0
(0.1–0.7b) fechado.

| Task | O que é | Tag | Depende de | Executor | Modelo | Referências |
|---|---|---|---|---|---|---|
| 2.1 | Ponto de entrada de "criar módulo do zero" a partir de `/biblioteca` e do menu lateral — investigação conclui que o caminho já existe e já funciona ponta a ponta (`/biblioteca` → botão "Novo módulo" → `/modulo` sem `?preset=` → salvar chama `criarGabarito` já existente → volta e aparece na listagem). Sidebar (`components/shell/Sidebar.tsx`) deliberadamente exclui `/modulo` do menu principal (Task 13.3b), sem mudança de código necessária | ✅ Completo | Lote 0, Lote 1 | frontend-engineer (web) | Sonnet | Modelo 7.1; PRD RF-24, D-31 |
| 2.1 (dedup) | Ocultar da listagem de `/biblioteca` o módulo global cuja origem (`origem_gabarito_id`) é um gabarito promovido da própria organização — sem isso o marceneiro vê o mesmo módulo duas vezes (versão da org + versão promovida global). Implementação: `deduplicarPromovidos()` em `lib/gabarito/listar.ts` — filtro derivado em memória que esconde gabaritosglobais cuja `origemGabaritoId` aponta para um gabarito da própria organização; 3 testes novos em `lib/gabarito/listar.test.ts`. `code-auditor` APROVADO, `qa-engineer` APROVADO (370 testes, 3 critérios de comportamento). Sem RLS nova. Merge `--no-ff` em `main` | ✅ Completo | Lote 0, Lote 1 | backend-engineer | Sonnet | Modelo-de-Dominio 7.1 regra 6; PRD RF-04 (emenda Fase D) |
| 2.3–2.6 | Cadastrar/editar/ordenar ambientes e paredes dentro do orçamento; seletor de parede que expande o painel daquela parede; indicação visual permanente de qual ambiente e qual parede estão em edição | 🟡 LACUNA / 🔵 UX | Lote 0 (0.1–0.3), Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.2, 11.5; PRD RF-19 |
| 2.3–2.6 (alturas) | UI de override de altura por parede: indicador visual "herdado" vs. "customizado" por parede (derivado, nunca um campo à parte); botão "voltar ao herdado" que apaga a chave de override (nunca copia o valor numérico); no formulário de `/perfil`, aviso de propagação ao salvar as alturas padrão da organização ("mudar o default afeta as paredes não customizadas") | ✅ Completo | 0.4, Lote 0, Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.2.1; PRD RF-20, D-27 |
| 2.7 | Motor: tipo de elemento de parede "pedra" + regra de bloqueio de conjunto por tipo (porta/janela quebram o bloco físico; pedra/tomada/ponto_hidráulico não quebram) + aviso `TAMPO_SOBRE_PEDRA` | 🟡 LACUNA | Lote 0, Lote 1 | motor-engineer | Sonnet | Modelo 3.2.2 (tabela de bloqueio, exemplo trabalhado) |
| 2.8–2.11 (back) | Backfill de `id`/`refX`/`refY`/`nome` nos elementos de parede já em produção (neutro: `refX="esquerda"`, `refY="chao"` reproduz a leitura atual) + funções de conversão canônico ↔ referência de medida | 🟡 LACUNA | Lote 0, Lote 1 | backend-engineer | Sonnet | Modelo 3.2.2; `schema-v2.1-delta.sql` §3 |
| 2.7–2.11 (front) | UI de elemento de parede: seletor do tipo "pedra", edição após adicionar (via linha da lista **e** via clique na representação 2D), referência de medida escolhível (X esquerda/direita, Y chão/teto) com **rótulos descritivos** ("Distância da parede esquerda", "Altura do chão" — nunca "X"/"Y") | 🟡 LACUNA / 🔵 UX | 2.7, 2.8–2.11 (back), Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.2.2 (tabela de rótulos, exemplos trabalhados); PRD RF-25 |
| 2.12 (back) | `ElementoParedePreset`: nova tabela (só `nome` obrigatório + largura/altura de prefill), **fora do catálogo de produtos**, sem preço/status/tipo — decisão do operador que rejeitou a recomendação do backlog-fonte (Q-5) | 🟡 LACUNA | Lote 0, Lote 1 | backend-engineer | Sonnet | Modelo 3.2.3; `schema-v2.1-delta.sql` §5; PRD D-29 |
| 2.12 (front) | UI de criar/listar/aplicar preset de elemento de parede (aplicar copia nome+dimensão, sem vínculo vivo) | 🟡 LACUNA | 2.12 (back), Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.2.3; PRD RF-25 |
| 2.13 | Rename "Preset" → "Módulo" em toda a interface (identificador de domínio continua `preset`/o que for — é rótulo, não tipo) | 🔵 UX | Lote 0, Lote 1 | frontend-engineer (web) | Haiku | Design-System 15.3; PRD 10.4 item 1 |
| 2.14–2.17 | Seleção em cascata ambiente → faixa → módulo (campo de módulo só libera depois da faixa); faixas renomeadas na UI (inferior · **meio** · aéreo · torre — identificador `bancada` não muda); torre ocupa as três faixas; módulo inferior assenta automaticamente sobre o rodapé | ✅ Completo | 0.4, Lote 0, Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.1 (nota), 3.2.1 (tabela de Y), A-09; PRD RF-26 |
| 2.18 (motor) | Posicionamento por vão até o vizinho: conversão vão → X absoluto na entrada, X → vão nos dois lados na exibição; apagar um módulo do meio não move ninguém; torre é vizinha das três faixas (A-09) | ✅ Completo | Lote 0, Lote 1 | motor-engineer | Sonnet | Modelo 3.1.1 (fórmulas e 4 exemplos trabalhados); PRD RF-21, D-28 |
| 2.18 (front) | UI de inserção com campo de **vão** (não afastamento da parede), reconversão exibida dos dois lados | ✅ Completo | 2.18 (motor), Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.1.1; PRD RF-21 |
| 2.19–2.23 | Editar módulo no momento da inserção, na mesma tela: largura/altura/profundidade, cor e espessura da caixa, cor e espessura das portas, fundo sim/não, tipo de puxador | 🟡 LACUNA | Lote 0, Lote 1 | frontend-engineer (web) | Sonnet | PRD RF-05, RF-26 |
| 2.27 | Cotas à direita na elevação: altura total da parede + altura de cada faixa | 🟡 LACUNA | 2.24–2.26, Lote 1 | frontend-engineer (web) | Sonnet | Modelo 11.5; PRD RF-27 |
| 2.28–2.30 | Agrupamento comercial cross-faixa/parede (`LinhaProposta`) com afordância visual distinta do bloco físico (`Conjunto`) na mesma elevação; botão de tag de conjunto disponível também nos módulos superiores; garantir que os dois **nunca colapsem no mesmo botão** (2.30 é critério de aceite desta task, não task separada) | 🟡 LACUNA / 🔴 BLOQ (2.30) | 2.24–2.26, Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.3, 6; PRD RF-37, Q-3 |
| 2.31 | Cancelar/reverter divisão de linha de proposta — item volta para a linha mãe | ✅ Completo | Lote 0, Lote 1 | frontend-engineer (web) | Sonnet | PRD RF-16 |
| 2.32 | Subdividir dentro do ambiente mantendo o vínculo (quarto → cabeceira, penteadeira, gaveteiro, guarda-roupa, todos sob "Quarto") | ✅ Completo | Lote 0, Lote 1 | frontend-engineer (web) | Sonnet | PRD RF-16 |

*Nota: item 2.2 (manter filtro por ambiente na listagem da biblioteca) já
está bom hoje — sem task.*

**Histórico de execução:**
- **Task 2.1** ✅ (2026-08-06) — Investigação: caminho de "criar módulo do zero" já existe e funciona ponta a ponta. Sidebar deliberadamente exclui `/modulo` do menu (Task 13.3b). Sem mudança de código necessária. Nenhuma branch de merge.
- **Task 2.1 (dedup)** ✅ (2026-08-06) — `deduplicarPromovidos()` em `lib/gabarito/listar.ts`: filtro derivado em memória escondendo gabaritosglobais promovidos da própria organização. 3 testes novos em `lib/gabarito/listar.test.ts`. `code-auditor` APROVADO (veredito em arquivo, build/lint/typecheck limpos), `qa-engineer` APROVADO (veredito em arquivo, 370/370 testes, 3 critérios). Sem RLS nova. Merge `--no-ff` em `main`.
- **Task 2.13** ✅ (2026-08-06) — Rename "Preset" → "Módulo" em toda a UI (`app/modulo/page.tsx`, `components/ambientes/AmbientesLab.tsx`). Identificadores de código (`presetId`, `presetEditando`, `?preset=`) mantidos intactos. `code-auditor` APROVADO, `qa-engineer` APROVADO. Impacto Visual: Nenhum (troca de string, sem estrutura). Sem `ux-auditor`.
- **Task 2.8–2.11 (back)** ✅ (2026-08-06) — Backfill de `id`/`refX`/`refY`/`nome` em `ElementoParede` via migração de leitura (`lib/engine/parede/migrate.ts::migrarElementoParede`), aplicada em `lib/ambiente/mapear.ts::paredeDeLinha`. Funções de conversão canônico↔referência de medida em `lib/engine/parede/referenciaMedida.ts`. Sem migration SQL — é filtro de leitura sobre `jsonb` já existente. `code-auditor` APROVADO, `qa-engineer` APROVADO (26 testes do domínio + suíte completa sem regressão). Sem `security-auditor`.
- **Task 2.7** ✅ (2026-08-06) — Motor: tipo `"pedra"` em `ElementoParede.tipo`, bug fix em `existeElementoBloqueante` (`lib/engine/conjunto/detectar.ts`) — só `porta`/`janela` quebram bloco; aviso `TAMPO_SOBRE_PEDRA` em `lib/engine/parede/validar.ts`. `code-auditor` APROVADO, `qa-engineer` APROVADO. Conflito de merge textual com Task 2.8–2.11 (back) resolvido pelo motor-engineer (ambas tocaram `lib/engine/parede/types.ts` e `components/ambientes/AmbientesLab.tsx`). Sem `security-auditor`/`ux-auditor`.
- **Task 2.12 (back)** ✅ (2026-08-06) — Nova tabela `elemento_parede_preset` (migration `supabase/migrations/20260806100000_elemento_parede_preset.sql`), RLS com 4 policies escopadas por organização. Domínio `lib/elemento-parede-preset/` (listar/criar/excluir). `code-auditor` APROVADO, `security-auditor` APROVADO (RLS revisada estaticamente), `qa-engineer` APROVADO. **Migration NÃO aplicada no Supabase real** — mesmo bloqueio de permissão de conta CLI já documentado; pendente do operador via MCP/Dashboard.
- **Task 2.7-2.11 (front)** ✅ (2026-08-06) — UI de elemento de parede: seletor tipo "Pedra" + edição inline convergente (lápis na tabela e clique 2D em `ElevacaoParede` setando o mesmo `elementoEditandoIndice`) + seletores de referência de medida `refX`/`refY` com rótulos exatos ("Distância da parede esquerda/direita", "Altura do chão"/"Distância do teto"). Conversão via `valorParaCanonico`/`canonicoParaValor` (Task 2.8-2.11 back). Arquivos: `components/ambientes/AmbientesLab.tsx`, `components/ambientes/ElevacaoParede.tsx` (+prop `onClicarElemento`, acessibilidade de teclado no SVG). `code-auditor` APROVADO, `qa-engineer` APROVADO. **`ux-auditor` não executado (autorizado pelo operador em 2026-08-06)** — rodou auditoria completa 2 vezes com 18 screenshots, verificação visual dos critérios confirma edição via lápis e clique 2D convergindo no mesmo estado, mas arquivo de veredito não gravado por bug de transporte known (`anthropics/claude-code#58109`); 2ª convocação sem arquivo = gate indisponível não reprovação. Achado incidental fora escopo: card "Validação (Tier 1 + Tier 2)" aparece num screenshot — violação Design-System §15.3, corrigida em Task 5.5–5.6 (Lote 5, futura), não regressão.
- **Task 2.12 (front)** ✅ (2026-08-06) — UI de criar/listar/aplicar preset de elemento de parede: `listarElementoParedePresets()` (Task 2.12 back) chamado em Server Component (`app/(app)/orcamento/[id]/page.tsx`), threading via `AmbientesTabConectada` → `AmbientesLab` como prop `presetsElementoParede` (default `[]`, compatibilidade com `AmbientesLabStandalone`/mock). Bloco "Aplicar preset" (Select) copia nome/largura/altura sem vínculo vivo; "Salvar como preset"/excluir atualizam lista local em memória. **Retrofit incorporado**: campo "Nome (opcional)" adicionado ao formulário-base de elementos de parede (gap descoberto na 1ª tentativa desta task — tipo `ElementoParede.nome?` existia mas faltava input/formulário; corrigido via emenda de escopo no contrato próprio). `code-auditor` APROVADO, `qa-engineer` APROVADO, `ux-auditor` APROVADO (screenshot real, checklist §15.4 completo sem achados, Impacto Visual Leve).
- **Task 2.18 (motor)** ✅ (2026-08-06) — Posicionamento por vão até o vizinho: funções puras `calcularVizinhos`, `converterVaoParaX`, `converterXParaVao` em `lib/engine/parede/posicionamento.ts` (novo) + `lib/engine/parede/posicionamento.test.ts` (novo, 13 testes) + campo opcional `refEntrada` adicionado a `ItemPosicionado` em `lib/engine/parede/types.ts`. Todos os 4 exemplos trabalhados da Seção 3.1.1 do Modelo-de-Dominio.md reproduzidos com valores exatos (inserção sequencial, deleção do módulo do meio sem mover ninguém, entrada pela direita, validações VAO_NEGATIVO/FORA_DA_PAREDE). Torre tratada como vizinha cross-faixa das três faixas (inferior/bancada/aéreo). `code-auditor` APROVADO, `qa-engineer` APROVADO. Sem gate de segurança/visual (motor puro). Desbloqueia Task 2.18 (front).
- **Task 2.3–2.6** ✅ (2026-08-07) — Cadastro/edição/ordenação de múltiplos ambientes e paredes dentro do orçamento: componente compartilhado `SeletorLista` novo, tela `AmbientesLab` bastante alterada, Server Actions completas em `lib/ambiente/acoes.ts` (criar/renomear/reordenar/excluir ambiente e parede), dispatcher `lib/ambiente/mutar.ts` (novo), funções puras `lib/ambiente/validar.ts` (novo), remoção cascata de itens órfãos. Seletor com indicação visual permanente de qual ambiente/parede está em edição (não depende de hover). `code-auditor` APROVADO (1ª tentativa, 425/425 testes, build/lint/typecheck limpos), `security-auditor` APROVADO (2ª tentativa — 1ª tentativa achou cross-tenant em `salvarEstadoAmbiente`, corrigido em `lib/ambiente/salvar.ts` com checagem de posse por `organizacao_id` antes de qualquer escrita + teste de regressão; 2ª reconvocação varreu restante do diff), `qa-engineer` APROVADO (1ª tentativa, 426/426 testes, 8 critérios de aceite cobertos), `ux-auditor` NÃO EXECUTADO (autorizado pelo operador em 2026-08-07 — 1ª tentativa reprovou por bug CSS legado em `app/globals.css` (colisão `.grid` legada com utilitário Tailwind), corrigido em `components/ambientes/SeletorLista.tsx` commit `cb1fed4`; 3 reconvocações posteriores rodaram auditoria completa com 18 screenshots de verificação real mas arquivo de veredito não gravou por bug de transporte known; operador revisou screenshots pessoalmente e aprovou visualmente). Impacto Visual: Completo.
- **Task 2.3–2.6 (alturas)** ✅ (2026-08-07) — UI de override de altura por parede em `AmbientesLab.tsx`: indicador "herdado"/"customizado" derivado (`parede.alturasOverride?.[campo] !== undefined`, sem campo separado), botão "Voltar ao herdado" que remove chave de override (sem copiar valor numérico), aviso de propagação em `/perfil` ao salvar padrões de altura. Persistência em `lib/ambiente/mapear.ts`. Lógica extraída como funções puras exportadas e testadas (`definirAlturaOverride`, `removerAlturaOverride`). `code-auditor` APROVADO (2ª tentativa após refactor das funções), `qa-engineer` APROVADO (2ª tentativa, 445/445 testes), `ux-auditor` APROVADO (1ª tentativa, checklist §15.4 completo, Impacto Visual Leve). Impacto Visual: Leve.
- **Task 2.18 (front)** ✅ (2026-08-08) — UI de inserção com campo de vão em `components/ambientes/AmbientesLab.tsx`: campo "X (mm)" substituído por "Vão (mm)", Select "Referência" com rótulos descritivos (esquerda/direita), conversão vão↔X via `converterVaoParaX`/`converterXParaVao` (motor já aprovado, não alterado). Tabela "Itens posicionados" com colunas "Vão esq."/"Vão dir." recalculadas via `converterXParaVao` a cada render em vez de "X" congelado. `code-auditor` APROVADO (1ª tentativa), `qa-engineer` APROVADO (1ª tentativa, 445/445 testes), `ux-auditor` APROVADO (1ª tentativa, checklist §15.4 completo, Impacto Visual Leve, 2 observações não bloqueantes: truncamento pré-existente do Select longo e mensagem de erro do motor sem ação corretiva explícita — ambas para product-designer avaliar em task futura). Impacto Visual: Leve.
- **Task 2.19–2.23** ✅ (2026-08-08) — Bloco "Personalizar módulo" no formulário de inserção em `components/ambientes/AmbientesLab.tsx`: 9 campos editáveis (largura/altura/profundidade, cor+espessura da caixa, cor+espessura das portas —ocultos para módulo sem `GrupoPortas`—, fundo sim/não, puxador), repopulados via `useEffect` a cada seleção de módulo (fallback de portas: `overridePortas ?? portas[0].material ?? caixa`). `adicionarItem()` usa largura editada no cálculo de vão/posicionamento. Spread não-mutativo de `BoxModule` sobre `preset.box` — preset da biblioteca nunca alterado. Motor não tocado (já suportava `overridePortas`). `code-auditor` APROVADO (1ª tentativa), `qa-engineer` APROVADO (1ª tentativa, 445/445 testes, não-mutação verificada por leitura de diff), `ux-auditor` APROVADO (1ª tentativa, checklist §15.4 completo, Impacto Visual Leve, confirmado com módulo com/sem porta). Impacto Visual: Leve.
- **Task 2.14–2.17** ✅ (2026-08-08) — Seleção em cascata ambiente → faixa → módulo: dos 4 itens do documento-fonte, 2 já estavam implementados (2.16 "torre ocupa as três faixas" — Task 2.18-motor via `faixasCandidatas`; 2.17 "módulo inferior assenta sobre rodapé" — Task 0.4 via `derivarY`/invariante A-08), confirmados por teste existente sem reimplementação. Itens novos: 2.14 (cascata real — campo Módulo desabilitado até Faixa escolhida, reset de seleção de módulo ao trocar de faixa) em `AmbientesLab.tsx`, 2.15 (rótulo "Bancada" → "Meio" em `AmbientesLab.tsx` e `ElevacaoParede.tsx`, identificador `bancada` intocado). `code-auditor` APROVADO (1ª tentativa), `qa-engineer` APROVADO (1ª tentativa, 445/445 testes), `ux-auditor` APROVADO (1ª tentativa, checklist Design-System §15.4, Impacto Visual Leve, verificação real de DOM/interação — disabled/enabled, reset de cascata, guard-clause, rótulo "Meio" nos 3 pontos de uso). Achado incidental registrado: mensagem de validação Tier 1/2 ainda cita `"bancada"` — candidato a task futura de rename. Impacto Visual: Leve.
- **Task 2.31** ✅ (2026-08-08) — Botão "Cancelar divisão" em `LinhaPropostaCard.tsx` (visível só na linha nascida de "Dividir linha"), reverte divisão devolvendo itens para a linha mãe. Rastro de origem efêmero (estado React `origemSplit` em `PropostaLab.tsx`, sem coluna new schema). Trata caso de linha mãe já excluída/mesclada sem quebrar a tela. Reutiliza `onAtualizarLinha`/`onExcluirLinha` já existentes. `code-auditor` APROVADO (1ª tentativa), `qa-engineer` APROVADO (1ª tentativa, 445/445 testes), `ux-auditor` APROVADO (1ª tentativa, fluxo completo automatizado: dividir → botão visível → cancelar → valor mãe idêntico). Impacto Visual: Leve.
- **Task 2.32** ✅ (2026-08-08) — Função pura `ambientesDaLinha` em `lib/linha-proposta/ambientes.ts` (novo, 4 testes) deriva nomes dos ambientes cujas paredes contêm os itens de uma Linha de Proposta, a partir de `estadoInicial.ambientes` + `linha.itens` — sem schema novo, sem Server Action, sem rastreio persistido. Caption "Ambiente: {nome(s)}" exibida em `LinhaPropostaCard.tsx`, recalculada do estado atual em cada render — o vínculo nunca se perdeu nos dados (item→parede→ambiente), só nunca tinha sido exibido; por isso sobrevive a dividir/mesclar/renomear sem trabalho extra. `code-auditor` APROVADO (1ª tentativa), `qa-engineer` APROVADO (1ª tentativa, 449/449 testes), `ux-auditor` APROVADO (1ª tentativa, fluxo real de dividir e mesclar com Playwright validado; caso de mesclagem cross-ambiente coberto por teste unitário, harness mock com 1 ambiente). Achado incidental registrado (não corrigido, decisão de produto pendente): `lib/linha-proposta/carregar.ts` cria linha de proposta default cobrindo TODOS os ambientes, titulada com nome do primeiro — simplificação pré-V2.1 nunca atualizada para N ambientes. Impacto Visual: Leve.
- **Task 2.24–2.26** ✅ (2026-08-08) — Elevação da parede passa a desenhar os módulos posicionados: dos 3 itens do documento-fonte, item 2.25 (rótulo "Meio") já estava pronto desde Task 2.14–2.17 — confirmado, não retrabalhado. Itens novos: 2.24 (função pura `retangulosDosItens` em `ElevacaoParede.tsx` deriva geometria de módulos posicionados via `derivarY`/`larguraDoItem`/`alturaDoItem` já existentes, reaproveita `itensDoConjunto` calculado em `AmbientesLab.tsx`, `lib/engine/parede/*` e `lib/orcamento.ts` intocados) e 2.26 (torre desenhada com retângulo real, primeiro na ordem SVG para trás com estilo tracejado/discreto, módulos das demais faixas desenhados após e ficam legíveis por cima em sobreposição, elementos de parede continuam no topo sem mudança de ordem). Arquivos: `components/ambientes/ElevacaoParede.tsx` (+função `retangulosDosItens`, mantém estrutura `<g>` original). `code-auditor` APROVADO (1ª tentativa), `qa-engineer` APROVADO (1ª tentativa, 452/452 testes), `ux-auditor` APROVADO (1ª tentativa real de veredito válido — 1ª chamada rodou auditoria completa com 18 screenshots mas arquivo de veredito não gravou por bug de transporte known; reconvocada sem contar como tentativa reprovada; checklist Design-System §15.4 completo com desktop/tablet/mobile, módulos, torres e sobreposição verificados). Impacto Visual: Completo.

**Lote 2 — 17/17 tasks concluídas ✅ (fechado)** (2026-08-08)

#### Lote 3 — Precisão do motor

*Independente e paralelo ao Lote 0 e aos demais lotes — **como regra geral**.
Exceção pontual (agora resolvida): a Task 3.1/3.3 (motor) dependia da Task 4.16
(back) (coluna `espessura_serra_padrao_mm` no perfil), que foi mesclada em 2026-08-11. A dependência já
estava declarada na linha das duas tasks, nos dois sentidos — **a Task 3.1/3.3
está agora desbloqueada e pode começar a qualquer momento**.*

| Task | O que é | Tag | Depende de | Executor | Modelo | Referências |
|---|---|---|---|---|---|---|
| 3.1/3.3 (motor) | **Bin-packing melhorado**: guilhotina com lista de retângulos livres (o espaço livre deixa de ser descartado quando a "prateleira" corrente fecha) + meta-heurística de busca por permutação (*simulated annealing* ou algoritmo genético — escolha do motor-engineer), avaliando as duas orientações de cada peça sempre que `!temVeio`. Respeita **kerf** (`espessuraSerraPadraoMm` do perfil, Task 4.16) e a restrição de veio existente **sem alterá-la** (rotação só quando `!temVeio`). 100% TypeScript, síncrono, roda em função pura (a integração em Web Worker é a Task 3.1/3.3 (front)). Invariantes obrigatórias, cada uma virando teste: **V1** conservação de peças · **V2** geometria + kerf entre peças adjacentes · **V3** veio respeitado · **V4** aproveitamento coerente (tolerância 1e-6) · **V5** guilhotina sempre válida · **V6** monotonicidade (nunca pior que o algoritmo determinístico com os mesmos parâmetros) · **V7** determinismo (PRNG semeado, `maxIteracoes` fixo — **nunca** limite de relógio). Fecha ao mesmo tempo o item **3.1** (bug relatado pelo marceneiro: sarrafo de 7×150cm ignorado numa faixa livre de 30×270cm) e o item **3.3** (avaliação de troca de algoritmo) do backlog-fonte — mesma entrega, sem duplicar; o item **6.3** do documento-fonte fica **sem objeto** (era condicional a "se 3.1 não resolver": 3.1 e 3.3 resolvem juntos, aqui) | ✅ Completo | nenhuma | motor-engineer | Sonnet | Modelo 8.1–8.6 (invariantes V1–V7, exemplos trabalhados dos itens 3.1 e do critério de comparação); PRD RF-34, risco 6/12 |
| 3.1/3.3 (front) | Integração do bin-packing melhorado (Task 3.1/3.3 (motor)) num **Web Worker do navegador**: estado de UI `calculando → pronto`, sem travar a tela — a passada determinística de hoje (ms) aparece de imediato como estimativa, o resultado da busca (1–2s) substitui quando chega. **Nunca existe estado "sem plano de corte"**. Se o Web Worker não estiver disponível (navegador antigo, falha de carregamento), a mesma função roda no main thread com resultado idêntico, só mais lento | ✅ Completo | ✅ Desbloqueada (Task 3.1/3.3 motor mesclada) | frontend-engineer (web) | Sonnet | Modelo 8.3 (tabela "Web Worker — o que muda"); PRD RF-34 |
| 3.2 | Exibir o veio da placa na visualização do plano de corte (MDF Loro Freijó não mostra) — confirmar que o dado (`temVeio`) está correto antes de assumir que é só rendering | 🟡 LACUNA | nenhuma | frontend-engineer (web) | Sonnet | Modelo 8; PRD RF-11 |
| 3.4 | Contagem de cortes / passadas de serra no resultado do plano de corte | 🟡 LACUNA | nenhuma | motor-engineer | Sonnet | PRD RF-29 |
| 3.5 (motor) | Fita de borda discriminada por cor no resultado do plano de corte (hoje mostra "29m" sem dizer de qual) | 🔴 BLOQ | nenhuma | motor-engineer | Sonnet | Modelo 11.5; PRD RF-29 |
| 3.5 (front) | Exibir fita discriminada por cor na lista de material / plano de corte | 🔴 BLOQ | 3.5 (motor) | frontend-engineer (web) | Sonnet | PRD RF-29 |
| 3.6 | Cálculo de rolos de fita a comprar, a partir do tamanho de rolo cadastrado no catálogo (campo `produto.especificacao`, nunca hardcoded) | 🟡 LACUNA | 3.5 (motor) | motor-engineer | Sonnet | Modelo 11.4 (A-12), 11.5; PRD RF-29, 10.4 |
| 3.7 | Quantidade sem m² na lista de material — número inteiro simples | 🔵 UX | nenhuma | motor-engineer | Sonnet | PRD RF-15 |
| 3.8 (back) | Persistência de override de quantidade por item da lista de material (pré-congelamento; valor, categoria e descrição permanecem travados) | 🟡 LACUNA | nenhuma | backend-engineer | Sonnet | PRD RF-15 |
| 3.8 (front) | UI de edição de quantidade na lista de material | 🟡 LACUNA | 3.8 (back) | frontend-engineer (web) | Sonnet | PRD RF-15 |
| 3.10–3.11 (motor) | Tampo: modelo escolhido **antes** da espessura; espessuras condicionadas ao modelo (simples 15/18/25 · engrossado/dobrado 30/45/60 base 15 · 36/54 base 18); 6 mm nunca; trocar modelo com espessura incompatível **limpa** o campo | 🟠 BUG | nenhuma | motor-engineer | Sonnet | Modelo 3.4.1 (tabela + 3 exemplos de rejeição) |
| 3.10–3.11 (front) | UI do tampo: seletor de modelo antes de espessura, lista de espessuras filtrada pelo modelo, campo limpo ao trocar modelo incompatível | 🟠 BUG | 3.10–3.11 (motor) | frontend-engineer (web) | Sonnet | Modelo 3.4.1; PRD RF-28 |
| 3.12 | BOM completo dos três modelos de tampo (simples fechado nesta rodada; engrossado/dobrado já existiam) + fita de 35mm cobrindo também 25mm | 🟡 LACUNA | 3.10–3.11 (motor) | motor-engineer | Sonnet | Modelo 3.4.1 (BOM do simples com exemplo trabalhado), 2.1 |
| 3.13 (front) | **`ModuleViewer`** — visualização 3D estática do módulo em edição. Componente novo, pasta própria de componentes. Stack `@react-three/fiber` + `@react-three/drei` + `three`, importado via `next/dynamic({ ssr: false })` com skeleton de loading (mesmo padrão de canvas técnico da Design-System §8: `bg-cinza-50 border-cinza-200`, ícone `Box` do `lucide-react` centralizado em `text-cinza-300`). Câmera **ortográfica**, prop `view: 'isometric' \| 'front' \| 'top' \| 'side'` (default `isometric` ao abrir o modo), **sem `OrbitControls`, sem rotação livre do usuário** — cena estática, troca de ângulo instantânea, sem animação. Props: `width`, `height`, `depth` (mm), `view`, `color?` (hex), `textureUrl?` (WebP). Material: com `textureUrl`, `useTexture` do drei + `texture.colorSpace = THREE.SRGBColorSpace`; sem `textureUrl`, usa `color` — derivado de `BoxModule.material.cor` via `corParaHex()` já existente, único fallback (Modelo 4.1.1 regra 1). **Lança com textura real** (Q-14 respondida em 2026-08-02 — Modelo 4.1.1): `textureUrl` já tem origem no domínio (`especificacao.texturaUrl` do `Produto` tipo `chapa`, alimentado pelas Tasks 3.13 (catálogo-back)/(catálogo-front) abaixo); sem uma textura selecionada no catálogo para aquele produto, cai no fallback de cor sólida via `corParaHex()` já existente — o mesmo caminho único de sempre, nunca um terceiro. Iluminação: `ambientLight` + 1 `directionalLight`. Geometria vem da **mesma fonte** que `BoxCanvas` já consome (`BoxModule.largura`/`.altura`/`.profundidade`), `color` derivado de `BoxModule.material.cor` via `corParaHex()` já existente — proibido segundo caminho de derivação de geometria. Posicionado como segundo modo ("3D estático") do painel de visualização do Editor de Item, ao lado de "2D técnico" (default), reaproveitando o `Tabs` underline da Design-System §7.8; controles de ângulo próprios e distintos dos botões Frontal/Traseira/Esquerda/Direita/Explodida do modo 2D | 🟡 LACUNA (RF-38) | nenhuma | frontend-engineer (web) | Sonnet | Modelo 4.1, 4.1.1, 11.5 (props e origem de dado); Design-System §9.6 (posicionamento na tela, loading, controles); PRD RF-38, D-33, Q-14 (resolvida) |
| 3.13 (catálogo-back) | Bucket de Storage `texturas` (read-only para `authenticated`; escrita restrita ao operador/`service_role` — mesma natureza de bucket curado, único e compartilhado por todas as orgs, Modelo 4.1.1 regra 3) + campo `texturaUrl?: string` em `EspecificacaoChapa` (`lib/produto/tipos.ts`) + validação de escrita na Server Action de salvar produto: só aceita caminho relativo dentro do bucket, rejeita URL externa (evita hotlink de domínio de terceiro dentro do canvas do usuário) | 🟡 LACUNA (RF-38) | nenhuma | backend-engineer | Sonnet | Modelo 4.1.1 (regras 1–3); PRD RF-38, Q-14 (resolvida) |
| 3.13 (catálogo-front) | Seletor de textura no formulário de cadastro/edição de produto tipo chapa: lista as texturas disponíveis no bucket (miniatura + nome), grava o caminho relativo escolhido em `texturaUrl`. É **seleção entre imagens já existentes, não upload livre pelo marceneiro** — o bucket é read-only para `authenticated` (Modelo 4.1.1 regra 3); reaproveita o padrão visual de modal/preview já usado no upload de logo (Task 4.8–4.9), mas a ação do usuário aqui é escolher, não enviar arquivo. Sem textura selecionada, o produto se comporta exatamente como hoje (cor sólida) | 🟡 LACUNA (RF-38) | 3.13 (catálogo-back) | frontend-engineer (web) | Sonnet | Modelo 4.1.1; PRD RF-38 |

**Histórico de execução:**
- **Task 3.1/3.3 (motor)** ✅ (2026-08-11) — Bin-packing melhorado (guilhotina com lista de retângulos livres + simulated annealing com PRNG semeado, `MAX_ITERACOES=5000` fixo). Algoritmo novo reescrito em `lib/engine/box/cutting.ts` (função `empacotarChapas`/`planoDeCorte`). Kerf modelado como parâmetro opcional em `GrupoChapas.meta?`, default `0` — call sites existentes (`consolidar.ts`, `EditorItemNucleo.tsx`, `CorteMaterialLab.tsx`) compilam sem alteração sem receber o valor real do kerf (será integrado em Task 3.1/3.3 front com wiring via Web Worker). Tipos `guilhotinavel()` (invariante Modelo 8.1 §8.1) e `MetaBuscaCorte` (§8.4) exportados. Todas as 7 invariantes V1–V7 (§8.5) com teste dedicado provado (não coincidência de dado); 3 exemplos numéricos das Seções 8.2/8.3 reproduzidos com valores exatos e verificados manualmente. Dimensões ajustadas em `consolidar.test.ts` (1400×950mm → 1850×1000mm) com justificativa geométrica (novo algoritmo empacota melhor). Sem RLS/segredo (motor puro). `code-auditor` APROVADO (1ª tentativa real — 1ª chamada não gravou veredito por bug de transporte conhecido, reconvocada sem contar), `qa-engineer` APROVADO (1ª, 466 testes, verificação aritmética manual de cada exemplo, 3 execuções confirmando ausência de flakiness). Desbloqueia Task 3.1/3.3 (front).
- **Task 3.1/3.3 (front)** ✅ (2026-08-11) — Web Worker para `planoDeCorte` (`lib/engine/box/cutting.worker.ts`, hook `usePlanoDeCorte` em `lib/engine/box/usarPlanoDeCorte.ts`) com estado de UI `calculando → pronto`: estimativa determinística síncrona (`planoDeCorteEstimativa`, função nova aditiva em `lib/engine/box/cutting.ts`, reusa helpers do algoritmo já aprovado) aparece imediatamente, resultado da busca completa do Worker substitui quando chega — nunca existe estado "sem plano de corte". Fallback para main thread se Worker indisponível ou falhar (mesma função, resultado idêntico). Kerf real (`organizacao.espessuraSerraPadraoMm`, Task 4.16-back) passado para `planoDeCorte` nos dois pontos de consumo: `CorteMaterialLab` (aba Corte & Material de `/orcamento/[id]`) via Server Component (`carregarPerfilOrganizacao`) → `CorteMaterialTabConectada`; `EditorItemNucleo` (`/modulo`, client-side puro) via nova leitura `lib/organizacao/buscarKerf.ts` (mesmo padrão de `buscarCatalogoReal`), fallback `3`. Indicador visual "Otimizando plano de corte…" com pontinho pulsante ao lado do título, nas duas telas. `code-auditor` APROVADO (3ª convocação real — 2 primeiras não gravaram por bug de transporte), `qa-engineer` APROVADO (2ª tentativa — 1ª reprovou por falta de teste automatizado para `calcularPlanoDeCorteAssincrono`, corrigido com `lib/engine/box/usarPlanoDeCorte.test.ts`, 6 testes novos, provado falham sem fallback). Suíte com 472 testes ao final. **`ux-auditor` APROVADO (1ª tentativa real, screenshots confirmando estimativa síncrona sempre visível, sem flash de layout na substituição pelo resultado do Worker, tokens do Design System conformes)** — 2 observações não bloqueantes: (1) Critério do contrato sobre "canvas vazio em loading" (Design-System Seção 8) não se aplica a este fluxo — a estimativa síncrona já preenche o canvas desde o primeiro render, logo o loading é sinalizado por badge textual, não placeholder (architecturalmente melhor que o padrão); (2) `EditorItemNucleo.tsx` mistura pré-existente de classes CSS legadas com tokens Tailwind (Seção 2.19–2.23), fora do escopo desta task (Leve, ajuste isolado), candidato a achado incidental em seção própria. Impacto Visual: Leve.

*Pré-requisito de conteúdo, não de código (Modelo 4.1.1, nota final; mesma
natureza do achado já registrado em `docs/STATUS.md` Seção 5 sobre os ~380
padrões de MDF): as ~380 imagens WebP de textura precisam ser fornecidas,
curadas e enviadas ao bucket pelo operador. Nenhuma das duas tasks de
catálogo acima gera essas imagens — sem elas, o campo e o seletor existem e
ficam vazios, e o produto se comporta exatamente como o cenário "cor
sólida". Isso não bloqueia o fechamento de nenhuma das três tasks (3.13
front/catálogo-back/catálogo-front).*

*Nota de roteamento — por que Lote 3 e não Lote 2: o `ModuleViewer` opera sobre
o `BoxModule` do Editor de Item, a mesma geometria que o motor/canvas 2D já
consome — não depende em nada da refatoração Ambiente/Parede N×N do Lote 0.
Colocar em Lote 2 o prenderia atrás do fechamento do Lote 0 sem necessidade
real; em Lote 3 (paralelo, independente) pode começar a qualquer momento,
como o restante da precisão de motor/geometria a que é adjacente. Modelo
recomendado Sonnet, não Haiku: é biblioteca nova (three.js) com risco real de
regressão de performance/bundle, não ajuste mecânico de texto ou token.*

*Impacto Visual (gate do `ux-auditor`, Design-System §15.4): Task 3.13
(front) = **Completo** — componente novo que introduz uma stack de renderização
inédita no produto e mexe numa tela já existente (Editor de Item). Task 3.13
(catálogo-front) = **Leve** — seletor novo dentro de um formulário já
existente do catálogo, não introduz tela nova.*

*Nota: item 3.9 (manter item manual/personalizado) já está confirmado como
essencial e funcionando — sem task.*

#### Lote 4 — Cadastros e identidade

*Independente e paralelo ao Lote 0 e aos demais lotes.*

| Task | O que é | Tag | Depende de | Executor | Modelo | Referências |
|---|---|---|---|---|---|---|
| 4.4 | Migration: coluna `codigo` (único por organização) em `produto`, para chamada rápida no orçamento | 🟡 LACUNA | nenhuma | backend-engineer | Sonnet | PRD RF-03, RF-30 |
| 4.1–4.3, 4.5 | Catálogo unificado: card único com seletor de categoria interno (elimina abas chapa/ferragem/LED/acessório/fita), botão genérico "Adicionar item", campos dinâmicos só depois da categoria escolhida, campos universais código/preço/status | 🔵 UX / 🟡 LACUNA | 4.4 | frontend-engineer (web) | Sonnet | PRD RF-30; documento-fonte tabela de campos por categoria |
| 4.6–4.7 | Máscara de CNPJ e de telefone (10 ou 11 dígitos) no formulário de perfil | 🟡 LACUNA | nenhuma | frontend-engineer (web) | Haiku | PRD RF-31 |
| 4.8–4.9 (back) | Upload de logo: bucket de Storage + política de RLS + coluna de referência em `organizacao` | 🔴 BLOQ | nenhuma | backend-engineer | Sonnet | PRD RF-02, RF-31, risco 12 |
| 4.8–4.9 (front) | UI de upload de logo substituindo o campo de URL; logo persiste e aparece em todos os lugares que a exibem (perfil, PDF da proposta) | 🔴 BLOQ | 4.8–4.9 (back) | frontend-engineer (web) | Sonnet | PRD RF-17, RF-31 |
| 4.10 | Fallback: sem logo cadastrada, exibe a marca padrão Orça Fácil | 🟡 LACUNA | 4.8–4.9 (front) | frontend-engineer (web) | Haiku | PRD RF-31 |
| 4.11 (back) | Upload de foto de perfil pessoal: bucket de Storage + coluna de referência | 🟡 LACUNA | nenhuma | backend-engineer | Sonnet | PRD RF-31, risco 12 |
| 4.11 (front) | UI de upload de foto de perfil | 🟡 LACUNA | 4.11 (back) | frontend-engineer (web) | Sonnet | PRD RF-31 |
| 4.12–4.13 (back) | Troca de senha com confirmação por e-mail (fluxo do Supabase Auth) | 🔴 BLOQ | nenhuma | backend-engineer | Sonnet | PRD RF-31 |
| 4.12–4.13 (front) | UI da área de segurança dedicada no perfil, com o fluxo de troca de senha; e-mail permanece não editável (identificador da conta, item 4.14 — sem task própria, é constraint desta) | 🔴 BLOQ | 4.12–4.13 (back) | frontend-engineer (web) | Sonnet | PRD RF-31 |
| 4.15 | **Excluir conta = excluir a organização inteira** (Q-13, Modelo 7.3), disponível no perfil. Cascade completo de 12 tabelas (`organizacao` incluída) + duas correções que o cascade exige + a checagem de autorização por papel (Q-17, Modelo 7.3 "Quem pode disparar"). **Nesta ordem**: **(0)** a Server Action verifica `perfil.papel === 'admin'` do usuário autenticado **antes** de qualquer operação destrutiva — `vendedor`/`projetista`/sem sessão são rejeitados com `NAO_AUTORIZADO_EXCLUIR_ORG`/403, nada é apagado, nenhum passo abaixo roda; **(1)** migration — `orcamento.cliente_id` sai de `on delete restrict` para `on delete no action` (RESTRICT é verificado imediatamente e abortaria a cascata mesmo dentro da mesma transação); **(2)** Server Action/RPC `SECURITY DEFINER` lê os `perfil.id` da organização **antes** de apagar (depois eles não existem mais); **(3)** `delete from organizacao where id = ...` — a cascata (`on delete cascade` já presente em toda tabela de tenant) apaga sozinha `perfil` · `cliente` · `produto` · `gabarito` (só os da org — os globais, `organizacao_id is null`, sobrevivem) · `orcamento` e, por ele, `ambiente` · `parede` · `linha_proposta` · `lista_material` · `elemento_continuo` · `elemento_parede_preset`; **(4)** expurga os objetos de Storage sob o prefixo da organização (logo, fotos de perfil — sem FK, não morrem pela cascata); **(5)** chama a Admin API do Supabase Auth (`service_role`) para apagar cada usuário lido no passo 2. **Nenhuma política de `delete` nova em `organizacao` para `authenticated`** — a única porta é a Server Action, com a checagem de papel do passo 0 dentro dela | 🔴 BLOQ | nenhuma | backend-engineer | Opus — não é CRUD padrão: cascade multi-tabela irreversível + Admin API (`service_role`) + expurgo de Storage sem FK, três superfícies fora do padrão RLS do resto do schema, com ordem de execução que precisa estar certa da primeira vez (sem undo) | Modelo 7.3 (cascade completo, "Quem pode disparar", 4 armadilhas técnicas, exemplo trabalhado, casos de borda); PRD RF-31, Q-13 (resolvida), Q-17 (resolvida) |

**Critérios de aceitação da Task 4.15** (não removível ao executar):
- [ ] Usuário com `perfil.papel` `vendedor` ou `projetista` (ou sem sessão)
      que chama a Server Action recebe `NAO_AUTORIZADO_EXCLUIR_ORG`/403 e
      nenhuma linha é apagada, nenhuma chamada à Admin API ou ao Storage
      acontece
- [ ] Migration aplica `orcamento.cliente_id ... on delete no action` (ou
      equivalente que resolva a ordem de verificação) sem afrouxar a proteção
      de dia a dia contra apagar cliente com orçamento vivo por engano
- [ ] Excluir uma organização com dado real (perfis, clientes, orçamentos com
      ambientes/paredes/linhas de proposta/listas de material, produtos,
      gabaritos próprios e ao menos um gabarito global promovido a partir
      dela) remove toda linha com aquele `organizacao_id`, preserva o
      gabarito global (com `origem_gabarito_id` nulo) e remove os usuários
      correspondentes de `auth.users`
- [ ] Objetos de Storage sob o prefixo da organização são removidos
- [ ] Confirmação via `Dialog` explícito (não `window.confirm`) antes de
      disparar a exclusão — texto exato é nota para o `product-designer`
- [ ] `security-auditor` revisou a task antes do merge — pré-requisito de
      execução, não follow-up
| 4.16 (back) | Migration: coluna `espessura_serra_padrao_mm numeric` em `organizacao` (default `3`, `0` é valor válido) + atualizar tipos/leitura do perfil. **Pré-requisito da Task 3.1/3.3 (motor)** — o bin-packing melhorado lê este campo como kerf | ✅ Completo | nenhuma | backend-engineer | Sonnet | Modelo 8.2 (A-13, A-14); PRD RF-02, RF-34, risco 12 |
| 4.16 (front) | Campo "Espessura de serra (kerf)" no formulário de `/perfil`, editável, com aviso de retroatividade: mudar o valor altera o plano de corte de todo orçamento **não congelado** (mesma disciplina das alturas de faixa) | 🟡 LACUNA | 4.16 (back) | frontend-engineer (web) | Sonnet | Modelo 8.2; PRD RF-02, RF-34, risco 12 |

**Task 4.15 desbloqueada — Q-17 respondida em 2026-08-03** (`docs/PRD.md`
Seção 7.4, `docs/Modelo-de-Dominio.md` Seção 7.3 "Quem pode disparar"): a
Q-13 original (o que "excluir conta" apaga de fato) já estava respondida —
apaga a organização inteira, por cascade — e agora a Q-17 (quem pode
disparar) também está: **só o papel `admin`/dono**. A checagem vive na
aplicação, dentro da própria Server Action, **antes** de qualquer `delete` —
não no banco: **não** se cria política de `delete` em `organizacao` para
`authenticated`, a única porta continua sendo a Server Action. Revisão do
`security-auditor` é pré-requisito de implementação, não follow-up: é a
única operação destrutiva multi-tabela do produto e a única que toca
`auth.users`/Storage fora do padrão RLS do resto do schema. A task está
pronta para execução.

**Histórico de execução:**
- **Task 4.16 (back)** ✅ (2026-08-11) — Migration `organizacao.espessura_serra_padrao_mm numeric not null default 3` (check `>= 0`), leitura em `lib/perfil/carregar.ts` (fallback 3 via nullish coalescing), escrita em `lib/organizacao/salvar.ts`. Round-trip mínimo em `components/perfil/PerfilLab.tsx`/`PerfilMock.tsx`, sem UI nova (campo de formulário é a Task 4.16 (front), separada). `code-auditor` APROVADO (1ª tentativa), `qa-engineer` APROVADO (1ª tentativa, 452/452 testes, default/valor customizado/zero-como-válido). Sem `security-auditor` (sem RLS nova). Sem impacto visual (backend puro). **Migration real NÃO aplicada no Supabase** — mesmo bloqueio de permissão de conta CLI já documentado; pendente do operador via MCP/Dashboard. **Desbloqueia a Task 3.1/3.3 (motor), Lote 3.**

#### Lote 5 — Limpeza visual

*Independente e paralelo ao Lote 0 e aos demais lotes.* Toda task aqui é
verificada pelo `ux-auditor` contra o checklist de 12 itens da Seção 15.4
de `docs/Design-System.md`. **Exceção pontual** (mesmo padrão da exceção do
Lote 3 com a Task 4.16): a Task 5.10 (back) depende da Task 0.7b (Lote 0,
congelamento real — é a `handleGerarProposta` corrigida que dispara o
gatilho, não a migration da coluna) — ver nota abaixo da tabela. O restante
do Lote continua independente.

| Task | O que é | Tag | Depende de | Executor | Modelo | Impacto Visual | Referências |
|---|---|---|---|---|---|---|---|
| 5.1–5.4 | Biblioteca e Editor de Módulo migram para o shell/Design System v3 (sidebar+topbar presentes nas duas telas), remoção dos textos clicáveis herdados da versão antiga (editor, calculadora, biblioteca, catálogo) | 🔵 UX | nenhuma | frontend-engineer (web) | Sonnet | **Completo** (retrofit de duas telas inteiras) | Design-System §6, §15.4; PRD RF-35 |
| 5.5–5.6 | Remover o card "validação tier 1 + tier 2" e varrer a UI por outros termos de especificação vazados (fora do rename "Preset"→"Módulo", já coberto pela Task 2.13) | 🔵 UX | nenhuma | frontend-engineer (web) | Haiku | **Leve** (ajuste pontual de texto) | Design-System §15.3; PRD RF-36 |
| 5.7–5.9 | Dashboard/orçamentos recentes: remover prazo de entrega, adicionar valor final do projeto e custo | 🔵 UX / 🟡 LACUNA | nenhuma | frontend-engineer (web) | Sonnet | **Leve** (ajuste de card existente) | Modelo 11.5, 5.5; PRD RF-33 |
| 5.10 (back) | **Etapa de esteira (Q-6, Q-15 — resolvidas)** — migration: coluna `etapa_esteira` enum (`novo` · `visita_agendada` · `projeto_3d` · `aguardando_aprovacao` · `fechado`) em `orcamento`, default `novo`, `not null`, `check` do enum (Erro E-E2 se fora dele). Server Action `atualizarEtapaEsteira(orcamentoId, novaEtapa)` aplicando as transições T1–T3 (movimento livre entre não-terminais; só sai de `fechado` pela Task 1.9/Reabrir — Erro E-E1 se tentado por aqui). Gatilhos automáticos amarrados aos dois pontos de código já identificados: `criarOrcamento` (o default da coluna já cobre `∅ → novo`, sem código extra) e `handleGerarProposta`/Task 0.7b (na **mesma transação** do congelamento: se a etapa atual for anterior a `aguardando_aprovacao`, avança; se já `fechado`, não mexe — só recongela, I3) | ✅ (2026-08-05) | 0.7b | backend-engineer | Sonnet | — (backend, sem UI) | Modelo 7.2 (enum, transições T1–T3, gatilhos, E-E1/E-E2); PRD RF-33, Q-6 (resolvida) |
| 5.10 (front) | Seletor manual das etapas não-terminais (`novo`, `visita_agendada`, `projeto_3d`, `aguardando_aprovacao`) na tela do orçamento, com movimento livre entre elas (T1) — na prática, `visita_agendada`/`projeto_3d` dependem inteiramente deste seletor (não têm gatilho automático), enquanto `novo`/`aguardando_aprovacao` já são atingidas automaticamente por outras ações (criação do orçamento e "Gerar proposta", respectivamente) mas continuam selecionáveis à mão aqui, para corrigir um avanço/recuo feito por engano (T1 permite ida e volta livre); sem seletor (read-only) quando `etapaEsteira === "fechado"` — a única saída é o botão Reabrir (Task 1.9), restrito a `admin`. Badge do card de orçamento (dashboard e cabeçalho do orçamento) passa a usar `rotuloDoCard(status, etapaEsteira)` (Q-15): "Fechado" no terminal, "Em andamento" nas três intermediárias, rótulo do `status` comercial quando `novo` — substitui os badges "Em andamento"/"Fechado" que hoje não tinham origem | 🟡 LACUNA / 🔵 UX | 5.10 (back) | frontend-engineer (web) | Sonnet | **Leve** (troca de origem de um badge já existente + seletor pontual, não é tela nova) | Modelo 7.2 (Q-15, T1, `rotuloDoCard`, exemplo trabalhado); PRD RF-33, Q-15 (resolvida) |

**Histórico de execução:**
- **Task 5.10 (back)** ✅ (2026-08-05) — coluna `orcamento.etapa_esteira` (migration `20260805100000_orcamento_etapa_esteira.sql`, aplicada e confirmada no Supabase real via MCP), Server Action `atualizarEtapaEsteira` (`lib/orcamento/etapa-esteira.ts`, transições T1-T3, erros E-E1/E-E2), gatilho de avanço automático para `aguardando_aprovacao` no congelamento (`lib/orcamento/congelar.ts`, invariante I3 preservada). `code-auditor` APROVADO (veredito em arquivo, build/lint/typecheck limpos), `qa-engineer` APROVADO (veredito em arquivo, 358/358 testes, 5 critérios de comportamento cobertos com evidência de linha). Sem `security-auditor` (sem RLS nova) nem `ux-auditor` (backend puro, sem UI). Desbloqueia a Task 1.9 (Lote 1).

*Nota — dependência cruzada: a Task 5.10 (back) depende da Task 0.7b (Lote 0)
porque a transição automática para `aguardando_aprovacao` é gravada no
**mesmo ato** que o congelamento (`handleGerarProposta` corrigido), mesma
transação — não dá para escrever esse gatilho antes de a Task 0.7b existir
(0.7a, a migration/Server Action, já é pré-requisito transitivo de 0.7b).*

*Nota — mesma superfície de arquivo (não é dependência de dado): a Task 5.10
(front) e a Task 5.7–5.9 tocam o mesmo componente de card do dashboard.
Podem rodar em qualquer ordem entre si — só vale coordenar a ordem de merge
para evitar conflito.*

*Nota — por que `fechado` nunca é opção do seletor manual: a única saída de
`fechado` é o botão "Reabrir" (Task 1.9), agora restrito ao papel `admin`
(Q-18, resolvida — I6a), e o gatilho que normalmente levaria a `fechado`
(aprovação do orçamento) não existe neste lançamento — é trabalho pós-MVP,
despriorizado ("Backlog futuro" acima). Oferecer `fechado` no seletor manual
criaria um beco sem saída: o marceneiro entraria numa etapa terminal sem ter
passado pelo gatilho real e, se não for `admin`, sem conseguir sair dela de
jeito nenhum. `docs/Modelo-de-Dominio.md` Seção 7.2 documenta `fechado` como
deliberadamente inalcançável nesta fase pelas mesmas razões.*

### Backlog futuro (pós-MVP — avaliado, não agendado)

> Registrado em 2026-07-28 a pedido do operador. Nada aqui está autorizado
> pra execução — é só pra não perder a ideia. Vira task real (contrato,
> modelo, branch, gates) quando e se for priorizado.

- ~~**Preview 3D leve e sincronizado**~~ — **promovido a task real**: o
  operador decidiu, em 2026-07-31 (D-33), pela exceção pontual do
  `ModuleViewer` (RF-38), agora Task 3.13 (front) no Lote 3. Não fica mais
  registrado aqui como ideia — é escopo ativo do corte de lançamento.
- **Telas adicionais**: `/clientes` (CRUD/lista dedicada, hoje só captura
  inline no fluxo de novo orçamento), Histórico de Orçamentos (timeline de
  versões, hoje só existe auditoria de baixo nível), Central de Ajuda
  (onboarding/tutoriais, não existe nada ainda).
- **Componentes de polish**: Command Palette (⌘K), centro de notificações,
  histórico lateral de atividade, breadcrumb completo, painel de
  propriedades contextual generalizado (já existe parcialmente pro
  Elemento Contínuo), empty states ilustrados, tour guiado, skeleton
  loading, atalhos de teclado globais, modo foco na aba Ambientes.

> Registrado em 2026-07-31 (Lote 6 de `docs/01-backlog-pre-lancamento.md`,
> explicitamente despriorizado pelo operador — não agendar sem nova
> decisão):

- **Fluxo de aprovação de orçamento** (item 6.1) — aba de orçamentos com
  workflow de aprovação. Despriorizado explicitamente pelo operador.
- **Prazo de entrega reaparece quando o orçamento é aprovado** (item 6.2) —
  depende do item acima; hoje o prazo de entrega sai do dashboard (Lote 5,
  item 5.7) e continua só na proposta.
- ~~Item 6.3 (substituição do bin-packing, "se 3.1 não resolver")~~ —
  **sem objeto**: com o descarte do OR-Tools (2026-07-31) e a substituição do
  algoritmo acontecendo em TypeScript síncrono/Web Worker (RF-34, Tasks
  3.1/3.3 no Lote 3), os itens 3.1 e 3.3 são a mesma entrega — não há mais
  "se 3.1 não resolver" a esperar, e não há segundo estágio de OR-Tools para
  onde isto poderia ter sido adiado.

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

---

## Resumo do Épico V2.1 — Pré-Lançamento (Fase D)

> Planejado em 2026-07-31 a partir de `docs/01-backlog-pre-lancamento.md` +
> `docs/PRD.md` Seção 10 + `docs/Modelo-de-Dominio.md` Seções 3.1.1–8.6 e 11.
> Nenhuma task foi executada ainda — este resumo é do **planejamento**, não
> de entrega.

| Lote/Estágio | Foco | Dependência | Tasks | Status |
|---|---|---|---|---|
| Lote 0 — Fundação de dados | Ambiente/Parede como entidade real (N×N), alturas por parede, snapshot congelado (dividido em 0.7a/0.7b) | Bloqueia Lote 1 e 2 | 5 | 4 de 6 ✅ (0.1–0.3, 0.4, 0.5a, 0.7a mesclados) — 0.5b/0.7b com código pronto em worktree, gate interrompido por limite de gasto (ver `docs/STATUS.md` §1) |
| Lote 1 — Confiança e estado | Cache, URL de aba, paridade financeiro↔proposta, reabrir orçamento | Depende do Lote 0; bloqueia Lote 2 — exceção: Task 1.9 (back) também depende da Task 5.10 (back), Lote 5 (ver nota de dependência cruzada no cabeçalho do Lote 1) | 6 | ⏱️ Planejado |
| Lote 2 — Lacunas funcionais | Criação de módulo, elementos de parede, posicionamento por vão, elevação com módulos, agrupamento comercial | Depende do Lote 0 **e** do Lote 1 fecharem, em sequência | 19 | ⏱️ Planejado |
| Lote 3 — Precisão do motor | Bin-packing melhorado (kerf + guilhotina + meta-heurística), `ModuleViewer` + textura real (catálogo-back/front), contagem de cortes, fita por cor, tampo 3 modelos | Paralelo, independente **como regra geral** — exceção: Task 3.1/3.3 (motor) depende de 4.16 (back), Lote 4 — **agora desbloqueada (4.16 mesclada)** | 16 | ⏱️ Planejado |
| Lote 4 — Cadastros e identidade | Catálogo unificado, upload de logo/foto, segurança de conta, kerf do perfil | Paralelo, independente | 13 | ⏱️ Planejado |
| Lote 5 — Limpeza visual | Shell v3 em Biblioteca/Editor, vocabulário, dashboard, etapa de esteira | Paralelo, independente — exceção: Task 5.10 (back) depende da Task 0.7b, Lote 0 (ver nota de dependência cruzada no cabeçalho do Lote 5) | 5 | ⏱️ Planejado (exceção: 5.10 (back) aguarda 0.7b) |
| **Total** | | | **65** | |

> **Estágio OR-Tools removido em 2026-07-31.** O "Estágio OR-Tools — Plano
> de corte assíncrono" (tasks OR.1–OR.5, 5 tasks) foi **cancelado por
> completo** junto com a direção de arquitetura que o motivava — não consta
> mais deste resumo nem do documento. O RF-34 continua existindo, agora como
> as Tasks 3.1/3.3 (motor) e 3.1/3.3 (front) do Lote 3, sem bloqueio.

**Distribuição por executor**: frontend-engineer 37 · backend-engineer 17 ·
motor-engineer 11 · integration-engineer 0.

**Distribuição por modelo recomendado**: Sonnet 59 · Haiku 5 (1.8, 2.13,
4.6–4.7, 4.10, 5.5–5.6 — tasks mecânicas de texto/máscara/relabel) · Opus 1
(4.15 — exclusão de conta, irreversível e sensível a LGPD).

**Bloqueadas por decisão pendente do operador**: nenhuma. As últimas duas
perguntas em aberto — **Q-17** (quem pode disparar a exclusão da
organização) e **Q-18** (quem pode reabrir um orçamento fechado) — foram
respondidas pelo operador em 2026-08-03, ambas com a mesma resposta: só o
papel `admin`/dono (`docs/Modelo-de-Dominio.md` Seção 7.3 "Quem pode
disparar" e Seção 5.4.1, invariante I6a). Task 4.15 e as Tasks 1.9 (back)/
(front) deixam de estar bloqueadas e ganham a checagem de papel correspondente
na descrição. A Q-6, Q-13, Q-14 e Q-16 já haviam sido respondidas na rodada
anterior (ver revisão de 2026-08-02 acima); a Q-12 perdeu objeto (a troca de
algoritmo do RF-34 já é a correção do item 3.1); e as Q-8 a Q-11 foram
extintas junto com o descarte do OR-Tools.

**Registradas sem task agendada (placeholder, aguardando decisão)**:
nenhuma — o item 5.10 do backlog-fonte (status de esteira) ganhou tasks
reais (5.10 back/front, Lote 5) com a resposta de Q-6/Q-15.

**Movidas para "Backlog futuro" (pós-lançamento, não agendadas)**: itens
6.1 e 6.2 do backlog-fonte (fluxo de aprovação e reexibição de prazo de
entrega). Item 6.3 está **sem objeto** (ver nota na seção "Backlog futuro").

---

## Rastreabilidade — Fase D (RF-19 a RF-38)

> Os RF-01 a RF-18 (Épico V2) já estão cobertos pela Fase C, listada acima.
> Esta tabela cobre só os requisitos novos/emendados da Fase D, incluindo
> RF-38 (`ModuleViewer`), adicionado em 2026-07-31 junto com o cancelamento
> do RF-34 antigo (OR-Tools) e sua substituição pelo RF-34 novo (bin-packing
> TypeScript/Web Worker), e RF-04 (emenda pontual da Fase D — regra de
> deduplicação da biblioteca, Modelo-de-Dominio Seção 7.1 regra 6), incluído
> por exceção mesmo estando fora da faixa RF-19–RF-38 porque só ganhou task
> própria nesta rodada de correção — mesma situação de RF-05 e RF-16
> (também emendados na Fase D, Seção 10.2, também fora da faixa), cujas
> tasks entram na lista de exceções ao final da tabela. Task sem RF citado
> no PRD é escopo inventado; RF sem task é escopo perdido — as oito
> exceções listadas ao final resolvem os casos aparentes das duas coisas
> nesta rodada; fora delas, nenhum dos dois caso ocorre.

| RF | Descrição resumida | Tasks |
|---|---|---|
| RF-04 (emenda) | Biblioteca esconde o módulo global cuja origem é gabarito promovido da própria organização | 2.1 (dedup) |
| RF-19 | Ambiente/Parede navegáveis, N×N | 0.1–0.3, 2.3–2.6 |
| RF-20 | Alturas herdadas com override por parede | 0.4, 2.3–2.6 (alturas) |
| RF-21 | Posicionamento por vão até o vizinho | 2.18 (motor), 2.18 (front) |
| RF-22 | Congelamento real da proposta | 0.7a, 0.7b, 1.5–1.6 |
| RF-23 | Estado de aplicação confiável (cache, URL, render, link) | 1.1–1.3, 1.8 |
| RF-24 | Criar módulo do zero | 2.1 |
| RF-25 | Elementos de parede completos (pedra, edição, referência, preset) | 2.7, 2.8–2.11 (back/front), 2.12 (back/front) |
| RF-26 | Inserção de módulo com decisão guiada (cascata, faixas, torre, rodapé) | 2.14–2.17 |
| RF-27 | Elevação desenha módulos + cotas | 2.24–2.26, 2.27 |
| RF-28 | Tampo com três modelos | 3.10–3.11 (motor/front) |
| RF-29 | Saída do plano de corte completa (chapas, cortes, fita por cor, rolos) | 1.7, 3.2, 3.4, 3.5 (motor/front), 3.6 |
| RF-30 | Catálogo unificado | 4.1–4.3/4.5, 4.4 |
| RF-31 | Identidade e conta (logo, foto, máscaras, segurança, exclusão) | 4.6–4.7, 4.8–4.9 (back/front), 4.10, 4.11 (back/front), 4.12–4.13 (back/front), 4.15 |
| RF-32 | Editar dados do cliente | 0.5a, 0.5b |
| RF-33 | Dashboard com valor e custo, etapa de esteira (Q-6, Q-15 resolvidas) | 5.7–5.9, 5.10 (back), 5.10 (front) |
| RF-34 | Plano de corte com bin-packing melhorado (guilhotina + retângulos livres + meta-heurística, kerf, Web Worker) — **substitui o RF-34 antigo (OR-Tools, cancelado)** | 3.1/3.3 (motor), 3.1/3.3 (front), 4.16 (back), 4.16 (front) |
| RF-35 | Shell consistente (Biblioteca, Editor) | 5.1–5.4 |
| RF-36 | Vocabulário de produto na interface | 2.13, 5.5–5.6 |
| RF-37 | Dois agrupamentos, duas afordâncias | 2.28–2.30 |
| RF-38 | `ModuleViewer` — visualização 3D estática do módulo em edição | 3.13 (front) |

**Lacunas**: nenhuma — todo RF-19 a RF-38 tem ao menos uma task (mais RF-04,
incluído por exceção — ver nota acima). Também sem task inventada fora de
RF: mapeamento item a item, sem "respectivamente" — **oito exceções**, não
cinco:

- Item 1.5–1.6 → RF-22 (já refletido na linha RF-22 da tabela acima);
- Item 1.7 → RF-29 (já refletido na linha RF-29 da tabela acima — deixa de
  ficar solto, é a origem citada no PRD para este item);
- Itens 3.7 e 3.8 → RF-15 (Fase D, emenda de RF pré-existente — quantidade
  sem m² e edição de quantidade na lista de material);
- Item 3.12 → RF-28 (já refletido na linha RF-28 da tabela acima — BOM
  completo dos três modelos de tampo);
- Tasks 2.19–2.23 → **RF-05** (Fase D, emenda de RF pré-existente — editor
  de item dirigido por capacidade passa a estar disponível no momento da
  inserção do módulo; PRD Seção 10.2, tabela de emendas);
- Tasks 2.31 e 2.32 → **RF-16** (Fase D, emenda de RF pré-existente —
  reversão de divisão de linha e subdivisão mantendo o vínculo; PRD Seção
  10.2, tabela de emendas — a mesma emenda também cobre a Task 2.29, já
  refletida na linha RF-37 acima).

Todos os oito são bugs e refinamentos de requisito já existente (RF-05,
RF-15, RF-16, RF-22, RF-28, RF-29), não requisito novo à parte. Os itens 3.1
e 3.3 mapeiam para o RF-34 novo (Tasks 3.1/3.3), citados no próprio ID da
task para rastreabilidade com o documento-fonte.

Pronto para handoff ao `spec-auditor`.
