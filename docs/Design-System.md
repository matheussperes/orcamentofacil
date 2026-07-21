# Design System — Refatoração Visual da Jornada do Cliente

> Gerado pelo Solution Architect em 2026-07-21, a partir da leitura de
> `app/globals.css`, `app/layout.tsx`, `app/proposta/proposta.css`,
> `app/page.tsx`, `app/modulo/page.tsx` (+ `CaixaCard.tsx`/`DivisoesCard.tsx`/
> `PortasCard.tsx`/`GavetasCard.tsx`/`PuxadorCard.tsx`/`SecaoHeader.tsx`),
> `app/biblioteca/page.tsx`, `app/proposta/page.tsx`, `package.json` e
> `docs/STATUS.md`. Este documento é o contrato único de valores visuais para
> o Frontend Engineer e o UX Auditor no épico de refatoração visual — nenhuma
> task de `docs/Backlog.md` (Stages 5–9) deve introduzir cor, espaçamento,
> raio ou tamanho de fonte fora do que está aqui. Ambiguidade aqui gera veto
> de UX mais tarde.
>
> **Revisão 2026-07-21 (v2 — Tailwind + shadcn/ui)**: o operador decidiu
> migrar a camada de apresentação para **Tailwind CSS + shadcn/ui** (ver
> Seção 8). Este documento foi reescrito da Seção 2 em diante para expressar
> os mesmos tokens já validados na v1 no formato de configuração do Tailwind
> (`tailwind.config.ts`) e mapear cada componente para seu equivalente
> shadcn/ui. **Os valores de cor (hex), tipografia e espaçamento não mudaram
> — só o formato de especificação e o mecanismo de aplicação.** As Seções 0 e
> 1 (direcionamento do operador e estado atual do código) permanecem como
> fatos já registrados.

## 0. Direcionamento do operador (não reinterpretar)

1. **Estilo**: SaaS moderno/clean — neutros (cinza/branco) + 1 cor de
   destaque forte, tipografia sem serifa, cantos arredondados, bastante
   espaço em branco. Referência: Linear/Notion.
2. **Usuário-alvo**: marceneiro/lojista profissional. **Desktop é a
   prioridade real** (densidade de informação e produtividade); mobile/
   tablet são suporte — não podem quebrar, mas não são otimizados como
   experiência primária.
3. **Escopo priorizado** (refletido em `docs/Backlog.md`): Produção → Editor
   de módulo → Biblioteca → Proposta.
4. **Stack de apresentação** (decisão v2): Tailwind CSS + shadcn/ui,
   substituindo o CSS puro + `style={{}}` inline atual.

## 1. Estado atual confirmado no código (antes deste documento)

- **Não há Tailwind, CSS Modules, styled-components nem shadcn/ui.** O
  projeto tem exatamente 2 arquivos CSS: `app/globals.css` (tema escuro
  global, `--bg: #0f1115`, classes utilitárias `.card`, `.modulo`, `.campos`,
  `.kpis`, `.aviso`, botões `.primary`/`.ghost`/`.danger`) e
  `app/proposta/proposta.css` (tema claro isolado, só para o documento
  imprimível). Todo o resto da estilização de componente é **inline
  `style={{...}}`** espalhado em `app/page.tsx`, `app/modulo/page.tsx` e os
  Cards do editor.
- `app/layout.tsx` não usa `next/font` hoje — a fonte é só a pilha
  `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Não há
  dependência de ícone (`lucide-react`, `heroicons` etc.) no `package.json`.
- O tema atual é **escuro** (`--bg: #0f1115`, painéis `#171a21`/`#1f232c`).
  A Pergunta 1 do operador ("neutros cinza/branco… Linear/Notion") pede
  explicitamente uma superfície clara — isto é uma instrução direta do
  operador, não uma decisão nova do Solution Architect. **O tema escuro atual
  é substituído pelos tokens claros abaixo.** Dark mode não foi pedido nesta
  fase e fica fora de escopo — ver Seção 7.

## 2. Paleta de cores (`tailwind.config.ts` → `theme.extend.colors`)

