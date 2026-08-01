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

- ~~`elemento_continuo` não tem coluna de cor~~ — **coberto pela Task 3.10–3.11
  (back)** do Épico V2.1 (Lote 3, ver abaixo), que soma a coluna `cor` na
  mesma migration que cria `modelo_tampo` (mesma tabela, achado da
  reauditoria de 2026-08-01). Ver `docs/Lessons-Learned.md` (Padrão 5,
  2026-07-31) para o histórico do gap.
- `organizacao`/`perfil`: política de UPDATE libera qualquer papel
  (`admin`/`vendedor`/`projetista`), sem granularidade — um vendedor pode
  editar CNPJ/endereço/padrões financeiros da empresa. Achado na Task 13.7a.

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

| Task | O que é | Tag | Depende de | Executor | Modelo | Referências |
|---|---|---|---|---|---|---|
| 0.1–0.3 | Substituir o singleton de Ambiente/Parede por estado real de N ambientes × N paredes: migration de `ordem`/`nome`/`alturas_override`, refatorar `lib/ambiente/estado.ts`/`salvar.ts`/`mapear.ts`, e implementar os Server Actions `criarAmbiente`/`renomearAmbiente`/`reordenarAmbientes`/`excluirAmbiente`/`criarParede`/`atualizarParede`/`excluirParede`. Exclusão cascateia e remove do jsonb `orcamento.itens` os `itemIds` que ficariam órfãos (sem FK que garanta isso — ponto de atenção explícito do Data Architect) | 🔴 BLOQ | nenhuma | backend-engineer | Sonnet | Modelo 3.2; `schema-v2.1-delta.sql` §1–2, §8; PRD RF-19, risco 7 |
| 0.4 | Alturas de faixa: `alturasEfetivas(parede, organizacao)` (perfil dá default, parede sobrescreve campo a campo), estado "herdado"/"customizado" **derivado** (nunca flag persistido), "voltar ao herdado" apaga a chave. Corrige **junto** o achado colateral: `lib/ambiente/salvar.ts:66-73` hoje sobrescreve `organizacao.alturas_padrao` inteira a cada salvamento de ambiente — vira invariante de aceite que salvar parede/ambiente nunca escreve no perfil da organização. Corrige também A-08 (`Y(inferior)` e `Y(torre)` = `alturaRodape`, hoje o motor usa `0`) | 🟡 LACUNA | 0.1–0.3 | backend-engineer | Sonnet | Modelo 3.2.1 (exemplos trabalhados); PRD D-27, RF-20, risco 8 |
| 0.5a | Server Action `atualizarCliente` (nome, telefone, endereço) — hoje o cadastro é de mão única | 🟡 LACUNA | nenhuma | backend-engineer | Sonnet | Modelo 7 ("Cliente"); PRD RF-32 |
| 0.5b | Formulário de edição de dados do cliente na tela do orçamento | 🟡 LACUNA | 0.5a | frontend-engineer (web) | Sonnet | PRD RF-32 |
| 0.7a | **Migration**: coluna `orcamento.congelado_em timestamptz null` (default `null`) — estado congelado da **proposta**, ortogonal ao `status` comercial (Modelo 5.4.1: coluna própria, não valor de enum, não derivação). DDL já pronto em `.maestro/tmp/schema-v2.1-delta.sql` §9 (L.269-300, "orcamento.congelado_em"). RLS **inalterada** — coluna nova numa tabela que já tem as 4 políticas por org. Expor o campo em `lib/orcamento/buscar.ts` (`OrcamentoDetalhe.congeladoEm: string \| null`, mapeado de `congelado_em`). Criar a Server Action nova `congelarOrcamento(orcamentoId)` (ex.: `lib/orcamento/congelar.ts`, `"use server"`) que grava `congelado_em = now()` quando chamada — a checagem "só chamar depois que todas as linhas gravaram" é responsabilidade do chamador (Task 0.7b), não desta Server Action | 🔴 BLOQ | nenhuma | backend-engineer | Sonnet | Modelo-de-Dominio 5.4.1 (definição, modelagem, invariantes I1–I5); `schema-v2.1-delta.sql` §9 (L.269-300); PRD RF-22, risco 9 |
| 0.7b | **Correção do bug de leitura + fechamento do ato de congelamento**: `PropostaLab.tsx:77` recalcula `calcularEngineOrcamento(estadoInicial)` a cada render e `:141` deriva o valor exibido de `resultadoRateio.snapshot.grupos` mesmo quando o orçamento já está congelado — é este o bug relatado pelo marceneiro (o valor muda sozinho ao navegar entre abas), não a falta de escrita que a versão anterior desta task presumia (`congelarListaMaterial` e a gravação de `valor_rateado` em `handleGerarProposta`, L.248-260, **já existem**). Corrigir para respeitar Modelo 5.4.1: com `congeladoEm !== null` (`estaCongelado`), `valorAtualDaLinha` passa a ler `linha.valorRateado` **persistido** (ignora override em sessão e rateio ao vivo — R2); com `congeladoEm === null`, o comportamento atual (rateio ao vivo + override em sessão) permanece intacto (R1). Encadear `congeladoEm` como prop nova, populada em `app/(app)/orcamento/[id]/page.tsx` (já busca `orcamento` via `buscarOrcamentoPorId`, exposto pela Task 0.7a) → `PropostaTabConectada` → `PropostaLab`. Fechar também o lado da escrita que falta de verdade (I1): `handleGerarProposta` grava `valorRateado` de todas as linhas mas nunca grava `congeladoEm` — chamar `congelarOrcamento` (Task 0.7a) só depois que **todas** as gravações de linha tiverem sucesso; se qualquer uma falhar, não congela (meio-congelamento é pior que não congelar, I1) | 🔴 BLOQ | 0.7a | frontend-engineer (web) | Sonnet | Modelo-de-Dominio 5.4.1 (I1, R1, R2, casos de borda, exemplo trabalhado do critério de sucesso nº1); PRD RF-22, 10.4 item 2, risco 9 |

