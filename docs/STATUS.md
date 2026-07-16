# Status Atual, Decisões, Pendências e Próximos Passos

> Atualizado em 2026-07-16. Este arquivo é o ponto de partida de qualquer sessão
> nova — leia antes de assumir o que já existe. Complementa `docs/PRD-PIPELINE.md`
> (visão de produto) com o estado real do código.

## 1. Onde estamos agora (resumo de uma linha)

O editor de módulo (`/modulo`) foi redesenhado a partir de um desenho do
usuário: cards colapsáveis em sequência (Caixa → Divisões → Portas → Gavetas
→ Puxador — accordion, cada um com botão "Salvar" que avança pro próximo) que
agem sobre seleção de vãos/divisórias/portas/gavetas no canvas. Portas são uma
entidade independente da árvore de vãos (cobrem 1+ vãos selecionados — a opção
de cobrir a caixa inteira foi removida, só existe 1 jeito de inserir). Nova
página `/biblioteca` administra categorias e os módulos cadastrados, com
caminho de volta pro editor (`/modulo?preset=ID`) que agora ATUALIZA o preset
original em vez de duplicar. O motor V1 segue coexistindo (não foi tocado) —
ver mapa de dependências na seção 7. Próximo passo combinado com o usuário:
voltar pra como os módulos aparecem na tela principal (produção).

## 2. O que está construído e funcionando

### Motor de cálculo
- Motor de templates V1 (`lib/engine/*`): parser de fórmulas, explosão de peças,
  consolidação, custos/margem. 17 testes.
- Motor de caixa V3 (`lib/engine/box/*`): `types.ts` (modelo de dados),
  `explode.ts` (caixa+vãos → peças), `tree.ts` (operações puras na árvore +
  layout geométrico), `cutting.ts` (plano de corte, bin packing), `migrate.ts`
  (migração de dados antigos salvos no navegador). 20+9+7 testes.
- `lib/orcamento.ts`: unifica os dois motores num único array
  `ModuloOrcamento[]` via discriminated union (`origem: "template" | "custom_box"`)
  com funções de acesso puras (`idDoItem`, `larguraDoItem`, etc.) — elimina a
  duplicação de lista que existia antes ("Frankenstein").

### Laboratório (`/modulo`) — redesenhado nesta sessão
- **Accordion de 5 sessões** (Caixa → Divisões → Portas → Gavetas → Puxador,
  `SecaoHeader.tsx`): só uma aberta por vez; cada card tem um botão "Salvar"
  que colapsa a sessão atual e abre a próxima (ordem fixa). Clicar no título
  de uma sessão colapsada ("editar") reabre ela pra voltar e ajustar.
- **4 modos de seleção no canvas** (`BoxCanvas`, prop `modoSelecao`):
  "Selecionar vãos" (na sessão Vãos, 2 estados — desativado troca a seleção
  pra 1 vão só, ativado "múltiplos" soma/remove, usado por Divisões/Portas/
  Gavetas pra aplicar em vários de uma vez), "Selecionar divisões" (dentro da
  sessão Divisões — seleciona uma linha divisória pra excluir, funde os 2
  vãos que ela separava), "Selecionar portas" (dentro da sessão Portas —
  seleciona um grupo de porta existente, carrega a config no formulário pra
  editar/excluir) e "Selecionar gaveta" (dentro da sessão Gavetas — mesma
  ideia, mas seleciona o vão com o conjunto de gavetas).
- **Portas**: entidade independente da árvore (`BoxModule.portas:
  GrupoPortas[]`) — só uma forma de inserir (selecionar vão(s) e aplicar; a
  opção de aplicar na caixa inteira ignorando a divisão foi removida, criava
  ambiguidade com portas em vãos internos) e uma de editar/excluir
  (selecionar o grupo no desenho). Tipo abrir (basculante pia/aéreo, direita,
  esquerda) ou correr (direita/esquerda, ferragem `kit_porta_correr`).
  Sentido é único por grupo, mas grupos com 2+ portas direita/esquerda saem
  espelhados no desenho.
- **Divisões**: tipo vertical/horizontal, quantidade, recuo frontal por grupo
  (`BayNode.recuoFrontal`), posição centralizado/direita/esquerda com recuo
  lateral (divisão assimétrica).
- Embaixo do canvas: "Salvar este módulo" (cria ou atualiza o preset, ver
  Biblioteca), "Limpar" (esvazia divisões/portas/gavetas, MANTÉM a Caixa) e
  "Resetar" (volta tudo ao estado inicial, inclusive a Caixa, com
  confirmação).