Todos os valores são hex — **idênticos aos da v1**, só reexpressos como
escala de cor do Tailwind. Uso via utilitários (`bg-cinza-50`,
`text-cinza-900`, `border-cinza-200`, `bg-accent`, `text-accent`, etc.).
shadcn/ui também lê algumas destas cores via CSS variables semânticas
(`--background`, `--foreground`, `--primary`, `--border`…) — o mapeamento
para os nomes semânticos do shadcn está na Seção 2.4.

### 2.1 Neutros (escala `cinza`)

```ts
cinza: {
  0:   "#FFFFFF", // branco — fundo de página, superfície de card
  50:  "#F8FAFC", // fundo secundário (backdrop de canvas, header, hover de linha)
  100: "#F1F5F9", // card colapsado/"salvo", hover de linha
  200: "#E2E8F0", // borda padrão de card/input/tabela
  300: "#CBD5E1", // borda em destaque (hover de card, divisor forte)
  400: "#94A3B8", // texto terciário/placeholder, ícone inativo
  500: "#64748B", // texto secundário (muted), labels
  600: "#475569", // texto secundário forte
  700: "#334155", // texto em componente escuro pontual (chip selecionado)
  800: "#1E293B", // reservado (dark mode futuro — não usado como fundo agora)
  900: "#0F172A", // texto primário (títulos, valores, corpo)
}
```

> Nota Tailwind: a escala usa a chave `0` para o branco de propósito, para
> manter a leitura "cinza-0 = superfície mais clara". `bg-cinza-0` e
> `bg-white` são equivalentes — prefira `bg-cinza-0` para consistência com
> este contrato.

### 2.2 Cor de destaque (`accent`)

```ts
accent: {
  DEFAULT: "#2563EB", // ações primárias, links, item ativo, preço em destaque
  hover:   "#1D4ED8", // hover de botão/link primário
  active:  "#1E40AF", // estado pressionado
  subtle:  "#EFF6FF", // fundo tintado (chip ativo, KPI de destaque, anel de foco)
  border:  "#BFDBFE", // borda de elemento tintado em accent-subtle
}
```

Uso: `bg-accent`, `hover:bg-accent-hover`, `active:bg-accent-active`,
`bg-accent-subtle`, `border-accent-border`, `text-accent`. Justificativa do
valor: `#2563EB` já é o azul usado em `app/proposta/proposta.css` —
reaproveitar elimina uma segunda cor de marca a coordenar entre app e
documento de proposta.

### 2.3 Semânticas

```ts
sucesso: { DEFAULT: "#16A34A", subtle: "#F0FDF4" },
erro:    { DEFAULT: "#DC2626", subtle: "#FEF2F2" },
aviso:   { DEFAULT: "#D97706", subtle: "#FFFBEB" },
```

Regra de uso: `sucesso` fica reservado para confirmações/validação positiva
("salvo com sucesso"), **não** para o preço final — o preço em destaque usa
`accent` (mudança em relação ao verde do tema antigo, que hoje colore o
preço).

### 2.4 Mapeamento para as CSS variables semânticas do shadcn/ui

shadcn/ui espera um conjunto de variáveis em `app/globals.css` (formato HSL
por padrão, mas aceita hex se `tailwind.config` for ajustado; para não
converter à mão, usar os hex acima via `@layer base` com as variáveis já em
hex e `hsl()` desativado no preset shadcn — o Frontend Engineer decide o
formato na Task 5.1, desde que o valor final renderizado seja o hex desta
seção). Mapa semântico mínimo:

| Variável shadcn | Token deste documento |
|---|---|
| `--background` | `cinza-0` `#FFFFFF` |
| `--foreground` | `cinza-900` `#0F172A` |
| `--card` / `--popover` | `cinza-0` `#FFFFFF` |
| `--muted` | `cinza-50` `#F8FAFC` |
| `--muted-foreground` | `cinza-500` `#64748B` |
| `--border` / `--input` | `cinza-200` `#E2E8F0` |
| `--primary` | `accent` `#2563EB` |
| `--primary-foreground` | `cinza-0` `#FFFFFF` |
| `--ring` | `accent` `#2563EB` (anel de foco) |
| `--destructive` | `erro` `#DC2626` |
| `--radius` | `0.75rem` (12px = `--radius-lg`, ver Seção 5) |