*Nota: item 0.6 (nome livre de parede) está coberto pela migration da Task
0.1–0.3 (coluna `nome`, default `"Parede 1"`, `CHECK` de não-vazio — já no
delta SQL).*

#### Lote 1 — Confiança e estado

*Bloqueado até o Lote 0 fechar. Bloqueia o Lote 2.* Causa raiz única
(documento-fonte Seção 2.1): falta de invalidação de cache após mutação +
estado de aba fora da URL.

| Task | O que é | Tag | Depende de | Executor | Modelo | Referências |
|---|---|---|---|---|---|---|
| 1.1–1.3 | Invalidação de cache após mutação (salvar em qualquer aba propaga para as demais), aba persistida na URL (F5 mantém a aba), botão "atualizar render" funcional sem F5 | 🔴 BLOQ / 🟠 BUG | nenhuma (sequenciamento de Lote, não dependência técnica) | frontend-engineer (web) | Sonnet | PRD RF-23; Modelo 11.2 ("fora do domínio: estado de aplicação") |
| 1.5–1.6 | Teste automatizado de paridade financeiro ↔ proposta (soma das linhas == preço final) + resíduo de arredondamento absorvido pela última linha; **reproduzir com dado real** a diferença de R$ 6,00 relatada (4.578,77 esperado × 4.584,77 exibido) antes de assumir que a aritmética está certa | 🔴 BLOQ | 0.7a, 0.7b | motor-engineer | Sonnet | Modelo 5.2, 11.2; PRD 10.4 item 2 |
| 1.7 | Investigar e corrigir bug de chapas de 6 mm com baixo aproveitamento não contadas no modo "valor por chapa" — **verificar no dado antes de mexer no cálculo** (filtro por aproveitamento mínimo × classificação errada no catálogo são hipóteses diferentes, correções diferentes) | 🟠 BUG | nenhuma | motor-engineer | Sonnet | Modelo 5.2, 11.2; PRD 10.4 |
| 1.8 | Corrigir link "calculadora" no editor (hoje leva à raiz/dashboard) | 🟠 BUG | nenhuma | frontend-engineer (web) | Haiku | PRD RF-23 |

*Nota: item 1.4 do backlog-fonte (leitura da Proposta a partir do snapshot
congelado) foi **absorvido pela Task 0.7b** — mesmo defeito, mesma linha de
código (`PropostaLab.tsx:77,141`); mantê-lo como task separada duplicaria o
trabalho e o critério de aceite. A metade do item 1.4 que falava de "lista
de material" não tem o mesmo defeito: por decisão de escopo já registrada
(D-08, Task 13.4/13.7b), a aba Corte & Material sempre mostra o estado
ATUAL em tela — "congelar" ali é só o pré-pedido de compra insert-only
(histórico próprio em `lista_material`), não uma trava de exibição. Ver
Modelo-de-Dominio 5.4.1, tabela "Dois congelamentos, não um".*

#### Lote 2 — Lacunas funcionais

**Bloqueado até o Lote 0 e o Lote 1 fecharem** (regra do operador — cadeia
sequencial estrita: Lote 0 → Lote 1 → Lote 2, nunca Lote 2 em paralelo com o
Lote 1). Nenhuma task desta lista deve iniciar antes das Tasks do Lote 1
(1.1–1.3, 1.5–1.8) estarem mescladas — o que por sua vez já pressupõe o Lote 0
(0.1–0.3 a 0.7b) fechado.