- **Fundo é global e do tamanho da caixa** (`BoxModule.temFundo: boolean`) —
  1 peça só de largura×altura da caixa (não do vão) até 1800mm de largura;
  acima disso, cada divisão VERTICAL que atravessa a altura INTEIRA da caixa
  soma mais uma tira igual (`contarColunasVerticais`/`gerarFundoGlobal` em
  `explode.ts`). Bugfix registrado: uma divisão vertical aninhada dentro de
  uma divisão horizontal (não atravessa a altura toda) NÃO conta — só soma
  através de splits verticais encadeados, qualquer horizontal no caminho
  vira 1 coluna e não propaga a fragmentação interna.
- **Puxador** (`BoxModule.puxador: "haste" | "perfil" | "sem_puxador"`) vale
  pra toda porta e frente de gaveta externa (gaveta interna/guarda-roupa
  nunca tem puxador visível, independente da config): "haste" gera 1
  ferragem `puxador` (un.) por frente; "perfil" gera `perfil_puxador_m`
  (metros, comprimento da borda onde o puxador ficaria); "sem_puxador" não
  gera ferragem nem desenho. Sentido "direita"/"esquerda" com 2+ portas no
  mesmo grupo sai espelhado no desenho (painéis alternam o sentido oposto —
  não muda ferragem/peças, só a posição do puxador).
- **Gavetas no canvas do laboratório** agora têm representação visual (linhas
  divisórias + marca/perfil de puxador, igual às portas) em vez de só o
  rótulo de texto — `desenharGavetaVisual` reaproveitada entre o modo
  comercial e o modo laboratório em `BoxCanvas.tsx`.
- `lib/engine/box/migrate.ts` migra presets salvos no formato antigo
  (localStorage) pro novo modelo, inclusive extraindo portas presas a vãos
  pro novo `box.portas` e mapeando sentidos antigos.
- Custo ao vivo, lista técnica de peças, plano de corte visual (Canvas 2D, escala
  1:10, uma chapa por grupo cor×espessura).
- "Salvar este módulo": se veio da Biblioteca (`/modulo?preset=ID`) ou já
  salvou uma vez nesta sessão, **atualiza** o preset original
  (`atualizarPreset`) em vez de duplicar; senão cria um novo e passa a
  rastreá-lo (próximos saves na mesma sessão também atualizam).

### Biblioteca de módulos (`/biblioteca`) — nova nesta sessão
Administra o que saiu do card removido do `/modulo`: lista/filtra os presets
por categoria e tipo (tipo é só filtro — Aéreo/Inferior/Torre continuam fixos
no motor), renomeia, troca categoria, exclui, e "Abrir no editor" reabre o
preset em `/modulo?preset=ID` pra edição in-place. Categorias: as 8 padrão
são fixas; extras criadas pelo usuário podem ser renomeadas/removidas
(`lib/categorias.ts` — `renomearCategoria`/`removerCategoria`, só afetam
extras; renomear propaga pros presets que usavam o nome antigo pra não
ficarem órfãos; remover é bloqueado se algum preset ainda estiver na
categoria).

### Produção (página principal `/`)
- Assistente **Ambiente → Tipo → Modelo** (`NovoModuloWizard`) lê presets salvos
  dinamicamente — único caminho de entrada para novos módulos-caixa.
- `BoxModuloCard`: overrides de instância sem alterar o gabarito — dimensões
  (L/H/P), cor/espessura interna, tamponamento por lado (`TamponamentoConfig`,
  4 mini-formulários independentes), override rápido de cor/espessura das portas
  e de "tem fundo", tudo atrás de um botão colapsável **"Outras configurações"**.
- `BoxCanvas`: mesmo componente usado no laboratório e na produção, com um modo
  `comercial` (visual limpo — linhas finas + marcas de puxador, sem bordas
  técnicas/rótulos) para os cards da produção, vs. o modo laboratório (bordas +
  rótulo + clique para selecionar vão).
- Card colapsável: botão "Salvar" reduz para `ResumoModulo` (preview + dados-chave);
  "Editar" reabre. Aplica-se aos dois tipos de módulo.
- Plano de corte do **orçamento inteiro** (todos os módulos agregados), além do
  plano por módulo que já existia no laboratório.
- Categorias (`lib/categorias.ts`): 8 categorias padrão + criação inline no
  laboratório ao salvar preset (sem tela de CRUD dedicada — decisão consciente de
  simplificação).

### Correções de bugs reais (não cosméticos) já resolvidas
1. **Travessa do módulo `inferior`**: estava sendo tratada como peça "de pé" (70mm
   de profundidade viravam altura visível), comendo 55mm do vão útil de
   portas/gavetas. Corrigido no motor (`explode.ts`) numa sessão anterior, mas o
   fix **não tinha sido replicado no `BoxCanvas.tsx`** apesar da mensagem do commit
   afirmar isso — bug persistiu visualmente até esta sessão. Corrigido agora nos
   dois lugares e verificado ao vivo (o vão selecionado no laboratório preenche
   quase toda a caixa, sem sobra de 70mm no topo).