## 3. Tipografia (`theme.extend.fontFamily` + `fontSize`)

- **Família**: Inter (Google Fonts, SIL OFL — uso livre), carregada via
  `next/font/google` em `app/layout.tsx` (self-hosted no build, sem chamada
  de rede em runtime — evita liberar `fonts.googleapis.com` na CSP da Task
  3.4). Exposta como CSS variable `--font-inter` e registrada no Tailwind:

```ts
fontFamily: {
  sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system",
         "Segoe UI", "Roboto", "sans-serif"],
}
```

- **Escala** (`theme.extend.fontSize` — cada entrada define tamanho +
  line-height; o peso vai como utilitário `font-*` no componente). Valores
  **idênticos à v1**:

```ts
fontSize: {
  display:          ["28px", { lineHeight: "1.25" }], // font-bold  (700)
  "titulo-secao":   ["20px", { lineHeight: "1.3"  }], // font-semibold (600)
  "titulo-card":    ["16px", { lineHeight: "1.4"  }], // font-semibold (600)
  corpo:            ["14px", { lineHeight: "1.5"  }], // font-normal (400)
  "corpo-pequeno":  ["13px", { lineHeight: "1.5"  }], // font-normal (400)
  legenda:          ["12px", { lineHeight: "1.4"  }], // font-medium (500)
  "valor-destaque": ["24px", { lineHeight: "1.2"  }], // font-bold + tabular-nums
}
```

| Nome (utilitário `text-*`) | Uso | Peso |
|---|---|---|
| `text-display` | Título de página (`<h1>` do header) | `font-bold` |
| `text-titulo-secao` | Título de card/seção | `font-semibold` |
| `text-titulo-card` | Nome de módulo, subtítulo de card | `font-semibold` |
| `text-corpo` | Texto padrão, inputs, botões | `font-normal` |
| `text-corpo-pequeno` | Célula de tabela, texto denso | `font-normal` |
| `text-legenda` | Label de campo, meta-informação | `font-medium` |
| `text-valor-destaque` | Valor de KPI (preço, custo) | `font-bold tabular-nums` |

- Pesos permitidos: 400 / 500 / 600 / 700. Não usar 300 nem 800+.
- Números monetários/medidas usam `tabular-nums` (utilitário Tailwind
  `tabular-nums`).

## 4. Escala de espaçamento (`theme.extend.spacing`)

Base **4px**. A escala default do Tailwind já é 4px-based
(`p-1`=4px, `p-2`=8px, `p-3`=12px, `p-4`=16px, `p-6`=24px, `p-8`=32px,
`p-12`=48px, `p-16`=64px), então **os tokens nomeados da v1 mapeiam
diretamente para utilitários existentes** — não é obrigatório criar aliases,
mas para preservar a nomenclatura do contrato registramos aliases opcionais:

```ts
spacing: {
  xs: "4px", sm: "8px", md: "12px", lg: "16px",
  xl: "24px", "2xl": "32px", "3xl": "48px", "4xl": "64px",
}
```

| Token / utilitário nomeado | Default Tailwind equivalente | Valor |
|---|---|---|
| `gap-xs` / `p-xs` | `gap-1` / `p-1` | 4px |
| `gap-sm` / `p-sm` | `gap-2` / `p-2` | 8px |
| `gap-md` / `p-md` | `gap-3` / `p-3` | 12px |
| `gap-lg` / `p-lg` | `gap-4` / `p-4` | 16px |
| `gap-xl` / `p-xl` | `gap-6` / `p-6` | 24px |
| `gap-2xl` | `gap-8` | 32px |
| `gap-3xl` | `gap-12` | 48px |
| `gap-4xl` | `gap-16` | 64px |