| Task | O que é | Tag | Depende de | Executor | Modelo | Referências |
|---|---|---|---|---|---|---|
| 2.1 | Ponto de entrada de "criar módulo do zero" a partir de `/biblioteca` e do menu lateral — `lib/gabarito/criar.ts` **já existe e já cria** gabarito privado à org (`origem_gabarito_id: null`); falta só a entrada de UI | 🔴 BLOQ | Lote 0, Lote 1 | frontend-engineer (web) | Sonnet | Modelo 7.1; PRD RF-24, D-31 |
| 2.1 (dedup) | Ocultar da listagem de `/biblioteca` o módulo global cuja origem (`origem_gabarito_id`) é um gabarito promovido da própria organização — sem isso o marceneiro veria o mesmo módulo duas vezes (versão da org + versão promovida global). Dispara só depois que o operador promove um gabarito daquela organização para global — mecanismo que **não existe ainda no repositório** (`fork_gabarito()` é o caminho **inverso**: copia um gabarito global PARA a organização do usuário, não promove nada; ver Task 2.1 (promoção) abaixo, que cria o caminho que falta) | 🟡 LACUNA | Lote 0, Lote 1 | backend-engineer | Sonnet | Modelo-de-Dominio 7.1 regra 6; PRD RF-04 (emenda Fase D) |
| 2.1 (promoção) | Mecanismo de promoção org→global (D-31/D-10, Modelo-de-Dominio 7.1 regras 3–4): rotina restrita a `service_role`/painel administrativo do operador — **nunca** uma RPC ou Server Action chamável por `authenticated` — que insere uma **linha global nova** (`organizacao_id = null`, `origem_gabarito_id` = id do gabarito de origem, mesma `definicao`) a partir de um gabarito de uma organização; a linha da organização de origem permanece intacta e editável pelo dono (cópia, nunca reparent). Segue exatamente o INSERT já especificado em `.maestro/tmp/schema-v2.1-delta.sql` §7. Sem esta task, a Task 2.1 (dedup) nunca tem um dado real para exercitar o próprio filtro | 🟡 LACUNA | Lote 0, Lote 1 | backend-engineer | Sonnet | Modelo-de-Dominio 7.1 regras 3–4 (promoção é cópia, não reparent; só o operador); `.maestro/tmp/schema-v2.1-delta.sql` §7; PRD D-31 |
| 2.3–2.6 | Cadastrar/editar/ordenar ambientes e paredes dentro do orçamento; seletor de parede que expande o painel daquela parede; indicação visual permanente de qual ambiente e qual parede estão em edição | 🟡 LACUNA / 🔵 UX | Lote 0 (0.1–0.3), Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.2, 11.5; PRD RF-19 |
| 2.3–2.6 (alturas) | UI de override de altura por parede: indicador visual "herdado" vs. "customizado" por parede (derivado, nunca um campo à parte); botão "voltar ao herdado" que apaga a chave de override (nunca copia o valor numérico); no formulário de `/perfil`, aviso de propagação ao salvar as alturas padrão da organização ("mudar o default afeta as paredes não customizadas") | 🟡 LACUNA | 0.4, Lote 0, Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.2.1; PRD RF-20, D-27 |
| 2.7 | Motor: tipo de elemento de parede "pedra" + regra de bloqueio de conjunto por tipo (porta/janela quebram o bloco físico; pedra/tomada/ponto_hidráulico não quebram) + aviso `TAMPO_SOBRE_PEDRA` | 🟡 LACUNA | Lote 0, Lote 1 | motor-engineer | Sonnet | Modelo 3.2.2 (tabela de bloqueio, exemplo trabalhado) |
| 2.8–2.11 (back) | Backfill de `id`/`refX`/`refY`/`nome` nos elementos de parede já em produção (neutro: `refX="esquerda"`, `refY="chao"` reproduz a leitura atual) + funções de conversão canônico ↔ referência de medida | 🟡 LACUNA | Lote 0, Lote 1 | backend-engineer | Sonnet | Modelo 3.2.2; `schema-v2.1-delta.sql` §3 |
| 2.7–2.11 (front) | UI de elemento de parede: seletor do tipo "pedra", edição após adicionar (via linha da lista **e** via clique na representação 2D), referência de medida escolhível (X esquerda/direita, Y chão/teto) com **rótulos descritivos** ("Distância da parede esquerda", "Altura do chão" — nunca "X"/"Y") | 🟡 LACUNA / 🔵 UX | 2.7, 2.8–2.11 (back), Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.2.2 (tabela de rótulos, exemplos trabalhados); PRD RF-25 |
| 2.12 (back) | `ElementoParedePreset`: nova tabela (só `nome` obrigatório + largura/altura de prefill), **fora do catálogo de produtos**, sem preço/status/tipo — decisão do operador que rejeitou a recomendação do backlog-fonte (Q-5) | 🟡 LACUNA | Lote 0, Lote 1 | backend-engineer | Sonnet | Modelo 3.2.3; `schema-v2.1-delta.sql` §5; PRD D-29 |
| 2.12 (front) | UI de criar/listar/aplicar preset de elemento de parede (aplicar copia nome+dimensão, sem vínculo vivo) | 🟡 LACUNA | 2.12 (back), Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.2.3; PRD RF-25 |
| 2.13 | Rename "Preset" → "Módulo" em toda a interface (identificador de domínio continua `preset`/o que for — é rótulo, não tipo) | 🔵 UX | Lote 0, Lote 1 | frontend-engineer (web) | Haiku | Design-System 15.3; PRD 10.4 item 1 |
| 2.14–2.17 | Seleção em cascata ambiente → faixa → módulo (campo de módulo só libera depois da faixa); faixas renomeadas na UI (inferior · **meio** · aéreo · torre — identificador `bancada` não muda); torre ocupa as três faixas; módulo inferior assenta automaticamente sobre o rodapé | 🟡 LACUNA / 🔵 UX | 0.4, Lote 0, Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.1 (nota), 3.2.1 (tabela de Y), A-09; PRD RF-26 |
| 2.18 (motor) | Posicionamento por vão até o vizinho: conversão vão → X absoluto na entrada, X → vão nos dois lados na exibição; apagar um módulo do meio não move ninguém; torre é vizinha das três faixas (A-09) | 🟡 LACUNA | Lote 0, Lote 1 | motor-engineer | Sonnet | Modelo 3.1.1 (fórmulas e 4 exemplos trabalhados); PRD RF-21, D-28 |
| 2.18 (front) | UI de inserção com campo de **vão** (não afastamento da parede), reconversão exibida dos dois lados | 🟡 LACUNA | 2.18 (motor), Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.1.1; PRD RF-21 |
| 2.19–2.23 | Editar módulo no momento da inserção, na mesma tela: largura/altura/profundidade, cor e espessura da caixa, cor e espessura das portas, fundo sim/não, tipo de puxador | 🟡 LACUNA | Lote 0, Lote 1 | frontend-engineer (web) | Sonnet | PRD RF-05, RF-26 |
| 2.24–2.26 | Elevação da parede passa a desenhar os **módulos posicionados** (hoje só elementos de parede aparecem), faixas rotuladas com a nomenclatura nova, torre desenhada refletindo a sobreposição real | 🔴 BLOQ / 🔵 UX | 2.14–2.17, 2.18 (motor), Lote 1 | frontend-engineer (web) | Sonnet | PRD RF-27, risco 3 |
| 2.27 | Cotas à direita na elevação: altura total da parede + altura de cada faixa | 🟡 LACUNA | 2.24–2.26, Lote 1 | frontend-engineer (web) | Sonnet | Modelo 11.5; PRD RF-27 |
| 2.28–2.30 | Agrupamento comercial cross-faixa/parede (`LinhaProposta`) com afordância visual distinta do bloco físico (`Conjunto`) na mesma elevação; botão de tag de conjunto disponível também nos módulos superiores; garantir que os dois **nunca colapsem no mesmo botão** (2.30 é critério de aceite desta task, não task separada) | 🟡 LACUNA / 🔴 BLOQ (2.30) | 2.24–2.26, Lote 1 | frontend-engineer (web) | Sonnet | Modelo 3.3, 6; PRD RF-37, Q-3 |
| 2.31 | Cancelar/reverter divisão de linha de proposta — item volta para a linha mãe | 🟡 LACUNA | Lote 0, Lote 1 | frontend-engineer (web) | Sonnet | PRD RF-16 |
| 2.32 | Subdividir dentro do ambiente mantendo o vínculo (quarto → cabeceira, penteadeira, gaveteiro, guarda-roupa, todos sob "Quarto") | 🟡 LACUNA | Lote 0, Lote 1 | frontend-engineer (web) | Sonnet | PRD RF-16 |

