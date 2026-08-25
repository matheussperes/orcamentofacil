# Screen Composition — orcamentofacil

> Task R.2a. Preenche o vão entre `docs/Mapa-de-Telas.md` (prosa) e
> `docs/Design-System.md` (tokens): como cada tela se organiza, o que
> domina, o que recua, o que foi podado. Ancorado no código real
> (`app/(app)/orcamento/`, `app/modulo/`, `app/(app)/catalogo/`,
> `app/(app)/biblioteca/`, `app/proposta/[id]/pdf/`), não no mockup
> original — o app divergiu do Mapa-de-Telas em pontos que só a leitura do
> componente revela (ver Poda de cada tela). Nenhum token novo: tudo abaixo
> referencia valores já definidos em `docs/Design-System.md`.

---

### Orçamento — /orcamento/[id]

**Nível**: release
**Referência nomeada**: Stripe Dashboard — os 6 campos financeiros da aba
Financeiro e os valores da aba Proposta seguem a mesma regra (peso/tamanho
tipográfico resolve importância, nunca caixa colorida); Linear — o padrão
de foco/estado ativo permanente do seletor de ambiente/parede (não é hover,
é seleção persistente, `SeletorLista`).
**Densidade**: mista, declarada por aba (ver tabela "Por aba" abaixo) —
Ambientes/Financeiro/Proposta são espaçosas (decisão), Corte & Material é
densa (consulta/comparação, mesmo padrão de Catálogo/Biblioteca).
**Padrão de tela**: painel de trabalho (shell com 4 abas, `OrcamentoAbas.tsx`)

**Grade**
- Shell: sidebar 264px + topbar 72px + conteúdo (`bg-cinza-50`, `p-xl`,
  largura de referência 1536px) — Design System §6, sem alteração.
- Cabeçalho de contexto (cliente + status + etapa) em linha única,
  `flex flex-wrap items-center gap-sm`, `mb-md`.
- Corpo de cada aba: coluna única de `section`/`Card` empilhados
  (`gap-lg`, 24px), exceto Ambientes, que usa `grid grid-cols-1 lg:grid-cols-2
  gap-lg` para os pares Elevação+Conjunto e Parede+Faixas.
- Breakpoint: abaixo de `md` (768px), grids de 2 colunas da aba Ambientes
  colapsam para 1 coluna (já implementado); sidebar vira drawer (§6).

**Regiões** — região sem propósito declarado não existe
| Região | Propósito | O que vive aqui | O que NUNCA vive aqui |
|---|---|---|---|
| Cabeçalho de contexto | Identificar de qual orçamento/cliente se trata e em que etapa da esteira ele está | Nome do cliente + editar, `StatusOrcamentoBadge`, `SeletorEtapaEsteira` | Dado financeiro, dado técnico de item |
| Tabs (Ambientes/Corte & Material/Financeiro/Proposta) | Trocar de contexto de trabalho sem perder estado (`forceMount`) | 4 `TabsTrigger` com ícone 16px + label, estilo underline §7.8 | Ação de escrita (nenhum tab é um botão de salvar) |
| Conteúdo da aba ativa | Superfície de trabalho daquela etapa | Ver tabela "Por aba" | Conteúdo de outra aba (cada aba só mostra o que é dela) |

**Por aba** (Regiões/Hierarquia/Poda específicas — o restante do template
vale para as 4)
| Aba | Domina | Apoia | Recua | Poda desta aba |
|---|---|---|---|---|
| Ambientes | Elevação da parede (`ElevacaoParede`, feedback visual central da tarefa) | Campos de medida da parede/faixas, tabela "Blocos e itens" | Legendas de faixa, meta-info de conjunto | Dados de custo/preço não aparecem aqui — vivem só em Financeiro; detalhe de divisão/porta/gaveta de um item não aparece aqui — vive só no Editor de Item |
| Corte & Material | Plano de corte (`PlanoCorteCanvas` + `Progress` de aproveitamento) | Lista de material/pré-pedido (tabela) | Nota de heurística, legenda "escala 1:10" | Nenhum campo de posicionamento de item (isso é Ambientes); nenhum dado de precificação/margem (isso é Financeiro) |
| Financeiro | Card "Preço final" (`destaque`, `bg-accent-subtle`, `text-accent`) | Demais 5 campos do resumo (custo material, montagem, frete, lucro, margem) | Seletor de modo de precificação/montagem (override), frete editável | Nenhum detalhe de peça/chapa (isso é Corte & Material); nenhuma linha de proposta (isso é Proposta) |
| Proposta | Valor rateado de cada `LinhaPropostaCard` (`text-valor-destaque` tabular-nums) | Descrição/render do conjunto por linha, ações dividir/mesclar | Tags comerciais, alerta de rebalanceamento | Custo interno de material/montagem/frete nunca aparece aqui (D-25) — só o valor final rateado |