Aplicação padrão: padding interno de card = `p-lg` (16px) no desktop; gap
entre campos de um grid = `gap-sm` (8px); gap entre cards empilhados =
`gap-lg` (16px); os 5 cards do accordion do editor usam `gap-sm` (8px) entre
si (ver Seção 6.4).

## 5. Raios e elevação (`theme.extend.borderRadius` + `boxShadow`)

```ts
borderRadius: {
  sm: "6px",   // input, select, chip
  md: "8px",   // botão, badge
  lg: "12px",  // card, painel (== --radius do shadcn)
  xl: "16px",  // contêiner de canvas/preview, modal
  full: "999px",
},
boxShadow: {
  xs: "0 1px 2px rgba(15,23,42,0.04)",
  sm: "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
  md: "0 4px 6px -1px rgba(15,23,42,0.08), 0 2px 4px -2px rgba(15,23,42,0.04)",
  lg: "0 10px 15px -3px rgba(15,23,42,0.1), 0 4px 6px -4px rgba(15,23,42,0.05)",
}
```

Uso: `rounded-lg` (card), `rounded-md` (botão), `rounded-sm` (input),
`rounded-full` (pill/barra), `shadow-xs` (card em repouso), `shadow-sm`
(hover), `shadow-md` (dropdown/popover), `shadow-lg` (modal). Sombras são
necessárias no tema claro para separar camadas (não há mais fundo escuro
para contraste).

## 6. Componentes: mapa para shadcn/ui + spec Tailwind

Regra geral de instalação: componentes shadcn/ui são adicionados via CLI
(`npx shadcn@latest add <componente>`), que copia o código-fonte para
`components/ui/` (não é dependência de runtime — é código versionado no
projeto, que o Frontend Engineer pode ajustar). Cada componente shadcn é
então estilizado pelos tokens das Seções 2–5 via `class-variance-authority`
(cva) no próprio arquivo do componente. Onde não há equivalente shadcn, o
item é **componente customizado sobre primitivos Tailwind**.

### 6.1 Botão → shadcn `Button` (variantes customizadas)

`npx shadcn@latest add button`. Redefinir as variantes do cva para:

- **`primary`** (default): `bg-accent text-cinza-0 hover:bg-accent-hover
  active:bg-accent-active`, altura `h-9` (36px), `px-[14px]`, `rounded-md`,
  `text-corpo font-medium`, `transition-colors duration-[120ms]`.
  Focus-visible: `ring-2 ring-accent-subtle ring-offset-0 border-accent`.
  Disabled: `bg-cinza-200 text-cinza-400 cursor-not-allowed`.
- **`ghost`**: `bg-transparent border border-cinza-300 text-cinza-700
  hover:bg-cinza-100`. Disabled: `text-cinza-400 border-cinza-200`.
- **`danger`**: `bg-transparent border border-cinza-300 text-cinza-700`
  em repouso (não vermelho por padrão) → `hover:border-erro hover:text-erro
  hover:bg-erro-subtle`.
- **`size="sm"`** (ações de linha de tabela/card): `h-7` (28px), `px-[10px]`,
  `text-corpo-pequeno`.
- **`size="icon"`** (toolbar de seleção do canvas): `h-8 w-8` (32×32),
  `rounded-md`, ghost por padrão; **estado ativo/selecionado** (prop
  `data-active` ou variante `iconActive`): `bg-accent-subtle
  border-accent-border text-accent`.

### 6.2 Card de painel → shadcn `Card`

`npx shadcn@latest add card`. `bg-cinza-0 border border-cinza-200
rounded-lg p-lg shadow-xs` (desktop) / `p-md` (<768px). Gap entre cards
empilhados `gap-lg`. Título (`CardTitle`): `text-titulo-secao text-cinza-900`
**sem** caixa-alta (o `.card h2` atual é 12px uppercase muted — muda para dar
hierarquia, alinhado ao estilo Linear/Notion).

### 6.3 Card de módulo colapsável (`BoxModuloCard`, `TemplateModuloCard`, `ResumoModulo` em `app/page.tsx`)

Sobre o `Card` da 6.2 (sem primitivo shadcn dedicado — é composição):