*Nota: item 2.2 (manter filtro por ambiente na listagem da biblioteca) já
está bom hoje — sem task.*

#### Lote 3 — Precisão do motor

*Independente e paralelo ao Lote 0 e aos demais lotes — **como regra geral**.
Duas exceções pontuais, ambas declaradas nos dois sentidos (nas linhas das
tasks envolvidas), que o "independente e paralelo" do parágrafo acima não
anula:
1. A Task 3.1/3.3 (motor) não pode começar antes da Task 4.16 (back) (coluna
   `espessura_serra_padrao_mm` no perfil) estar mesclada.
2. A Task 3.6 (motor) não pode começar antes da Task 4.1–4.3/4.5 (front,
   Lote 4) acrescentar o campo de tamanho de rolo na especificação de `fita`
   do catálogo — o campo não existe hoje (`lib/produto/tipos.ts:29`).*

| Task | O que é | Tag | Depende de | Executor | Modelo | Referências |
|---|---|---|---|---|---|---|
| 3.1/3.3 (motor) | **Bin-packing melhorado**: guilhotina com lista de retângulos livres (o espaço livre deixa de ser descartado quando a "prateleira" corrente fecha) + meta-heurística de busca por permutação (*simulated annealing* ou algoritmo genético — escolha do motor-engineer), avaliando as duas orientações de cada peça sempre que `!temVeio`. Respeita **kerf** (`espessuraSerraPadraoMm` do perfil, Task 4.16) e a restrição de veio existente **sem alterá-la** (rotação só quando `!temVeio`). 100% TypeScript, síncrono, roda em função pura (a integração em Web Worker é a Task 3.1/3.3 (front)). Invariantes obrigatórias, cada uma virando teste: **V1** conservação de peças · **V2** geometria + kerf entre peças adjacentes · **V3** veio respeitado · **V4** aproveitamento coerente (tolerância 1e-6) · **V5** guilhotina sempre válida · **V6** monotonicidade (nunca pior que o algoritmo determinístico com os mesmos parâmetros) · **V7** determinismo (PRNG semeado, `maxIteracoes` fixo — **nunca** limite de relógio). Fecha ao mesmo tempo o item **3.1** (bug relatado pelo marceneiro: sarrafo de 7×150cm ignorado numa faixa livre de 30×270cm) e o item **3.3** (avaliação de troca de algoritmo) do backlog-fonte — mesma entrega, sem duplicar; o item **6.3** do documento-fonte fica **sem objeto** (era condicional a "se 3.1 não resolver": 3.1 e 3.3 resolvem juntos, aqui) | 🟠 BUG · 🟡 LACUNA | 4.16 (back) | motor-engineer | Sonnet | Modelo 8.1–8.6 (invariantes V1–V7, exemplos trabalhados dos itens 3.1 e do critério de comparação); PRD RF-34, risco 6/12 |
| 3.1/3.3 (front) | Integração do bin-packing melhorado (Task 3.1/3.3 (motor)) num **Web Worker do navegador**: estado de UI `calculando → pronto`, sem travar a tela — a passada determinística de hoje (ms) aparece de imediato como estimativa, o resultado da busca (1–2s) substitui quando chega. **Nunca existe estado "sem plano de corte"**. Se o Web Worker não estiver disponível (navegador antigo, falha de carregamento), a mesma função roda no main thread com resultado idêntico, só mais lento | 🟡 LACUNA | 3.1/3.3 (motor) | frontend-engineer (web) | Sonnet | Modelo 8.3 (tabela "Web Worker — o que muda"); PRD RF-34 |
| 3.2 | Exibir o veio da placa na visualização do plano de corte (MDF Loro Freijó não mostra) — confirmar que o dado (`temVeio`) está correto antes de assumir que é só rendering | 🟡 LACUNA | nenhuma | frontend-engineer (web) | Sonnet | Modelo 8; PRD RF-11 |
| 3.4 | Contagem de cortes / passadas de serra no resultado do plano de corte | 🟡 LACUNA | nenhuma | motor-engineer | Sonnet | PRD RF-29 |
| 3.5 (motor) | Fita de borda discriminada por cor no resultado do plano de corte (hoje mostra "29m" sem dizer de qual) | 🔴 BLOQ | nenhuma | motor-engineer | Sonnet | Modelo 11.5; PRD RF-29 |
| 3.5 (front) | Exibir fita discriminada por cor na lista de material / plano de corte | 🔴 BLOQ | 3.5 (motor) | frontend-engineer (web) | Sonnet | PRD RF-29 |
| 3.6 | Cálculo de rolos de fita a comprar, a partir do tamanho de rolo cadastrado no catálogo (campo `produto.especificacao` da fita) — **hoje esse campo não existe**: `lib/produto/tipos.ts:29` só tem `{ unidade: "m" }`. Depende da Task 4.1–4.3/4.5 (front) acrescentar o campo de tamanho de rolo no formulário de catálogo antes que esta task tenha o que ler; nunca hardcode o tamanho | 🟡 LACUNA | 3.5 (motor), 4.1–4.3/4.5 (front) | motor-engineer | Sonnet | Modelo 11.4 (A-12), 11.5; PRD RF-29, 10.4, item 5.3 |
| 3.7 | Quantidade sem m² na lista de material — número inteiro simples | 🔵 UX | nenhuma | motor-engineer | Sonnet | PRD RF-15 |
| 3.8 (back) | Persistência de override de quantidade por item da lista de material (pré-congelamento; valor, categoria e descrição permanecem travados) | 🟡 LACUNA | nenhuma | backend-engineer | Sonnet | PRD RF-15 |
| 3.8 (front) | UI de edição de quantidade na lista de material | 🟡 LACUNA | 3.8 (back) | frontend-engineer (web) | Sonnet | PRD RF-15 |
| 3.10–3.11 (back) | Migration em `elemento_continuo`: coluna `modelo_tampo text` com `CHECK (modelo_tampo in ('simples','engrossado','dobrado'))`, DDL já pronto em `.maestro/tmp/schema-v2.1-delta.sql` §6 (linhas 167-172) — sem ela o modelo de tampo escolhido não sobrevive ao reload. Resolve **junto**, na mesma migration, o gap pré-existente da mesma tabela: coluna `cor text` (tampo/rodapé/tamponamento/fechamento perdem a cor ao reload hoje, achado da Task 13.3d, ver "Gaps de schema registrados" acima). **Pré-requisito das Tasks 3.10–3.11 (motor) e (front)** — elas não têm onde persistir o modelo escolhido sem esta coluna | 🟡 LACUNA | nenhuma | backend-engineer | Sonnet | Modelo-de-Dominio 3.4.1 ("campo explícito e persistido"); `.maestro/tmp/schema-v2.1-delta.sql` §6 (L.167-172) |
| 3.10–3.11 (motor) | Tampo: modelo escolhido **antes** da espessura; espessuras condicionadas ao modelo (simples 15/18/25 · engrossado/dobrado 30/45/60 base 15 · 36/54 base 18); 6 mm nunca; trocar modelo com espessura incompatível **limpa** o campo | 🟠 BUG | 3.10–3.11 (back) | motor-engineer | Sonnet | Modelo 3.4.1 (tabela + 3 exemplos de rejeição) |
| 3.10–3.11 (front) | UI do tampo: seletor de modelo antes de espessura, lista de espessuras filtrada pelo modelo, campo limpo ao trocar modelo incompatível | 🟠 BUG | 3.10–3.11 (motor) | frontend-engineer (web) | Sonnet | Modelo 3.4.1; PRD RF-28 |
| 3.12 | BOM completo dos três modelos de tampo (simples fechado nesta rodada; engrossado/dobrado já existiam) + fita de 35mm cobrindo também 25mm | 🟡 LACUNA | 3.10–3.11 (motor) | motor-engineer | Sonnet | Modelo 3.4.1 (BOM do simples com exemplo trabalhado), 2.1 |
| 3.13 (front) | **`ModuleViewer`** — visualização 3D estática do módulo em edição. Componente novo, pasta própria de componentes. Stack `@react-three/fiber` + `@react-three/drei` + `three`, importado via `next/dynamic({ ssr: false })` com skeleton de loading (mesmo padrão de canvas técnico da Design-System §8: `bg-cinza-50 border-cinza-200`, ícone `Box` do `lucide-react` centralizado em `text-cinza-300`). Câmera **ortográfica**, prop `view: 'isometric' \| 'front' \| 'top' \| 'side'` (default `isometric` ao abrir o modo), **sem `OrbitControls`, sem rotação livre do usuário** — cena estática, troca de ângulo instantânea, sem animação. Props: `width`, `height`, `depth` (mm), `view`, `color?` (hex), `textureUrl?` (WebP). Material: com `textureUrl`, `useTexture` do drei + `texture.colorSpace = THREE.SRGBColorSpace`; sem `textureUrl`, usa `color`; sem nenhum dos dois, cor amadeirada padrão de fallback. **Lança só com cor sólida nesta rodada** — `textureUrl` fica sem alimentação até a Q-14 ser respondida pelo operador (`docs/PRD.md` §7.4), isso **não bloqueia** o fechamento da task, só deixa a prop de textura real incompleta por ora. Iluminação: `ambientLight` + 1 `directionalLight`. Geometria vem da **mesma fonte** que `BoxCanvas` já consome (`BoxModule.largura`/`.altura`/`.profundidade`), `color` derivado de `BoxModule.material.cor` via `corParaHex()` já existente — proibido segundo caminho de derivação de geometria. Posicionado como segundo modo ("3D estático") do painel de visualização do Editor de Item, ao lado de "2D técnico" (default), reaproveitando o `Tabs` underline da Design-System §7.8; controles de ângulo próprios e distintos dos botões Frontal/Traseira/Esquerda/Direita/Explodida do modo 2D | 🟡 LACUNA (RF-38) | nenhuma | frontend-engineer (web) | Sonnet | Modelo 4.1, 11.5 (props e origem de dado); Design-System §9.6 (posicionamento na tela, loading, controles); PRD RF-38, D-33, Q-14 (§7.4 — não bloqueante) |

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
inédita no produto e mexe numa tela já existente (Editor de Item).*