2. Prateleiras/fundo não podiam coexistir com portas no mesmo vão sem dividir a
   caixa — corrigido tornando `frente`/`prateleiras`/`fundo` atributos
   independentes de `BayContent`.
3. Tamponamento de instância era uma config única para todos os lados ativos —
   corrigido para 4 configs independentes (um lado em sarrafo/Madeirado, outro
   inteiriço/Branco, por exemplo).
4. Overrides rápidos de portas e fundo direto no card (sem reabrir o editor).
5. Preview do Canvas não tinha feedback de cor dinâmico — corrigido (recolore ao
   vivo, inclusive tiras de tamponamento por lado).
6. Card sem opção de colapsar/organizar a tela quando há muitos módulos —
   resolvido com Salvar/Editar.

## 3. Decisões tomadas (não reabrir sem motivo novo)

- **Tamponamento soma à largura de instalação** (não altera a carcaça pronta) —
  decisão explícita do usuário, resposta "Soma à largura (Recomendado)".
- **Categoria única por preset** (não multi-select) — simplificação consciente;
  duplicar o preset resolve o caso de precisar em duas categorias.
- **Motor de caixa não substitui o motor de templates** (por ora) — convivem via
  `ModuloOrcamento`. Não há decisão de deprecar o motor de templates.
- **O laboratório é a fonte da verdade da engenharia** — a produção só faz
  overrides comerciais de instância, nunca edita a estrutura interna de vãos.

## 4. Lacuna importante vs. o PRD original

O orçamento montado na tela principal **não é persistido em banco** — é
`useState` puro em `app/page.tsx`, sem chamada a `/api/orcamentos`. Só os
gabaritos/presets do laboratório são salvos (em `localStorage`, não no Prisma).
Recarregar a página perde o orçamento em edição. O backend de auth/clientes/
orçamentos (Prisma + rotas `/api/*`) existe mas não está conectado a este fluxo.
Isso não bloqueia o trabalho de UX/engenharia em andamento, mas é uma pendência
real de RF-002/RF-009 do PRD original quando chegar a hora.

## 5. Pendência em aberto agora (prioridade atual)

A tela de configuração do módulo (`/modulo`) foi redesenhada nesta sessão —
ver seção 2. **Combinado com o usuário**: agora voltar para como os módulos
aparecem/são organizados na tela principal (produção) — o `BoxModuloCard`
ainda usa o layout antigo de "Outras configurações" colapsável, que não foi
revisado neste desenho. Também ficou pendente decidir **outra forma de
chamar módulos existentes para edição** (o card de presets saiu do
`/modulo`; ainda não há UI pra isso em lugar nenhum).

## 6. Próximos passos

1. Redesenhar como os módulos aparecem/são organizados na tela principal
   (produção) — inclui decidir a nova forma de chamar/editar módulos
   existentes que saiu do `/modulo`.
2. Etapa 4 da Fase 3, ainda pendente: organizador linear (mover módulo
   esquerda/direita na parede) no `LayoutVisualizer`.
3. Registrado como lacuna, sem prazo definido: persistência real do
   orçamento (ligar a tela principal a `/api/orcamentos` via Prisma).
4. Decidir se/quando eliminar o motor V1 (ver mapa de dependências na
   seção 7) — usuário optou por não eliminar nesta sessão, só mapear.

## 7. Mapa de dependências do motor V1 (levantado, não executado)

O usuário pediu para eliminar o motor de templates (V1) e ficar só com o
motor de caixa (V3), mas decidiu, nesta sessão, **só mapear as dependências
sem apagar nada** — a remoção fica para uma sessão futura dedicada a isso.

| Arquivo | Uso do V1 |
|---|---|
| `lib/engine/engine.ts`, `templates.ts`, `evaluator.ts` | Motor de fórmulas em si |
| `lib/templateOverrides.ts` | Overrides de engenharia por template (V2-4) |
| `lib/orcamento.ts` (`calcularOrcamentoMisto`) | Mescla V1+V3 num só resultado (`ModuloOrcamento` discriminated union) |
| `app/api/templates/route.ts`, `app/api/calcular/route.ts` | Rotas servindo templates/cálculo V1 |
| `app/configuracoes/engenharia/page.tsx` | Tela inteira de edição de fórmulas/templates |
| `app/page.tsx` | `NovoModuloWizard` oferece templates; cards de módulo renderizam/editam módulos de template; múltiplas ramificações `origem === "template"` |
| `prisma/seed.ts` | Semeia dados de template no banco |
| `lib/engine/engine.test.ts` | 17 testes do motor V1 |

Quando for eliminado: o branch `"template"` do `ModuloOrcamento` some, e toda
a tabela acima pode ser apagada de uma vez.