- **Expandido** (em edição): `bg-cinza-0 border-cinza-200 rounded-lg p-lg
  shadow-xs`. Cabeçalho: nome em `text-titulo-card` + select de parede +
  ações à direita.
- **Colapsado/"salvo"** (`ResumoModulo`): `bg-cinza-50 p-md border-cinza-200
  rounded-lg`. Card inteiro clicável para reabrir → `hover:border-accent-border
  hover:bg-cinza-100 cursor-pointer`.
- Linha de ações (Salvar/Duplicar/Excluir): `flex gap-sm justify-end`, com
  `flex-wrap` abaixo de 768px (nunca cortar botão da viewport).

### 6.4 Accordion do editor (`SecaoHeader` + 5 cards em `/modulo`) → shadcn `Accordion` (referência) ou composição própria

`npx shadcn@latest add accordion` como referência de acessibilidade
(aria, teclado). O comportamento atual do projeto (`aberta`/`onAbrir` em
`SecaoHeader.tsx`, uma seção aberta por vez, "Salvar" avança) já é um
accordion controlado — o Frontend Engineer pode envolver o primitivo shadcn
ou só aplicar os tokens ao componente existente, desde que teclado/aria
funcionem. Spec visual:

- Contêiner: casca do `Card` (6.2).
- **Header aberta (etapa atual)**: `bg-cinza-0 text-titulo-card text-cinza-900
  border-b border-cinza-200 cursor-default`.
- **Header colapsada (etapa salva)**: `bg-cinza-50 text-corpo font-medium
  text-cinza-600` + badge "editar" `text-accent` com ícone lápis (lucide
  `Pencil`, 12px), `cursor-pointer hover:bg-cinza-100`.
- Corpo: `p-lg`, gap vertical entre campos `gap-md`.
- Entre os 5 cards empilhados: `gap-sm` (8px) — reforça que são etapas de um
  fluxo, distinto do `gap-lg` de cards independentes.

### 6.5 Indicador de progresso (stepper) — componente NOVO, sem equivalente shadcn direto

Não existe hoje. **Componente customizado sobre primitivos Tailwind** (o
`Progress` do shadcn cobre só a barra do fallback mobile, não o stepper
horizontal). Usado tanto no `NovoModuloWizard` (Ambiente→Tipo→Modelo) quanto
no accordion do editor:

- **Desktop (≥768px)**: stepper horizontal. Cada etapa é um círculo `h-6 w-6`
  (24px) `rounded-full border-2`, conectado por linha `h-px`.
  - Pendente: `border-cinza-300 bg-cinza-0 text-cinza-400`.
  - Atual: `border-accent bg-accent-subtle text-accent font-semibold`.
  - Concluída: `bg-accent border-accent` + ícone check branco (lucide
    `Check`, 14px); linha de conexão até ela em `bg-accent`.
  - Rótulo abaixo: `text-legenda text-cinza-600` (pendente/atual) /
    `text-cinza-900` (concluída).
- **<768px**: colapsa para rótulo `text-corpo-pequeno` ("Passo 2 de 3 —
  Tipo") + barra fina `h-1 rounded-full` (trilho `bg-cinza-200`,
  preenchimento `bg-accent`) — evita overflow horizontal do stepper completo.
- Ícones: **lucide-react** (dependência adicionada na Seção 9 — substitui a
  decisão da v1 de SVG inline, já que shadcn/ui usa lucide como padrão e a
  migração o torna disponível de qualquer forma).

### 6.6 Canvas / preview (`BoxCanvas`, `ModulePreview`, `PlanoCorteCanvas`, `LayoutVisualizer`) — sem equivalente shadcn

**Componente customizado** (é `<canvas>`/SVG de desenho técnico). Só o
contêiner e a toolbar recebem tokens:

- Contêiner: `bg-cinza-50 border border-cinza-200 rounded-md p-sm
  max-w-full` (nunca vazar da viewport).
- **Modo laboratório**: vão hover → contorno tracejado 2px `accent`; vão
  selecionado → contorno sólido 2px `accent` + fundo `accent-subtle`.