*Nota: item 3.9 (manter item manual/personalizado) já está confirmado como
essencial e funcionando — sem task.*

#### Lote 4 — Cadastros e identidade

*Independente e paralelo ao Lote 0 e aos demais lotes.*

| Task | O que é | Tag | Depende de | Executor | Modelo | Referências |
|---|---|---|---|---|---|---|
| 4.4 | Migration: coluna `codigo` (único por organização) em `produto`, para chamada rápida no orçamento | 🟡 LACUNA | nenhuma | backend-engineer | Sonnet | PRD RF-03, RF-30 |
| 4.1–4.3, 4.5 | Catálogo unificado: card único com seletor de categoria interno (elimina abas chapa/ferragem/LED/acessório/fita), botão genérico "Adicionar item", campos dinâmicos só depois da categoria escolhida, campos universais código/preço/status. Inclui o campo de **tamanho de rolo** na especificação de produtos tipo `fita` (novo campo em `produto.especificacao`, jsonb — sem migration de schema, só tipo/UI). **Pré-requisito da Task 3.6** (motor, Lote 3), que lê este campo para calcular rolos a comprar | 🔵 UX / 🟡 LACUNA | 4.4 | frontend-engineer (web) | Sonnet | PRD RF-30, RF-29, item 5.3; documento-fonte tabela de campos por categoria |
| 4.6–4.7 | Máscara de CNPJ e de telefone (10 ou 11 dígitos) no formulário de perfil | 🟡 LACUNA | nenhuma | frontend-engineer (web) | Haiku | PRD RF-31 |
| 4.8–4.9 (back) | Upload de logo: bucket de Storage + política de RLS + coluna de referência em `organizacao` | 🔴 BLOQ | nenhuma | backend-engineer | Sonnet | PRD RF-02, RF-31, risco 11 |
| 4.8–4.9 (front) | UI de upload de logo substituindo o campo de URL; logo persiste e aparece em todos os lugares que a exibem (perfil, PDF da proposta) | 🔴 BLOQ | 4.8–4.9 (back) | frontend-engineer (web) | Sonnet | PRD RF-17, RF-31 |
| 4.10 | Fallback: sem logo cadastrada, exibe a marca padrão Orça Fácil | 🟡 LACUNA | 4.8–4.9 (front) | frontend-engineer (web) | Haiku | PRD RF-31 |
| 4.11 (back) | Upload de foto de perfil pessoal: bucket de Storage + coluna de referência | 🟡 LACUNA | nenhuma | backend-engineer | Sonnet | PRD RF-31, risco 11 |
| 4.11 (front) | UI de upload de foto de perfil | 🟡 LACUNA | 4.11 (back) | frontend-engineer (web) | Sonnet | PRD RF-31 |
| 4.12–4.13 (back) | Troca de senha com confirmação por e-mail (fluxo do Supabase Auth) | 🔴 BLOQ | nenhuma | backend-engineer | Sonnet | PRD RF-31 |
| 4.12–4.13 (front) | UI da área de segurança dedicada no perfil, com o fluxo de troca de senha; e-mail permanece não editável (identificador da conta, item 4.14 — sem task própria, é constraint desta) | 🔴 BLOQ | 4.12–4.13 (back) | frontend-engineer (web) | Sonnet | PRD RF-31 |
| 4.15 | Excluir conta, disponível no perfil | 🔴 BLOQ · ⛔ Bloqueada (Q-13) | nenhuma | backend-engineer | Opus | PRD RF-31, Q-13 (7.4) |
| 4.16 (back) | Migration: coluna `espessura_serra_padrao_mm numeric` em `organizacao` (default `3`, `0` é valor válido) + atualizar tipos/leitura do perfil. **Pré-requisito da Task 3.1/3.3 (motor)** — o bin-packing melhorado lê este campo como kerf | 🟡 LACUNA | nenhuma | backend-engineer | Sonnet | Modelo 8.2 (A-13, A-14); PRD RF-02, RF-34, risco 12 |
| 4.16 (front) | Campo "Espessura de serra (kerf)" no formulário de `/perfil`, editável, com aviso de retroatividade: mudar o valor altera o plano de corte de todo orçamento **não congelado** (mesma disciplina das alturas de faixa) | 🟡 LACUNA | 4.16 (back) | frontend-engineer (web) | Sonnet | Modelo 8.2; PRD RF-02, RF-34, risco 12 |