**Ordem de leitura**: 1º cabeçalho de contexto (de qual orçamento se
trata) → 2º aba ativa (qual etapa) → 3º elemento que domina daquela aba
(ver tabela acima).
**Ação primária**: uma por aba, nunca uma ação de orçamento inteiro
flutuando sobre as 4 — "Salvar alterações" (Ambientes/Corte&Material/
Financeiro) ou "Gerar proposta" (Proposta), sempre no rodapé da própria
aba, nunca na topbar (a topbar desta rota só carrega breadcrumb).
**Poda**: nenhuma aba duplica dado de outra (tabela acima); o mini-plano-de-
corte "persistente em faixa lateral" cogitado no Mapa-de-Telas §3.6 foi
podado — cada dado vive só na sua aba, evita um 5º painel competindo com as
4 abas por atenção.
**Agrupamento**: cada `section`/`Card` agrupa uma única responsabilidade
(1 card = 1 pergunta respondida: "qual a parede?", "quanto sobrou de
chapa?", "qual o lucro?") — nunca duas perguntas dentro do mesmo card.
**Eixos de alinhamento**: cabeçalho de contexto = 1 eixo (itens em linha,
`items-center`); grids de 2 colunas de Ambientes = 2 eixos independentes
(um por card); tabelas (Corte & Material, "Blocos e itens") = 2 eixos
(rótulo à esquerda, número tabular à direita).
**Vazio e erro**: parede sem itens posicionados, plano de corte sem chapas
calculadas, linhas de proposta antes de "Adicionar linha" — os três já
listados nominalmente em Design-System §8, mesmo tratamento (ícone 32px
`cinza-300` + título + descrição + CTA). Erro: `Alert` variante erro
substitui a aba inteira quando o motor não calcula (Financeiro/Corte &
Material) — nunca um card de erro isolado entre cards funcionando.
**Assinatura**: indicador de item ativo da sidebar (traço de cota em vez de
barra sólida, §0.2) e divisor sob os `text-titulo-secao` de cada `section`
(hoje só `mb-3`/sem borda — trocar por traço de cota reforça a tese em
toda a tela, não só no canvas).

---

### Editor de Item — /orcamento/[id]/item/[itemId]

**Nível**: release
**Referência nomeada**: Linear — foco de uma única etapa por vez (só um
card do accordion "aberto", os demais recuam a `text-corpo`/`cinza-600`,
nunca dois cards competindo pelo mesmo peso); Stripe Dashboard — tabelas
de "Custo ao vivo"/"Peças" com números `tabular-nums` alinhados à direita,
hierarquia por peso, não por caixa.
**Densidade**: espaçosa na coluna esquerda (decisão — accordion em etapas,
`p-4`, uma etapa aberta por vez) / densa na coluna direita (revisão
técnica — canvas + 2 tabelas compactas, `px-md py-sm` por linha).
**Padrão de tela**: formulário em etapas

**Grade**
- 2 colunas: `grid grid-cols-1 lg:grid-cols-2 gap-xl` (24px, token da
  Seção 4) — **substitui** `.legado-grid` (CSS legado, `1.3fr 1fr` com
  gutter fixo de 20px fora da escala; Design-System §16.4 já manda essa
  classe sair de uso nesta árvore de componentes).
- Proporção das colunas: **1fr / 1fr** (não 1.3fr/1fr) — a dominância da
  esquerda (ver Hierarquia) é resolvida por peso/densidade, não por dar
  mais largura a ela; dar mais largura também à direita evitaria que o
  plano de corte/tabela de peças fique espremido quando migrar para lá
  (ver Poda).
- O que muda em `md` (768px): 2 colunas → 1 coluna, ordem no DOM
  preservada (esquerda antes de direita) — decisão só muda em `lg`
  (1024px), não em `md`, porque a coluna direita precisa de espaço mínimo
  para o canvas 2D não distorcer.

**Regiões** — região sem propósito declarado não existe
| Região | Propósito | O que vive aqui | O que NUNCA vive aqui |
|---|---|---|---|
| Stepper (topo, coluna esquerda) | Mostrar em que etapa da configuração o usuário está | `Stepper` (§16.3), 5 passos (box) ou N passos (placa) | Ação de salvar/avançar (o Stepper é só leitura) |
| Accordion de decisão (coluna esquerda) | Onde o usuário CONFIGURA o item, uma etapa de cada vez | `CaixaCard`/`DivisoesCard`/`PortasCard`/`GavetasCard`/`PuxadorCard` (ou seções de Placa) | Leitura passiva (plano de corte, custo, peças — isso é revisão, não decisão, vai para a direita) |
| Visualização (coluna direita, topo) | Conferir visualmente o que a coluna esquerda está configurando | `Tabs` "2D técnico"/"3D estático" sobre `BoxCanvas`/`ModuleViewer`, ou `PlacaVisual` | Campo editável de configuração (a visualização é read-only + seleção de vão, nunca formulário) |
| Custo ao vivo (coluna direita) | Responder "quanto custa isso agora?" | KPI "Preço final"/"Custo direto" + tabela de insumos | Detalhe de peça física (isso é a região seguinte) |
| Peças (lista técnica, coluna direita) | Responder "quais peças físicas saem disso?" | Tabela peça/material/qtd/dimensão | Custo (já respondido acima) |
| Plano de corte | Responder "como essas peças cabem na chapa?" | `PlanoCorteCanvas` por grupo cor/espessura | — |

**Hierarquia — três níveis, cada um com o mecanismo**
1. DOMINA — a etapa aberta do accordion (coluna esquerda) — mecanismo: é o
   único elemento da tela inteira em `text-titulo-card` (16px/600) dentro
   de um card com borda + `p-4`; todo o resto da coluna esquerda (etapas
   já preenchidas) recua para `text-corpo font-medium text-cinza-600` sem
   borda de destaque (§16.2) — a coluna esquerda nunca tem duas etapas
   competindo, a direita nunca ganha esse recurso porque seus 4 blocos
   ficam sempre visíveis ao mesmo tempo.
2. APOIA — visualização 2D/3D e "Custo ao vivo" (coluna direita, topo) —
   mecanismo: `text-titulo-secao` (20px/600, um degrau abaixo do título de
   etapa ativa em uso relativo — a etapa ativa vence por ser a única coisa
   "aberta" na tela, não por tamanho de fonte) + KPI compacto (`p-3`, não
   `p-lg`) para não competir em área com o accordion.
3. RECUA — "Peças" e "Plano de corte" (coluna direita, abaixo) — mecanismo:
   tabela densa `text-corpo-pequeno`, sem KPI destacado, `shadow-xs` igual
   aos demais cards (nenhuma elevação extra que puxe o olho).

> Cor não é mecanismo de hierarquia aqui: o único uso de cor como destaque
> é semântico (`accent` no KPI "Preço final", porque é dinheiro em
> destaque, não porque precisa "chamar atenção" genericamente).

**Ordem de leitura**: 1º etapa aberta do accordion (o que estou decidindo
agora) → 2º visualização (conferir o efeito da decisão) → 3º custo ao vivo
(o impacto financeiro da decisão).
**Ação primária**: "Salvar" — rodapé da coluna direita, único botão
`primary` da tela; corrige o achado do Design-System §16.1 item 3 ("Salvar"
duplicado): dentro do accordion, o botão de avanço de etapa passa a se
chamar **"Avançar"** (`variant="outline"`, `ChevronRight`), nunca "Salvar"
— "Salvar" fica exclusivo do botão que persiste no banco.
**Poda**:
- **Plano de corte sai da coluna esquerda e vai para a coluna direita.**
  Hoje (`EditorItemNucleo.tsx` linha ~745) ele está sob o accordion, na
  coluna de decisão — divergência do próprio Mapa-de-Telas §3.7 ("Custo ao
  vivo + peças + mini plano de corte do item (painel direito)"). É leitura
  técnica, não decisão: pertence à mesma família de "Custo ao vivo"/"Peças",
  não ao fluxo Caixa→Divisões→Portas→Gavetas→Puxador.
- Todo `<div className="card">`/`<button className="primary|ghost|danger">`/
  `.acoes` (CSS legado) sai desta árvore — vira `Card`/`Button` shadcn
  (correção já mandatada em Design-System §16.4; a Composição só confirma
  que a região onde cada um mora não muda, só o token).
- Detalhe de material por categoria (Estrutura/Frentes/Fundo/Costas,
  Design-System §9.5) não ganha painel dedicado nesta leva — cada card do
  accordion mantém seu próprio seletor de cor; consolidar é RF novo, fora
  do escopo desta composição (que reorganiza o existente, não adiciona).
**Agrupamento**: accordion = uma etapa por card, nunca duas etapas no
mesmo card; coluna direita = um card por pergunta ("como fica visualmente"
/ "quanto custa" / "quais peças" / "como corta"), mesmo critério do
Orçamento.
**Eixos de alinhamento**: coluna esquerda = 1 eixo (rótulo à esquerda,
campo ao lado, grid `grid-cols-2 gap-md sm:grid-cols-3` dentro de cada
card); coluna direita = 2 eixos nas tabelas (item à esquerda, valor
`tabular-nums` à direita), 1 eixo no KPI de custo.
**Vazio e erro**: "Nenhuma peça gerada ainda" (plano de corte antes de
qualquer configuração) já é um dos vazios nominalmente listados em
Design-System §8 ("plano de corte sem chapas ainda calculadas") — mesmo
tratamento ali definido (ícone+título+descrição), não o texto solto
`className="muted"` que existe hoje. Erro de salvar: `Alert` variante erro
abaixo dos botões da coluna direita (já correto).
**Assinatura**: a régua com ticks + seta de sentido de veio (§9.2–9.4) já
são a assinatura no canvas; fora dele, o Stepper do topo é o lugar natural
para o conector de etapa virar traço de cota (§0.2) em vez da barra sólida
padrão de `Stepper` — mesma generalização já prevista na Seção 0.2 ("conector
entre etapas do Stepper... em vez de uma linha reta simples").

---

### Catálogo — /catalogo

**Nível**: release
**Referência nomeada**: Stripe Dashboard — tabela densa de itens com coluna
monetária `tabular-nums` alinhada à direita e hierarquia por peso de fonte
(nome em `font-medium text-cinza-900`, demais colunas em `cinza-500`), não
por zebra-striping ou caixas.
**Densidade**: densa (consulta e comparação — o usuário está escaneando
preço/status de muitos produtos, não preenchendo um formulário).
**Padrão de tela**: painel de trabalho

**Grade**
- Coluna única, `flex flex-col gap-lg` (24px): faixa de KPIs → seção da
  tabela.
- KPIs: `grid grid-cols-2 gap-md sm:grid-cols-3 xl:grid-cols-5` (5
  posições fixas, Design-System §2.6).
- Tabela: `section` única `p-xl`, sem grid interno além da própria
  `Table` (shadcn).
- Breakpoint: abaixo de `md`, tabela ganha `overflow-x-auto` próprio
  (§7.7) em vez de quebrar linha.

**Regiões** — região sem propósito declarado não existe
| Região | Propósito | O que vive aqui | O que NUNCA vive aqui |
|---|---|---|---|
| Faixa de KPIs | Visão geral rápida ("quantos produtos ativos de cada tipo?") | 5 cards: Total/Chapas/Ferragens/LEDs/Acessórios | Ação de edição, filtro |
| Barra de controle da tabela | Filtrar e criar | `Select` categoria (`w-48`) + título "Produtos"/subtítulo + botão `primary` "Adicionar item" | KPI, dado de produto individual |
| Tabela | Trabalho real (escanear, comparar, editar, ativar/desativar) | Nome/Categoria/Código/Detalhes/Preço/Status/Ações | Formulário completo (edição abre `Dialog`, não inline) |

**Hierarquia — três níveis, cada um com o mecanismo**
1. DOMINA — a tabela — mecanismo: é a única região com múltiplos eixos de
   leitura simultâneos (nome, preço, status) e ocupa o resto da tela
   depois da faixa de KPI; nome do produto em `font-medium text-cinza-900`
   é o único texto de peso alto dentro dela.
2. APOIA — faixa de KPI — mecanismo: números em `text-valor-destaque`
   (24px), mas contidos em cards pequenos (`p-lg`) no topo, papel de
   orientação, não de trabalho.
3. RECUA — badge de status (pill `rounded-full`), ícones de ação `ghost`
   na última coluna — menor peso visual da tela inteira, aparecem só
   quando o usuário já decidiu agir sobre uma linha.

**Ordem de leitura**: 1º faixa de KPI (visão geral) → 2º barra de controle
(o que estou filtrando/vou criar) → 3º linhas da tabela (o trabalho).
**Ação primária**: "Adicionar item" — inline na barra de controle da
tabela, topo-direita, nunca na topbar (esta rota não define ação de
topbar — o padrão observado é a ação de criação viver junto do filtro que
ela afeta).
**Poda**: as antigas `Tabs` de categoria (Todos/Chapas/Ferragens/LEDs/
Acessórios/Fita) e as 3 tabelas separadas foram podadas em favor de UM
`TabelaProdutos` com filtro `Select` interno (decisão de produto já
registrada no Backlog, RF-30) — Design-System §7.8 continua valendo para
outras telas, não para esta.
**Agrupamento**: KPI e tabela são dois grupos irmãos, mesmo nível
(`gap-lg` entre eles, nunca um dentro do outro); dentro da tabela, cada
linha é um produto — nunca duas linhas mescladas.
**Eixos de alinhamento**: tabela = 2 eixos (nome/categoria/código/detalhes
à esquerda, preço `tabular-nums` à direita, status/ações centralizados
por padrão do componente `Table`); faixa de KPI = 1 eixo por card
(ícone→rótulo→valor, empilhados, sem alinhamento cruzado entre cards).
**Vazio e erro**: vazio = `Package` 32px `cinza-300` + "Nenhum produto
cadastrado ainda" + descrição + (o botão "Adicionar item" da barra de
controle já cobre o CTA, não duplicado dentro do vazio). Erro = `Alert`
variante erro substitui a tela inteira (já implementado em `CatalogoLab`).
**Assinatura**: nenhum divisor hoje sob "Produtos"/subtítulo antes da
tabela — aplicar o traço de cota (§0.2) nesse ponto é a manifestação
específica desta tela: reforça a leitura "linha de medida" bem onde a
coluna de preço `tabular-nums` começa a ser lida.

---

### Biblioteca — /biblioteca

**Nível**: release
**Referência nomeada**: mesma dupla do Catálogo, aplicada à grade de
cards em vez de tabela — Stripe Dashboard (dimensões `800 x 720 x 550 mm`
em `tabular-nums`, número como medida, não texto solto) e Linear
(densidade de grid, `gap-lg` consistente, `hover:shadow-sm` sutil, nunca
sombra pesada).
**Densidade**: densa (consulta e comparação) — **mesma categoria do
Catálogo**, mesmo que a forma visual mude: aqui o atributo comparado é a
identidade visual do módulo (silhueta/nome/dimensão), não campos
tabulares de preço/código, então grade de cards vence tabela — mas o
ritmo (barra de controle idêntica, vazio idêntico, `gap-lg` no macro)
é o mesmo dos dois telas-irmãs, o que sustenta a coerência pedida.
**Padrão de tela**: painel de trabalho

**Grade**
- Coluna única, `flex flex-col gap-lg`: barra de controle → grade de
  cards.
- Grade: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
  gap-lg`.
- Breakpoint: mobile 1 coluna, tablet 2, desktop 3–4 — mesma lógica de
  "não quebrar" da Seção 10, sem layout dedicado a mobile além do reflow
  de colunas.

**Regiões** — região sem propósito declarado não existe
| Região | Propósito | O que vive aqui | O que NUNCA vive aqui |
|---|---|---|---|
| Barra de controle | Filtrar por categoria e criar | `Select` categoria (`w-56`) + botão `primary` "Novo módulo" | Card de módulo individual |
| Grade de cards | Trabalho real (escanear, abrir no editor, excluir) | `GabaritoCard`: badge Global/Seu módulo, thumbnail `aspect-square`, nome, categoria+tipo, dimensões, ações | KPI numérico (podado, ver abaixo), tabela |

**Hierarquia — três níveis, cada um com o mecanismo**
1. DOMINA — nome do módulo + thumbnail dentro de cada card — mecanismo:
   thumbnail `aspect-square` é o maior elemento de área do card, nome em
   `text-titulo-card` (16px/600) é o texto mais pesado.
2. APOIA — meta do card (categoria/tipo, dimensões `tabular-nums`) e o
   badge de origem (Global/Seu módulo) — mecanismo: `text-corpo-pequeno
   text-cinza-500`, um degrau abaixo do nome, mas ainda visível sem
   interação.
3. RECUA — ações (abrir no editor / excluir) — mecanismo: `Button ghost
   size="sm"`, rodapé do card (`mt-auto`), menor peso, só relevante quando
   o usuário já decidiu agir sobre aquele módulo específico.

**Ordem de leitura**: 1º barra de controle (o que estou filtrando/vou
criar) → 2º grade completa (varredura visual) → 3º dentro do card que
chamou atenção: badge → thumbnail → nome → meta → ações.
**Ação primária**: "Novo módulo" — mesma posição relativa do Catálogo
(topo-direita da barra de controle), mesmo componente (`Button primary`
com ícone `Plus` à esquerda do label) — reforço direto da coerência entre
as duas telas-irmãs.
**Poda**: sem faixa de KPI (diferente do Catálogo, decisão consciente —
a contagem por categoria já é visível pelo próprio filtro/grade, um 6º
elemento de orientação seria redundante aqui); "Gerenciar categorias" do
mockup original foi podado — categoria é campo texto livre sem tabela
própria no schema, não há onde essa tela persistiria uma categoria nova
(decisão já registrada no comentário de `GabaritoLab.tsx`).
**Agrupamento**: cada `GabaritoCard` é autocontido (badge+thumbnail+meta+
ações no mesmo contêiner) — nunca thumbnail de um card ao lado do nome de
outro fora do grid nativo do CSS Grid.
**Eixos de alinhamento**: 1 eixo por card (tudo alinhado à esquerda,
começando no badge, sem coluna de valor à direita — esta tela não mostra
preço); barra de controle = 1 eixo (filtro à esquerda, ação à direita,
`justify-between`).
**Vazio e erro**: vazio = `Library` 32px `cinza-300` + "Nenhum módulo
nesta categoria" + descrição + CTA "Novo módulo" duplicado dentro do
vazio (aqui, diferente do Catálogo, o vazio pode ser fruto de um FILTRO
aplicado, não só de biblioteca zerada — por isso o CTA se repete, para não
depender do usuário voltar à barra de controle). Erro = `Alert` variante
erro substitui a tela inteira.
**Assinatura**: mesmo ponto do Catálogo — não há hoje nenhum divisor sob
um título de seção nesta tela (a barra de controle não tem título "Módulos"
formal); a introdução do traço de cota fica reservada para quando/se esta
tela ganhar um título de seção explícito — não forçar o motivo onde não há
título hoje seria pior que a ausência (Antipadrão §0.7: "barrinha... sem
significado").

---

### Proposta impressa — /proposta/[id]/pdf

**Nível**: **vitrine** (`screenLevels` do config) — critério de documento
de venda que o marceneiro entrega ao cliente, não de tela de aplicativo.
**Referência nomeada**: Stripe (hosted invoice) — bloco de linha de item +
total final isolado e numericamente dominante, mesma lógica dos
`tabular-nums` do resto do produto; Apple (páginas de produto) — o bloco
de citação como respiro editorial dentro de um documento denso em dados,
nunca decoração solta.
**Densidade**: espaçosa (decisão e leitura) — o oposto deliberado de
Catálogo/Biblioteca: aqui o cliente final lê para decidir comprar, não
para comparar SKUs.
**Padrão de tela**: documento

**Grade**
- "Papel" centralizado, `max-width: 820px` (não os 1536px de referência
  do shell — este documento não vive dentro do shell, é standalone,
  simula proporção A4).
- Cabeçalho/rodapé: `padding: 32px 40px` (aprox. `3xl`/`2xl+md`).
- Corpo: `padding: 32px 40px`; "Resumo" interno em `grid grid-cols-1fr-1fr
  gap-xl`; cada linha de ambiente em `flex` (thumbnail 200px fixo +
  conteúdo flexível).
- O que muda no `mobile` (< 768px, tela, não impressão): cabeçalho/rodapé
  perdem padding lateral extra, "Resumo" vira 1 coluna, linha de ambiente
  empilha (thumbnail em cima). Impressão real (`@media print`) sempre A4,
  não passa por breakpoint de tela.

**Regiões** — região sem propósito declarado não existe
| Região | Propósito | O que vive aqui | O que NUNCA vive aqui |
|---|---|---|---|
| Barra de ações (fora do papel) | Única ação da tela | Link "Voltar" + botão "Imprimir" (`accent`) | Qualquer dado do orçamento (some no print) |
| Cabeçalho do papel | Identificar quem está cobrando | Logo (variante fundo escuro) + nome/CNPJ/endereço/telefone da organização, fundo `marinho-900` | Dado do cliente, valor |
| Bloco cliente | Identificar para quem é a proposta | Nome/telefone/endereço do cliente, card `cinza-50` | Dado financeiro |
| Ambientes orçados | O que está sendo vendido e por quanto | Uma `PropostaPdfLinha` por ambiente: imagem, título, descrição comercial, valor | Nome de peça técnica, cor/espessura de MDF, qualquer vocabulário de produção |
| Resumo | Fechar a decisão comercial | Prazo de entrega, forma de pagamento (editável), total (`valor-destaque-lg`) | Custo de material/montagem/frete separados (D-25) |
| Citação de destaque | Reforço de marca/confiança antes do fechamento | Frase institucional, card `marinho-900`, aspas `accent-vivid` | Dado numérico |
| Rodapé do papel | Fechamento formal do documento | Logo pequena + nota legal | Ação (imprimir já está na barra de ações) |

**Hierarquia — três níveis, cada um com o mecanismo**
1. DOMINA — o total final — mecanismo: único uso de `text-valor-destaque-lg`
   (32px/700, `tabular-nums`, `accent-vivid`) do produto inteiro, reservado
   exclusivamente para este número.
2. APOIA — valor de cada linha de ambiente (`text-valor-destaque`, 24px) e
   título de cada linha (`titulo-card`, 16px/600) — visível, mas um degrau
   abaixo do total.
3. RECUA — dados de emitente/cliente (`legenda`/`corpo-pequeno`), prazo de
   entrega, nota de rodapé — presentes para credibilidade, não competem
   com a decisão de compra.

**Ordem de leitura**: 1º cabeçalho (quem está cobrando, confiança) → 2º
ambientes orçados com valor por linha (o quê e quanto) → 3º total (quanto
no total, o número que fecha a decisão).
**Ação primária**: "Imprimir" — barra de ações, fora do papel, única ação
da tela inteira (o documento em si não tem nenhum controle interativo além
da textarea de forma de pagamento).
**Poda**: sem custo interno de material/montagem/frete em nenhum lugar
(D-25, garantido por `carregarDadosPropostaPdf`); sem vocabulário técnico
de produção (nome de peça, sentido de veio, espessura de chapa) — a
descrição de cada linha é comercial, pré-preenchida, editável na aba
Proposta antes de gerar, nunca aqui; sem sidebar/topbar do shell (rota
standalone); sem botão de edição inline no papel — documento é
essencialmente read-only pós-congelamento (D-17), a única exceção
declarada é o campo de forma de pagamento.
**Agrupamento**: cada linha de proposta é um bloco isolado
(borda+radius+padding próprios) — nunca duas linhas dividindo um mesmo
contêiner; "Resumo" (prazo+pagamento+total) é um único card `cinza-50`
separado das linhas — critério: "fechamento comercial" é uma pergunta
diferente de "o que você está comprando".
**Eixos de alinhamento**: 2 eixos por documento — títulos/descrições/
rótulos à esquerda, todo valor monetário `tabular-nums` à direita (mesma
tese 0.1 do resto do produto, aqui levada ao documento que sai da oficina).
**Vazio e erro**: vazio = `PropostaPdfVazio` (fora do CSS do "papel" — não
há documento a mostrar ainda), mesmo padrão §8 (ícone 32px + título +
descrição + CTA "Ir para o orçamento"). Erro = 404 padrão do Next quando o
orçamento não existe/não pertence à organização — navegação, não estado de
conteúdo, fora do escopo desta composição.
**Assinatura**: `.proposta-pdf__secao-titulo` ("Ambientes orçados") hoje
não tem nenhum divisor (só `margin-bottom`) — este é o ponto de maior
peso simbólico para aplicar o traço de cota (§0.2): é o título que abre a
lista de itens vendidos, no documento que efetivamente sai da oficina para
o cliente — a tese "prancheta que virou documento" importa mais aqui do
que em qualquer tela interna do produto.

---

### Dashboard — /

**Nível**: release
**Referência nomeada**: Stripe Dashboard — tabela "Orçamentos recentes" com
`tabular-nums` e hierarquia por peso (nome do cliente `font-medium
text-cinza-900`, única cor de destaque no nome), mesma regra já registrada
em 0.3/Catálogo; Linear — o nome do cliente como único elemento clicável de
peso na tabela (`hover:text-accent hover:underline`), sem decoração extra
em volta.
**Densidade**: espaçosa (decisão e leitura) — painel de chegada e ponto de
partida para criar algo novo, não superfície de comparação exaustiva (essa
categoria já existe em Catálogo/Biblioteca).
**Padrão de tela**: dashboard

**Grade**
- Shell: sidebar 264px + topbar 72px + conteúdo (`bg-cinza-50`, `p-xl`,
  1536px de referência) — Design System §6, sem alteração.
- Conteúdo: `flex flex-col gap-xl` — cabeçalho de página → faixa de KPI →
  card único "Orçamentos recentes".
- KPI: `grid grid-cols-1 gap-xl sm:grid-cols-2 xl:grid-cols-4` (4
  posições fixas).
- Card da tabela: `section` única `rounded-lg border border-cinza-200
  bg-cinza-0 p-xl shadow-xs`.
- Breakpoint: abaixo de `sm`, KPI vira 1 coluna; abaixo de `md`, tabela
  ganha `overflow-x-auto` próprio (§7.7, mesmo padrão do Catálogo).

**Regiões** — região sem propósito declarado não existe
| Região | Propósito | O que vive aqui | O que NUNCA vive aqui |
|---|---|---|---|
| Cabeçalho de página | Orientar e oferecer a ação de criar | Parágrafo de apoio + botão `primary` "Novo orçamento" | Título de página duplicado (a Topbar do shell já mostra "Dashboard"/"Visão geral dos seus orçamentos" — ver Poda) |
| Faixa de KPI | Panorama rápido (quantos orçamentos, aprovados, em aberto, faturamento) | 4 `KpiCard` | Ação de edição, link para detalhe de um orçamento |
| Orçamentos recentes | Trabalho real: retomar um orçamento existente | Tabela cliente/status/valor final/custo/criado em | Formulário de edição inline; criação (isso é a ação do cabeçalho) |

**Hierarquia — três níveis, cada um com o mecanismo**
1. DOMINA — a tabela "Orçamentos recentes" — mecanismo: nome do cliente
   `font-medium text-cinza-900` com `hover:text-accent hover:underline` é o
   único texto clicável de peso alto da tela; a tabela ocupa toda a largura
   e o resto da altura disponível, é a única região com múltiplos eixos de
   leitura simultâneos (cliente/status/valor/custo/data).
2. APOIA — faixa de KPI — números em `text-valor-destaque`, mas contidos em
   cards pequenos (`p-lg`) fixos no topo — panorama, não trabalho (mesmo
   raciocínio 0.3 já aplicado ao Catálogo).
3. RECUA — `StatusOrcamentoBadge` (pill) dentro da tabela — menor peso
   visual da tela; cor carrega status semântico, nunca hierarquia de
   importância genérica.

> Cor não é mecanismo de hierarquia aqui: o único uso de cor com função de
> destaque é o `accent` do hover no nome do cliente (afordance de link) e a
> cor semântica do badge de status — nenhum dos dois "pinta" a tela para
> chamar atenção genericamente.

**Ordem de leitura**: 1º cabeçalho (o que esta tela é e como eu crio algo
novo) → 2º faixa de KPI (panorama) → 3º tabela (retomar um orçamento
existente).
**Ação primária**: "Novo orçamento" — botão no cabeçalho de página,
topo-direita (`justify-between`), repetido no estado vazio da tabela
(mesmo padrão §8) — nunca na Topbar do shell, que aqui só carrega
título/subtítulo e "Sair".
**Poda**: título de página duplicado — `Topbar.tsx`
(`TITULOS_POR_ROTA["/"]`) já renderiza "Dashboard" (`text-display`) +
"Visão geral dos seus orçamentos" (subtítulo); o `<h2
className="text-titulo-secao">Visão geral</h2>` interno de
`DashboardView.tsx` repete a mesma leitura com outra palavra, em telas
consecutivas. Correção: remover esse `h2`, manter só o parágrafo de apoio
("Acompanhe seus orçamentos e o status de cada um.") ao lado do botão —
mesmo padrão que `PerfilLab` já segue (nenhum título de página duplicando
a Topbar, só cabeçalhos de seção). Os gráficos (linha/donut) cogitados no
direcionamento original (Design-System §0.9) seguem podados: o motor de
precificação ainda não alimenta "Faturamento" (hoje "—") — gráfico sem
esse dado real seria decoração vazia (Antipadrão §0.7).
**Agrupamento**: faixa de KPI e card "Orçamentos recentes" são grupos
irmãos (`gap-xl`, nunca aninhados); o `h2` "Orçamentos recentes" dentro do
card é cabeçalho de seção (não duplica a Topbar, é o único título daquele
nível na tela) e permanece.
**Eixos de alinhamento**: cabeçalho de página = 1 eixo
(`items-center justify-between`, texto à esquerda, botão à direita); faixa
de KPI = 1 eixo por card (ícone → rótulo → valor); tabela = 2 eixos
(cliente/status à esquerda, valor/custo/data `tabular-nums` à direita) —
mesma tese do Catálogo.
**Vazio e erro**: vazio já implementado em `DashboardView.tsx` (`FileText`
32px `cinza-300` + "Nenhum orçamento ainda" + descrição + botão "Novo
orçamento") — já bate com Design-System §8, nenhuma correção necessária.
Erro: `buscarDadosDashboard()` (`lib/dashboard/orcamentos.ts`) não tem
hoje um caminho de falha tratado na `DashboardView` — falta um `Alert`
variante erro substituindo faixa+tabela quando a consulta falhar (mesmo
padrão §8); registrado como lacuna de implementação, não resolvido nesta
composição.
**Assinatura**: `mb-3` sob "Orçamentos recentes" hoje é só margem, sem
divisor — aplicar o traço de cota (§0.2) neste ponto é a manifestação
específica desta tela: é o primeiro título de seção que qualquer usuário vê
depois do login.

---

### Novo orçamento — /orcamento/novo

**Nível**: release
**Referência nomeada**: Stripe — formulário de captura curto, um campo por
linha, rótulo acima do input, erro inline abaixo dos campos, antes do
botão; Linear — card único, sem distração, começando um fluxo sem exigir
contexto extra antes da primeira ação.
**Densidade**: espaçosa (decisão) — captura de um cliente novo antes de
abrir o orçamento, uma decisão só.
**Padrão de tela**: formulário simples (passo único — sem stepper, sem
accordion; distinto do "formulário em etapas" do Editor de Item).

**Grade**
- Shell padrão, sem alteração.
- Conteúdo: card único `max-w-xl rounded-lg border border-cinza-200
  bg-cinza-0 p-xl shadow-xs`, alinhado à esquerda do `content` (sem
  `mx-auto`) — decisão consciente: o card não ocupa a largura toda, então
  centralizá-lo soltaria a tela do alinhamento com o resto da IA
  (Antipadrão §0.7 "tudo centralizado por falta de decisão").
- Formulário interno: `flex flex-col gap-md` (16px), um campo por linha.
- Breakpoint: `max-w-xl` (576px) já é mais estreito que qualquer
  breakpoint de referência — o card nunca precisa de reflow próprio.

**Regiões** — região sem propósito declarado não existe
| Região | Propósito | O que vive aqui | O que NUNCA vive aqui |
|---|---|---|---|
| Cabeçalho do card | Contexto e limite de escopo | Parágrafo avisando que a seleção de cliente existente não está disponível | Título de página duplicado (ver Poda) |
| Formulário | Capturar os dados do cliente | Nome* / Telefone / Endereço / Prazo de entrega | Seleção de cliente existente (fora de escopo, documentado no próprio texto) |
| Feedback | Confirmar erro antes de tentar de novo | `Alert` erro (mensagem do Server Action) | Alert de sucesso permanente — sucesso navega direto para `/orcamento/[id]` |

**Hierarquia — três níveis, cada um com o mecanismo**
1. DOMINA — campo "Nome do cliente *" — mecanismo: primeiro campo do
   formulário, único com `*`/`required`; o resto da tela existe para
   viabilizá-lo.
2. APOIA — telefone/endereço/prazo de entrega — mesmo peso visual entre si
   (`Label`+`Input` padrão), na ordem do DOM logo depois do campo
   obrigatório.
3. RECUA — segunda frase do parágrafo de abertura ("A seleção de um
   cliente já existente não está disponível...") — `text-corpo
   text-cinza-500`, contexto, não decisão.

**Ordem de leitura**: 1º título+aviso de escopo → 2º nome do cliente
(obrigatório) → 3º demais campos → 4º botão "Criar orçamento".
**Ação primária**: "Criar orçamento" — botão `primary`, rodapé do
formulário, único botão sólido da tela.
**Poda**: mesmo achado do Dashboard — `Topbar.tsx`
(`TITULOS_POR_ROTA["/orcamento/novo"]`) já mostra "Novo orçamento"; o
`<h2 className="text-titulo-secao">Novo orçamento</h2>` dentro do card
duplica esse título. Correção: remover o `h2` interno, manter só o
parágrafo de aviso de escopo como abertura do card. Seleção de cliente
existente permanece fora de escopo — decisão de produto já registrada no
comentário do componente, não desta composição.
**Agrupamento**: um único grupo (o card inteiro) — os 4 campos não se
subdividem em seções, é um formulário plano.
**Eixos de alinhamento**: 1 eixo (label acima do input, ambos à esquerda —
não há dado tabular nesta tela, sem coluna à direita).
**Vazio e erro**: não há estado vazio — o formulário em branco é o próprio
estado inicial, não um estado à parte. Erro: `Alert` variante erro abaixo
dos campos, acima do botão — mensagem vem de `criarOrcamento` (Server
Action), nunca erro cru do Postgres (Design-System §11, já seguido pelo
componente).
**Assinatura**: nenhum divisor nesta tela hoje (card sem seção interna) —
sem ponto natural para o traço de cota; não forçar (mesmo critério já
registrado na composição da Biblioteca, R.2a).

---

### Perfil — /perfil

**Nível**: release
**Referência nomeada**: Stripe Dashboard — formulário de configurações em
seções empilhadas, cada seção com seu próprio botão de salvar ("Business
settings"); Linear — confirmação destrutiva com campo de digitação
exigido ("type to confirm") antes de excluir um workspace inteiro.
**Densidade**: espaçosa (decisão e leitura) — configuração pontual, não
consulta/comparação.
**Padrão de tela**: formulário em seções (variação sem stepper do
"formulário em etapas": as seções não têm ordem obrigatória de
progressão, todas ficam sempre visíveis e cada uma se salva sozinha).

**Grade**
- Shell padrão, sem alteração.
- Conteúdo: `flex flex-col gap-xl` com as seções empilhadas (Organização,
  Perfil pessoal, Segurança, Excluir conta — só para `admin`) — cada
  `section` = `rounded-lg border border-cinza-200 bg-cinza-0 p-xl
  shadow-xs`, exceto Excluir conta (`border-erro-border`, ver Hierarquia).
- Dentro de cada seção: `grid grid-cols-1 gap-md sm:grid-cols-2` quando o
  par de campos cabe lado a lado (nome+CNPJ, telefone+endereço), campo
  único quando não há par (logo, unidade, kerf, precificação, montagem).
- Breakpoint: abaixo de `sm`, todo grid de 2 colunas vira 1 — padrão já
  usado no resto do produto (§10).

**Regiões** — região sem propósito declarado não existe
| Região | Propósito | O que vive aqui | O que NUNCA vive aqui |
|---|---|---|---|
| Organização | Dados que aparecem na proposta + padrões de orçamentos novos | Nome/CNPJ/telefone/endereço/logo/unidade/kerf/precificação padrão/montagem padrão | Dado pessoal do usuário, senha |
| Perfil pessoal | Identidade do usuário logado | Nome/telefone/foto | CNPJ, dado de organização |
| Segurança | Credencial de acesso | E-mail (somente leitura) + trocar senha + definir nova senha (condicional) | Dado de organização/perfil |
| Excluir conta (só `admin`) | Ação destrutiva irreversível, isolada do resto | Botão "Excluir organização" + `Dialog` com campo de digitação | Qualquer outro dado/ação — vive sozinha, última seção |

**Hierarquia — três níveis, cada um com o mecanismo**
1. DOMINA — nenhuma seção domina por escala sobre as outras (todas
   `ícone+h2+p-xl`, mesmo peso); a hierarquia aqui é posicional:
   Organização primeiro (afeta todo orçamento novo), Perfil pessoal e
   Segurança no meio, Excluir conta por último — e é a única seção que usa
   cor como sinalizador (`border-erro-border`, ícone `AlertTriangle
   text-erro`), uso semântico de perigo, não hierarquia de importância.
2. APOIA — o campo obrigatório de cada seção (nome da organização, nome do
   perfil) — mesmo peso do resto dos campos, primeiro na ordem do DOM.
3. RECUA — texto de apoio abaixo de campo (`mt-1 text-corpo-pequeno
   text-cinza-500`, ex.: "Muda o plano de corte de todo orçamento não
   congelado.") — contexto, não decisão.

**Ordem de leitura**: 1º Organização (o que mais orçamentos futuros
herdam) → 2º Perfil pessoal → 3º Segurança → 4º Excluir conta (só quando
`admin`, sempre por último).
**Ação primária**: não há uma única ação de página — cada seção tem a sua
("Salvar alterações" em Organização e em Perfil pessoal, "Trocar
senha"/"Salvar nova senha" em Segurança, "Excluir organização" em Excluir
conta) — decisão já registrada no componente (`PerfilLab.tsx`) e validada
aqui: coerente com o padrão de abas do Orçamento (R.2a), onde cada
superfície de trabalho salva o que é dela.
**Poda**: "Tema: Claro" do mockup original não existe no código
(Design-System §2.9 já documenta essa decisão — dark mode fora de escopo),
nada a podar aqui, nunca foi construído. Alturas padrão de faixa
(rodapé/bancada/aéreo/pé-direito, citadas no Mapa-de-Telas §3.3) ficam de
fora desta tela por decisão já registrada no componente — vivem só na aba
Ambientes, para não duplicar validação entre duas cópias; poda confirmada,
não desta composição.
**Agrupamento**: cada `section` é uma responsabilidade fechada (mesmo
critério do Orçamento/Editor de Item: 1 seção = 1 pergunta — "o que a
organização é", "quem sou eu", "como eu acesso", "e se eu quiser sair de
vez").
**Eixos de alinhamento**: 1 eixo por seção (label acima do input, campos
pareados em grid 2 colunas, sem coluna de valor à direita — esta tela não
tem dado tabular/monetário).
**Vazio e erro**: organização não resolvível vira `Alert` erro dentro da
própria seção "Organização" (Perfil pessoal continua utilizável) — já
implementado, coerente com Design-System §8. Não há um "vazio" de
preenchimento (formulário de configuração sempre mostra os campos). Erro:
`Alert` inline por seção, sempre abaixo do botão daquela seção, nunca
substituindo a seção inteira (diferente do cenário "organização não
resolvível", que substitui o formulário por não haver `id` para salvar).
**Assinatura**: o divisor sob "Definir nova senha" (`border-t
border-cinza-200 pt-md`, dentro de Segurança) hoje é uma borda lisa —
ponto natural para o traço de cota (§0.2), mesmo raciocínio já aplicado a
"Ambientes orçados" na Proposta impressa.

---

### Materiais — /configuracoes/materiais

**Nível**: release (não citada em `screenLevels`)
**Referência nomeada**: nenhuma nova — esta composição não propõe
redesenho (ver Poda). A referência que já cobre este conteúdo é a de
Catálogo (R.2a): Stripe Dashboard, tabela densa com `tabular-nums`.
**Densidade**: densa (consulta/comparação de preço por linha) — mesma
categoria de Catálogo, citada só para registrar que esta nunca deveria ter
sido uma segunda superfície de preço fora do shell.
**Padrão de tela**: nenhum — rota órfã fora da arquitetura de informação
principal.

**Achado de arquitetura (antes de qualquer decisão de composição)**
`app/configuracoes/materiais/page.tsx` é código V2 sobrevivente:
- Fora do route group `(app)` — sem sidebar/topbar do shell; o próprio
  `app/(app)/layout.tsx` (comentário, linhas 11-18) documenta essa
  exclusão deliberada.
- Sem link em `components/shell/Sidebar.tsx` — `ITENS_NAV` lista
  "Configurações" com `href: null` (placeholder inativo); esta rota não é
  o destino desse item.
- Persiste em `localStorage` (`lib/catalog.ts`,
  `carregarCatalogo`/`salvarCatalogo`), não em Supabase.
- Usa 100% dos padrões em `legacyPatterns` do `.maestro/config.json`
  (`className="wrap"/"top"/"toolbar"/"card"/"campos"`,
  `className="primary"/"ghost"/"danger"`).
- `docs/Mapa-de-Telas.md` §3.4 já documenta o destino:
  **"Sucede a tela atual de materiais"** — `/catalogo` (Supabase, shadcn,
  já composta em R.2a) é a evolução declarada desta tela, não uma tela
  irmã dela.

**Hierarquia (estado atual, registrada só para instruir a remoção, não
como alvo de redesenho)**
1. DOMINA — tabela "Chapas de MDF" — primeira, maior, único CRUD com todos
   os campos editáveis inline.
2. APOIA — tabela "Ferragens e acessórios" — mesma estrutura, mas só preço
   é editável.
3. RECUA — card "Outros custos" — 3 inputs numéricos soltos (fita de
   borda, montagem, frete), menor densidade de dado.

**Poda**: a tela inteira é a poda. Recomendação ao Maestro: registrar no
Backlog a remoção de `app/configuracoes/materiais/page.tsx` (e
`lib/catalog.ts`, se não tiver outro consumidor) ou, no mínimo, transformar
a rota num redirect para `/catalogo` — nunca reconstruir esta tela com
tokens novos, isso duplicaria de forma permanente a superfície de preço
que `/catalogo` já cobre (chapas MDF → filtro "Chapas"; ferragens → filtro
"Ferragens"). Os três campos de "Outros custos" (fita de borda R$/m,
montagem R$/m², frete fixo R$) não têm equivalente 1:1 hoje: fita de borda
é um insumo sem categoria própria em Catálogo; montagem e frete já têm um
modo equivalente em `/perfil` → Organização → "Modo de precificação
padrão"/"Modo de montagem padrão" (`SeletorModoPrecificacao`/
`SeletorModoMontagem`, já implementados) — o valor fixo desta tela legada
provavelmente já está obsoleto frente ao modo percentual que o substituiu.
Isso é achado de modelo de domínio, não de composição visual: reportado ao
Maestro para `data-architect`/`product-strategist` decidirem se "fita de
borda" precisa de campo próprio em Catálogo antes desta tela ser removida,
para não perder o único lugar onde esse preço é hoje editável.
**Assinatura**: não se aplica — a tela não recebe a identidade do produto
porque não deve continuar existindo como está.

---

### Proposta (aplicativo) — /proposta

**Nível**: release (não citada em `screenLevels`; a variante vitrine já
existe e é `/proposta/[id]/pdf`, composta em R.2a)
**Referência nomeada**: nenhuma nova — ver Poda. A referência que cobre
este conteúdo já foi registrada na composição da Proposta impressa (R.2a):
Stripe (bloco de total isolado) + Apple (respiro editorial).
**Densidade**: espaçosa (leitura) — mesma categoria da Proposta impressa,
citada só para registro.
**Padrão de tela**: nenhum — rota órfã e, na prática, inalcançável (ver
achado).

**Achado de arquitetura**
`app/proposta/page.tsx` é o predecessor direto que `docs/Mapa-de-Telas.md`
§3.8 nomeia explicitamente: "Evolução de `/proposta` atual +
`proposta.css`" → `/proposta/[id]/pdf` (já implementada e composta em
R.2a). A tela lê `sessionStorage.getItem("proposta")`; nenhum código atual
grava essa chave — `app/(app)/page.tsx` (o Dashboard que substituiu o
editor V1/V2 single-page) documenta no próprio comentário que o botão
"Gerar proposta (PDF)" responsável por gravar essa chave foi aposentado
junto com o editor antigo e ainda não tem equivalente. Resultado: em uso
normal esta rota **sempre** cai no estado vazio ("Nenhuma proposta
carregada... Volte à calculadora"), com link para `/` — que hoje é o
Dashboard, não mais "a calculadora" citada no texto (evidência adicional
de código morto). A tela também usa a marca antiga "Budget Planner AI"
(`<div className="marca">Budget Planner AI</div>`), não "OrçaFácil" —
confirma que este arquivo nunca foi atualizado para v3.

**Poda**: a tela inteira é a poda, com prioridade maior que Materiais —
esta rota é código morto de fato (inalcançável em uso normal), não só
desalinhada de IA. Recomendação ao Maestro: remover `app/proposta/page.tsx`
e `app/proposta/proposta.css` do repositório. A funcionalidade real de
"montar e revisar a proposta antes de gerar" já vive na aba "Proposta" de
`/orcamento/[id]` (composta em R.2a); a versão para impressão/cliente já
vive em `/proposta/[id]/pdf` (vitrine, composta em R.2a) — nada desta tela
precisa sobreviver.
**Assinatura**: não se aplica.

---

### Login — /login

**Nível**: vitrine
**Referência nomeada**: Linear — split-panel de autenticação (metade marca
escura, metade formulário claro), sem decoração supérflua; Stripe — input
com ícone embutido à esquerda, foco visível, formulário mínimo que já
transmite confiança antes de qualquer dado ser digitado.
**Densidade**: espaçosa (decisão simples: entrar) — vitrine aqui não é
sobre densidade de dado, é sobre respiro e confiança.
**Padrão de tela**: tela de entrada (split-panel: marca + formulário)

**Grade**
- Duas colunas 50/50 em `≥md` (768px): esquerda `bg-marinho-900 p-2xl`
  (painel de marca), direita `bg-cinza-0` centralizando um card
  `max-w-[400px]`.
- Abaixo de `md`: painel esquerdo `hidden`, painel direito ocupa 100% da
  tela, logo variante fundo claro assume o topo do formulário — nunca as
  duas variantes de logo visíveis ao mesmo tempo (já implementado via
  `hidden ... md:flex` / `md:hidden`).
- Sem shell (sidebar/topbar) — rota pré-autenticação, fora do `(app)`
  route group, correto por definição (Design-System §6: estrutura de
  shell presente "em toda tela autenticada... exceto login/cadastro/PDF").

**Regiões** — região sem propósito declarado não existe
| Região | Propósito | O que vive aqui | O que NUNCA vive aqui |
|---|---|---|---|
| Painel de marca (esquerda, ≥md) | Primeira impressão, prova de identidade antes de qualquer campo | Logo (fundo escuro) no topo, frase de posicionamento + subtítulo no meio, copyright no rodapé | Qualquer campo de formulário, qualquer CTA |
| Formulário (direita) | Autenticar | Logo (fundo claro, só `<md`), h1 "Bem-vindo de volta", e-mail, senha (toggle mostrar/ocultar), erro, botão "Entrar", link "Criar conta" | Dado de marca institucional (isso é o painel esquerdo) |

**Hierarquia — três níveis, cada um com o mecanismo**
1. DOMINA — o formulário como bloco (h1+campos+botão) — mecanismo: é a
   única coluna sempre visível em qualquer largura; o painel de marca é
   contexto que desaparece em mobile — a informação que não pode faltar é
   o formulário.
2. APOIA — a frase de posicionamento no painel de marca ("Orçamentos
   rápidos. Decisões seguras.") — `text-display font-bold`, mesmo peso do
   h1 do formulário, mas só visível em `≥md`, reforço de marca, não ação.
3. RECUA — copyright do painel esquerdo, link "Criar conta" no rodapé do
   formulário — `text-corpo-pequeno`, menor peso, presentes mas não
   competem com o botão "Entrar".

**Ordem de leitura**: 1º logo (identidade) → 2º h1 "Bem-vindo de volta"
(contexto da tela) → 3º campos e-mail/senha → 4º botão "Entrar".
**Ação primária**: "Entrar" — botão `primary w-full`, único botão sólido
da tela, sempre no fim do formulário, nunca disputando com o painel de
marca (que não tem nenhum CTA).
**Poda**: nenhum campo de "lembrar-me" ou "esqueci minha senha" — não há
fluxo de recuperação de senha documentado para usuário deslogado (a troca
de senha existe via `/perfil` → Segurança, só para quem já está logado);
adicionar aqui seria funcionalidade nova fora do escopo desta composição —
reportado como lacuna de produto, não resolvido nesta composição. Nenhum
provedor social (Google etc.) — o domínio não tem esse requisito (Supabase
Auth configurado só para e-mail/senha), então nenhum espaço reservado para
botão de terceiro é necessário.
**Agrupamento**: um grupo por coluna — painel de marca autocontido
(logo/frase/copyright, `justify-between` distribuindo os três ao longo da
altura), formulário autocontido (logo mobile + h1 + form + link, tudo em
`max-w-[400px]`).
**Eixos de alinhamento**: painel de marca = 1 eixo vertical (logo → frase
→ copyright, `flex-col justify-between`); formulário = 1 eixo (label
acima do input, ícone `Mail`/`Lock` alinhado opticamente ao centro
vertical do input via `top-1/2 -translate-y-1/2`, não à borda).
**Vazio e erro**: não há estado vazio (formulário sempre pronto para
digitar). Erro: `Alert` variante erro entre os campos e o botão, cobrindo
dois casos — credencial inválida (`mensagemErroLogin`) e link de
confirmação expirado (`?erro=confirmacao`, mensagem já diz o que aconteceu
e a ação seguinte, "peça um novo cadastro... ou tente entrar", já segue a
regra de UX Writing §11).
**Assinatura**: o painel `bg-marinho-900` já é a assinatura de marca
(mesma cor da sidebar autenticada). Para reforçar a tese 0.1
especificamente aqui — primeira tela que qualquer pessoa vê do produto —
o traço de cota (§0.2) pode assinar o separador entre a frase de
posicionamento e o copyright no rodapé do painel esquerdo (hoje só espaço
via `justify-between`, sem nenhum divisor).

---

### Signup — /signup

**Nível**: vitrine
**Referência nomeada**: mesma dupla do Login (Linear/Stripe), aplicada a
um formulário mais longo — Stripe também cobre aqui o padrão de "revelar
só o próximo passo quando o anterior existe": a tela de confirmação de
e-mail substitui o formulário inteiro, nunca aparece ao lado dele.
**Densidade**: espaçosa (decisão) — mesmo com 5 campos (mais que o Login),
o objetivo continua sendo uma decisão única ("criar conta").
**Padrão de tela**: tela de entrada (split-panel: marca + formulário) —
mesmo padrão e mesma decisão assinatura do Login.

**Grade**
- Idêntica ao Login (2 colunas 50/50 `≥md`, painel some `<md`) — único
  ajuste: o card do formulário ganha `py-xl` (5 campos + 2 links, mais
  alto que o do Login).
- O estado "Confira seu e-mail" não é um passo dentro do mesmo layout de 2
  colunas: substitui a tela inteira por `flex min-h-screen items-center
  justify-center`, sem painel de marca (ver Assinatura).

**Regiões** — região sem propósito declarado não existe
| Região | Propósito | O que vive aqui | O que NUNCA vive aqui |
|---|---|---|---|
| Painel de marca (esquerda, ≥md) | Mesmo papel do Login, copy própria de conversão ("Comece agora seu controle profissional de orçamentos") | Logo + frase + subtítulo + copyright | Formulário |
| Formulário | Criar a conta (organização + pessoa) | Nome da marcenaria, nome completo, e-mail, senha, confirmar senha, erro, botão "Criar conta e iniciar", link "Fazer login" | CNPJ/telefone/endereço/cidade/estado do mockup original (podados, ver abaixo) |
| Confirmação de e-mail (estado substituto) | Fechar o loop "conta criada, falta confirmar" | Logo + h1 "Confira seu e-mail" + e-mail digitado em destaque + link "Voltar para o login" | Qualquer campo do formulário — a conta já existe, não há o que reeditar aqui |

**Hierarquia — três níveis, cada um com o mecanismo**
1. DOMINA — o formulário (mesmo mecanismo do Login: única coluna sempre
   visível).
2. APOIA — frase de posicionamento do painel de marca (mesmo mecanismo do
   Login, copy diferente).
3. RECUA — texto de apoio ("Preencha os dados para criar sua
   marcenaria."), link "Fazer login".

**Ordem de leitura**: 1º logo → 2º h1 "Crie sua conta" → 3º nome da
marcenaria (primeiro campo — é o que distingue este cadastro de um
cadastro pessoal genérico) → 4º demais campos → 5º botão.
**Ação primária**: "Criar conta e iniciar" — único botão sólido, rótulo
verbo+objeto+consequência (o "e iniciar" já comunica que a próxima tela é
o produto de fato, reforço do UX Writing §7/11 "verbo + objeto quando
houver ambiguidade").
**Poda**: campos de CNPJ, telefone, endereço, cidade/estado do mockup
original (`docs/Imagem das Telas/Cadastro-Singup.png`) já podados no
código, com justificativa registrada no próprio componente (o trigger
`handle_new_user` só lê `organizacao_nome`/`nome`) — esta composição
confirma que a poda é a decisão certa também do ponto de vista de
hierarquia: um formulário de vitrine mais longo aumentaria o custo de
decisão logo na primeira impressão, contra a própria tese de "decisão
simples" desta tela. Achado de consistência entre as duas telas-irmãs de
vitrine: diferente do Login, os campos desta tela não têm ícone embutido
(`Mail`/`Lock`) — 5 campos sem esse reforço quebram o ritmo visual já
estabelecido no Login (Princípio Impeccable #4, ritmo consistente); ação
recomendada ao frontend-engineer: adicionar ícone em e-mail e nas duas
senhas, mesmo posicionamento do Login (`absolute left-3 top-1/2
-translate-y-1/2`, ícone `text-cinza-400`).
**Agrupamento**: mesmo critério do Login — painel de marca autocontido,
formulário autocontido; o estado "Confira seu e-mail" é um terceiro grupo,
mutuamente exclusivo com o formulário (troca de estado, nunca os dois
juntos).
**Eixos de alinhamento**: mesmo padrão do Login quando os ícones forem
adicionados (ver Poda); até lá, 1 eixo (label acima do input, sem ícone —
inconsistência registrada acima, não desta composição resolver em texto).
**Vazio e erro**: não há vazio (formulário sempre pronto). Erro: `Alert`
variante erro entre "Confirmar senha" e o botão — cobre validação
client-side (senha curta, senhas não conferem) e erro do Supabase
(`mensagemErroSignup`), nunca mensagem crua.
**Assinatura**: mesmo painel `marinho-900` do Login. A especificidade do
Signup é o estado "Confira seu e-mail", que perde o painel de marca
inteiro — quebra deliberada do split-panel bem no momento de maior
confiança necessária (conta acabou de ser criada). O traço de cota (§0.2)
aplicado como separador sutil entre o h1 "Confira seu e-mail" e o
parágrafo abaixo dele reforçaria a assinatura de marca justamente onde ela
ficou momentaneamente ausente (sem o painel esquerdo).

---

## Índice — Tela → Rota → Nível

| Tela | Rota | Nível |
|---|---|---|
| Orçamento | `/orcamento/[id]` | release |
| Editor de Item | `/orcamento/[id]/item/[itemId]` (núcleo compartilhado com `/modulo`) | release |
| Catálogo | `/catalogo` | release |
| Biblioteca | `/biblioteca` | release |
| Proposta impressa | `/proposta/[id]/pdf` | vitrine |
| Dashboard | `/` | release |
| Novo orçamento | `/orcamento/novo` | release |
| Perfil | `/perfil` | release |
| Materiais (órfã, candidata a remoção) | `/configuracoes/materiais` | release |
| Proposta (aplicativo, órfã, candidata a remoção) | `/proposta` | release |
| Login | `/login` | vitrine |
| Signup | `/signup` | vitrine |