- **Modo comercial** (produção, read-only): linhas finas 1px `cinza-400`, sem
  contorno técnico nem rótulo (comportamento `comercial` já existente — só
  atualiza a cor da linha).
- Toolbar de modos: botões `size="icon"` da 6.1, `flex gap-sm flex-wrap`.

### 6.7 Campo de formulário → shadcn `Input` + `Select` + `Label`

`npx shadcn@latest add input select label`. Input/select: `h-9 px-[10px]
border border-cinza-300 rounded-sm bg-cinza-0 text-corpo`. Focus:
`border-accent ring-2 ring-accent-subtle`. Disabled: `bg-cinza-100
text-cinza-400 border-cinza-200`. Erro: `border-erro ring-2 ring-erro-subtle`.
`Label`: `text-legenda text-cinza-500 mb-1`, caixa normal.

### 6.8 KPI (`.kpi` / `.kpi.destaque`) — composição sobre `Card`

Sem primitivo shadcn dedicado. `p-md`–`p-lg rounded-lg border border-cinza-200
bg-cinza-0`. Rótulo: `text-legenda text-cinza-500`. Valor: `text-valor-destaque
text-cinza-900 tabular-nums`. **`.kpi.destaque`** (preço final): `bg-accent-subtle
border-accent-border`, valor em `text-accent` (não mais verde).

### 6.9 Tabela → shadcn `Table`

`npx shadcn@latest add table`. Cabeçalho: `bg-cinza-50 text-legenda
font-semibold uppercase tracking-[0.03em] text-cinza-500 border-b
border-cinza-200`. Linha: `px-[10px] py-2 text-corpo-pequeno border-b
border-cinza-100 hover:bg-cinza-50`. Colunas numéricas: `text-right
tabular-nums`. Subtotal (proposta): `bg-cinza-50 border-t-2 border-cinza-300
font-bold`. Em telas estreitas: envolver em `overflow-x-auto` próprio (nunca
overflow do `body`).

### 6.10 Aviso / alerta → shadcn `Alert`

`npx shadcn@latest add alert`. `px-[10px] py-2 border-l-[3px] rounded-r
text-corpo-pequeno text-cinza-800`. Variantes: aviso (`border-l-aviso
bg-aviso-subtle`), erro (`border-l-erro bg-erro-subtle`), sucesso
(`border-l-sucesso bg-sucesso-subtle`).

### 6.11 Documento de proposta (`/proposta`, `proposta.css`)

**Fica fora do Tailwind utility-first**, por decisão técnica: é um documento
de impressão com `@media print` e paginação A4, onde CSS dedicado é mais
legível e controlável que utility classes espalhadas (regras de quebra de
página, margens de papel, ocultar elementos na impressão). `proposta.css`
**permanece como arquivo CSS**, mas: (a) passa a consumir as CSS variables de
token definidas na Task 5.1 (`var(--accent)`, `var(--cinza-900)` etc.) em vez
de hex hardcoded, eliminando a paleta paralela; (b) aplica a fonte Inter
carregada globalmente. Assim o documento fica consistente com o resto do
produto sem forçar utility classes onde CSS declarativo é superior.

## 7. Breakpoints (`theme.extend.screens`) e "não quebrar"

Prioridade real é desktop — componentes desenhados a partir de ≥1280px,
degradando para baixo. Screens do Tailwind ajustados aos pontos da v1:

```ts
screens: {
  sm:  "480px",  // mobile → tablet retrato
  md:  "768px",  // ponto de quebra para 1 coluna
  lg:  "960px",  // laptop/tablet paisagem
  xl:  "1280px", // desktop (referência de design)
}
```

| Faixa | Comportamento |
|---|---|
| `≥ xl` (1280px) | Grid 2 colunas, densidade máxima, stepper horizontal completo |
| `lg–xl` (960–1279) | Mesmo layout 2 colunas, gaps internos reduzidos (`xl:gap-6` → `gap-4`) |
| `< md` (768px) | `.grid` vira 1 coluna, cards empilhados |
| `< sm` (480px) | Botões/inputs largura total, toolbars `flex-wrap`, stepper compacto (6.5) |