**⛔ Task 4.15 bloqueada para execução — Q-13** (`docs/PRD.md` Seção 7.4):
o que "excluir conta" apaga de fato (usuário ou organização inteira, e o
que acontece com orçamentos/catálogo/gabaritos quando o excluído é o único
usuário da org) é decisão do operador — operação irreversível sobre dado
de cliente final (LGPD), não se decide por dedução. As demais tasks deste
Lote não são afetadas.

#### Lote 5 — Limpeza visual

*Independente e paralelo ao Lote 0 e aos demais lotes.* Toda task aqui é
verificada pelo `ux-auditor` contra o checklist de 12 itens da Seção 15.4
de `docs/Design-System.md`.

| Task | O que é | Tag | Depende de | Executor | Modelo | Impacto Visual | Referências |
|---|---|---|---|---|---|---|---|
| 5.1–5.4 | Biblioteca e Editor de Módulo migram para o shell/Design System v3 (sidebar+topbar presentes nas duas telas), remoção dos textos clicáveis herdados da versão antiga (editor, calculadora, biblioteca, catálogo) | 🔵 UX | nenhuma | frontend-engineer (web) | Sonnet | **Completo** (retrofit de duas telas inteiras) | Design-System §6, §15.4; PRD RF-35 |
| 5.5–5.6 | Remover o card "validação tier 1 + tier 2" e varrer a UI por outros termos de especificação vazados (fora do rename "Preset"→"Módulo", já coberto pela Task 2.13) | 🔵 UX | nenhuma | frontend-engineer (web) | Haiku | **Leve** (ajuste pontual de texto) | Design-System §15.3; PRD RF-36 |
| 5.7–5.9 | Dashboard/orçamentos recentes: remover prazo de entrega, adicionar valor final do projeto e custo | 🔵 UX / 🟡 LACUNA | nenhuma | frontend-engineer (web) | Sonnet | **Leve** (ajuste de card existente) | Modelo 11.5, 5.5; PRD RF-33 |

