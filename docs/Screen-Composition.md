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

## Índice — Tela → Rota → Nível

| Tela | Rota | Nível |
|---|---|---|
| Orçamento | `/orcamento/[id]` | release |
| Editor de Item | `/orcamento/[id]/item/[itemId]` (núcleo compartilhado com `/modulo`) | release |
| Catálogo | `/catalogo` | release |
| Biblioteca | `/biblioteca` | release |
| Proposta impressa | `/proposta/[id]/pdf` | vitrine |