**"Não quebrar" (critério de aceitação de toda task visual)**:

1. Nenhum overflow horizontal do `body` em qualquer largura ≥ 360px —
   conteúdo mais largo (tabela, plano de corte) fica em `overflow-x-auto`
   próprio.
2. Nenhum elemento sobreposto abaixo de 768px — toolbars usam `flex-wrap`,
   nunca `overflow-hidden` escondendo ação.
3. Abaixo de 768px, grid de 2 colunas vira 1 coluna (produção e editor).
4. Canvas/preview tem `max-w-full` e preserva proporção em qualquer largura.
5. Toda seleção do canvas funciona por toque simples (`onClick`) — nenhuma
   função exige `hover` como único caminho.

## 8. Decisão de stack: Tailwind + shadcn/ui (APROVADA pelo operador)

**Decisão do operador em 2026-07-21**: migrar a camada de apresentação de CSS
puro + `style={{}}` inline para **Tailwind CSS + shadcn/ui**. Isto alinha o
projeto ao próprio framework .maestro — o persona `frontend-engineer.md` já
define Tailwind + shadcn/ui como stack obrigatória, então o projeto estava
desalinhado até aqui, e esta migração corrige a divergência.

Consequências assumidas (registradas, não são perguntas em aberto):

- A migração é uma **reescrita da camada de apresentação** de todos os `.tsx`
  do projeto (dezenas de blocos `style={{}}` em `app/page.tsx` ~1300 linhas,
  `app/modulo/page.tsx`, os 5 Cards do editor, `biblioteca/page.tsx`). Por
  isso a Stage 5 do Backlog (setup + fundação) é bloqueador único, e as
  Stages 6–9 fazem a conversão página por página, cada uma validada por Code
  Auditor + UX Auditor antes do merge — reduzindo o risco de regressão num
  produto já funcional.
- `proposta.css` é a única exceção que **permanece CSS** (ver 6.11) —
  documento de impressão.

## 9. Dependências e arquivos de configuração (entrada da Task 5.1)

**Dependências a instalar** (o Frontend Engineer confirma versões compatíveis
com Next.js 14.2.x / React 18 no momento da execução):

- Runtime/estilização: `tailwindcss`, `postcss`, `autoprefixer` (devDeps);
  `class-variance-authority`, `clsx`, `tailwind-merge` (deps — usados pelo
  código gerado do shadcn); `lucide-react` (dep — ícones, padrão do shadcn e
  substituto do "SVG inline" da v1); `tailwindcss-animate` (dep — usado pelas
  animações dos componentes shadcn).
- shadcn/ui **não** é um pacote npm: é inicializado via `npx shadcn@latest
  init` e cada componente é adicionado via `npx shadcn@latest add <nome>`,
  copiando código para `components/ui/`.

**Arquivos de configuração a criar**:

| Arquivo | Conteúdo |
|---|---|
| `tailwind.config.ts` | `content` cobrindo `app/**`, `components/**`; `theme.extend` com os tokens das Seções 2–7; plugin `tailwindcss-animate` |
| `postcss.config.js` | `tailwindcss` + `autoprefixer` |
| `app/globals.css` | Substituir o tema escuro atual por `@tailwind base/components/utilities` + `@layer base` com as CSS variables semânticas do shadcn (Seção 2.4) apontando para os hex desta paleta |
| `components.json` | Config do shadcn CLI (style, paths, alias `@/components`, `@/lib/utils`) — o alias `@/*` já existe em `tsconfig.json`, confirmar |
| `lib/utils.ts` | Função `cn()` (`clsx` + `tailwind-merge`) usada por todo componente shadcn |
| `app/layout.tsx` | Inter via `next/font/google`, expondo `--font-inter`; aplicar `font-sans` no `<body>` |

**Nota de convivência com o ESLint (Task 2.1, já mesclada)**: a config
`.eslintrc.json` atual (`next/core-web-vitals`) continua válida; opcionalmente
adicionar `eslint-plugin-tailwindcss` para ordenar classes, mas isso é
refinamento, não requisito da migração.