*Item 5.10 (status de esteira) — **sem task agendada.** Aguardando decisão
do operador sobre Q-6 (campo select manual vs. workflow com transições
automáticas — `docs/PRD.md` Seção 7.4, `docs/Modelo-de-Dominio.md` Seção
11.3). Não escrever tipo, enum ou coluna antes disso.*

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
| Lote 0 — Fundação de dados | Ambiente/Parede como entidade real (N×N), alturas por parede, coluna `congelado_em` da proposta | Bloqueia Lote 1 e 2 | 6 | ⏱️ Planejado |
| Lote 1 — Confiança e estado | Cache, URL de aba, paridade financeiro↔proposta (leitura do congelamento passou para 0.7b) | Depende do Lote 0; bloqueia Lote 2 | 4 | ⏱️ Planejado |
| Lote 2 — Lacunas funcionais | Criação de módulo, promoção org→global, elementos de parede, posicionamento por vão, elevação com módulos, agrupamento comercial | Depende do Lote 0 **e** do Lote 1 fecharem, em sequência | 20 | ⏱️ Planejado |
| Lote 3 — Precisão do motor | Bin-packing melhorado (kerf + guilhotina + meta-heurística), `ModuleViewer`, contagem de cortes, fita por cor, tampo 3 modelos (+ migration `modelo_tampo`/`cor`) | Paralelo, independente **como regra geral** — exceções: Task 3.1/3.3 (motor) depende de 4.16 (back), Lote 4; Task 3.6 (motor) depende de 4.1–4.3/4.5 (front), Lote 4 | 15 | ⏱️ Planejado (exceções: 3.1/3.3 (motor) aguarda 4.16; 3.6 (motor) aguarda 4.1–4.3/4.5) |
| Lote 4 — Cadastros e identidade | Catálogo unificado, upload de logo/foto, segurança de conta, kerf do perfil | Paralelo, independente | 13 | ⏱️ Planejado (1 ⛔ Q-13) |
| Lote 5 — Limpeza visual | Shell v3 em Biblioteca/Editor, vocabulário, dashboard | Paralelo, independente | 3 | ⏱️ Planejado |
| **Total** | | | **61** | |

> **Estágio OR-Tools removido em 2026-07-31.** O "Estágio OR-Tools — Plano
> de corte assíncrono" (tasks OR.1–OR.5, 5 tasks) foi **cancelado por
> completo** junto com a direção de arquitetura que o motivava — não consta
> mais deste resumo nem do documento. O RF-34 continua existindo, agora como
> as Tasks 3.1/3.3 (motor) e 3.1/3.3 (front) do Lote 3, sem bloqueio.

**Distribuição por executor**: frontend-engineer 34 · backend-engineer 16 ·
motor-engineer 11 · integration-engineer 0.

**Distribuição por modelo recomendado**: Sonnet 55 · Haiku 5 (1.8, 2.13,
4.6–4.7, 4.10, 5.5–5.6 — tasks mecânicas de texto/máscara/relabel) · Opus 1
(4.15 — exclusão de conta, irreversível e sensível a LGPD).

**Bloqueadas por decisão pendente do operador**: 1 task — 4.15 (Q-13).
Nenhuma outra task deste backlog está bloqueada: a Q-12 perdeu objeto (a
troca de algoritmo do RF-34 já é a correção do item 3.1) e as Q-8 a Q-11
foram extintas junto com o descarte do OR-Tools.

**Registradas sem task agendada (placeholder, aguardando decisão)**: item
5.10 do backlog-fonte (status de esteira — Q-6).

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
> própria nesta rodada de correção. Task sem RF citado no PRD é escopo
> inventado; RF sem task é escopo perdido — nenhum dos dois caso ocorreu
> nesta rodada.

| RF | Descrição resumida | Tasks |
|---|---|---|
| RF-04 (emenda) | Biblioteca esconde o módulo global cuja origem é gabarito promovido da própria organização | 2.1 (dedup), 2.1 (promoção) |
| RF-19 | Ambiente/Parede navegáveis, N×N | 0.1–0.3, 2.3–2.6 |
| RF-20 | Alturas herdadas com override por parede | 0.4, 2.3–2.6 (alturas) |
| RF-21 | Posicionamento por vão até o vizinho | 2.18 (motor), 2.18 (front) |
| RF-22 | Congelamento real da proposta | 0.7a, 0.7b, 1.5–1.6 |
| RF-23 | Estado de aplicação confiável (cache, URL, render, link) | 1.1–1.3, 1.8 |
| RF-24 | Criar módulo do zero | 2.1 |
| RF-25 | Elementos de parede completos (pedra, edição, referência, preset) | 2.7, 2.8–2.11 (back/front), 2.12 (back/front) |
| RF-26 | Inserção de módulo com decisão guiada (cascata, faixas, torre, rodapé) | 2.14–2.17, 2.19–2.23 |
| RF-27 | Elevação desenha módulos + cotas | 2.24–2.26, 2.27 |
| RF-28 | Tampo com três modelos | 3.10–3.11 (back/motor/front) |
| RF-29 | Saída do plano de corte completa (chapas, cortes, fita por cor, rolos) | 1.7, 3.2, 3.4, 3.5 (motor/front), 3.6 |
| RF-30 | Catálogo unificado | 4.1–4.3/4.5, 4.4 |
| RF-31 | Identidade e conta (logo, foto, máscaras, segurança, exclusão) | 4.6–4.7, 4.8–4.9 (back/front), 4.10, 4.11 (back/front), 4.12–4.13 (back/front), 4.15 |
| RF-32 | Editar dados do cliente | 0.5a, 0.5b |
| RF-33 | Dashboard com valor e custo (status de esteira fica de fora — Q-6) | 5.7–5.9 |
| RF-34 | Plano de corte com bin-packing melhorado (guilhotina + retângulos livres + meta-heurística, kerf, Web Worker) — **substitui o RF-34 antigo (OR-Tools, cancelado)** | 3.1/3.3 (motor), 3.1/3.3 (front), 4.16 (back), 4.16 (front) |
| RF-35 | Shell consistente (Biblioteca, Editor) | 5.1–5.4 |
| RF-36 | Vocabulário de produto na interface | 2.13, 5.5–5.6 |
| RF-37 | Dois agrupamentos, duas afordâncias | 2.28–2.30 |
| RF-38 | `ModuleViewer` — visualização 3D estática do módulo em edição | 3.13 (front) |

**Lacunas**: nenhuma — todo RF-19 a RF-38 tem ao menos uma task (mais RF-04,
incluído por exceção — ver nota acima). Também sem task inventada fora de
RF: mapeamento item a item, sem "respectivamente" —

- Item 1.5–1.6 → RF-22 (já refletido na linha RF-22 da tabela acima);
- Item 1.7 → RF-29 (já refletido na linha RF-29 da tabela acima — deixa de
  ficar solto, é a origem citada no PRD para este item);
- Itens 3.7 e 3.8 → RF-15 (Fase D, emenda de RF pré-existente — quantidade
  sem m² e edição de quantidade na lista de material);
- Item 3.12 → RF-28 (já refletido na linha RF-28 da tabela acima — BOM
  completo dos três modelos de tampo);
- Itens 2.19–2.23 → RF-05 (Fase D, emenda de RF pré-existente — editar
  módulo na mesma tela da inserção; já refletido também na linha RF-26
  acima, que cita a mesma task);
- Item 2.31 → RF-16 (Fase D, emenda — cancelar/reverter divisão de linha de
  proposta);
- Item 2.32 → RF-16 (Fase D, emenda — subdividir dentro do ambiente mantendo
  o vínculo).

*Correção da reauditoria de 2026-08-01: os itens 2.19–2.23, 2.31 e 2.32 já
existiam como task (cada uma cita o RF na própria linha da tabela do lote),
mas não apareciam nem na tabela acima nem nesta lista de exceções — a
afirmação anterior de "nenhuma lacuna" contava só quatro das sete exceções
reais. Os três bullets acima fecham a contagem; nenhum escopo novo foi
criado, só a rastreabilidade corrigida.*

Todos os oito são bugs e refinamentos de requisito já existente, não
requisito novo à parte. Os itens 3.1 e 3.3 mapeiam para o RF-34 novo (Tasks
3.1/3.3), citados no próprio ID da task para rastreabilidade com o
documento-fonte.

Pronto para handoff ao `spec-auditor`.
