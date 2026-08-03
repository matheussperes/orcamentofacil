# Design System — orcamentofacil (v3 — identidade "OrçaFácil")

> **Substitui integralmente** a v2 (2026-07-21, tema claro/neutro estilo
> Linear/Notion — ver histórico do git para essa versão). Reescrito pelo
> Product Designer em 2026-07-28 a partir de:
> - 12 mockups de alta fidelidade em `docs/Imagem das Telas/` (fonte
>   primária de todo token visual deste documento);
> - a descrição da logo oficial "OrçaFácil" fornecida pelo operador no chat
>   (fonte **mais autoritativa** para a paleta de marca — ver Seção 2.9);
> - `docs/Mapa-de-Telas.md` (árvore de navegação, já fechada, não
>   questionada aqui);
> - `docs/Modelo-de-Dominio.md` Seções 2.1 e 8 (engrossamento e sentido do
>   veio — usadas só para calibrar o que a Seção 9 precisa comunicar
>   visualmente);
> - `tailwind.config.ts` atual (estado do código antes desta revisão — ver
>   Seção 1).
>
> Este documento é o contrato único de valores visuais para o Frontend
> Engineer e o UX Auditor. Nenhuma task deve introduzir cor, espaçamento,
> raio, sombra ou tamanho de fonte fora do que está aqui. Ambiguidade aqui
> gera veto de UX mais tarde.

## 0. Direcionamento do operador (não reinterpretar)

1. **Nova direção visual (2026-07-28)**: adotar o visual das 12 imagens de
   referência como padrão — **sidebar escura navy/quase-preto** com item
   ativo em **laranja**, laranja como cor de destaque/ação primária, cards
   claros no conteúdo principal, uso extenso de badges/chips de status
   coloridos, gráficos (linha + donut) no dashboard. Isto **substitui** o
   tema claro/neutro azul da v2 por completo — não é uma variação dele.
2. **Sem 3D real.** O mockup `Editor de Item.png` mostra um render 3D
   fotorrealista com toggle 2D/3D e texturas de madeira realistas. O
   operador **rejeitou explicitamente** esse caminho: contradiz a decisão já
   fechada do `docs/PRD.md` ("painel de orçamento... sem exigir modelagem
   3D"). Só o desenho técnico **2D** existe (`BoxCanvas.tsx`,
   `ElevacaoParede.tsx`, `PlanoCorteCanvas`), mas fica **mais elegante**:
   cores simulando o material real (tons de madeira/MDF aproximados, não
   cinza técnico genérico), traço mais refinado. **Nunca** vira renderização
   3D nem fotorrealismo. Ver Seção 9 — distinção documentada em detalhe para
   não ser mal-interpretada por um Frontend Engineer futuro que veja o
   mockup rejeitado.
3. **Usuário-alvo**: marceneiro/lojista profissional. Desktop é a
   prioridade real (densidade de informação e produtividade); mobile/tablet
   são suporte — não podem quebrar, mas não são otimizados como experiência
   primária. (Herdado da v2 — não reaberto.)
4. **Stack de apresentação**: Tailwind CSS + shadcn/ui. **Decisão fechada,
   não reaberta nesta revisão** — só os valores de token mudam (Seção 13).
5. **IA/navegação**: `docs/Mapa-de-Telas.md` já bate 100% com os 12 mockups
   (mesma árvore). Não questionada aqui — este documento só define como cada
   tela daquele mapa se parece.

## 1. Estado do código antes desta revisão

`tailwind.config.ts` já implementa a paleta clara/azul da v2 (escala
`cinza`, `accent` azul `#2563EB`, semânticas `sucesso`/`erro`/`aviso`,
`fontSize`, `spacing`, `borderRadius`, `boxShadow`, `screens`) — produto de
Stages 5–13 já mescladas (rotas `/`, `/modulo`, `/biblioteca`, `/proposta`,
`/ambientes` já convertidas para Tailwind + shadcn/ui). **Este documento
redefine os valores dessas mesmas chaves** (não o mecanismo): a migração
Tailwind/shadcn continua válida, mas o Frontend Engineer precisa atualizar
`tailwind.config.ts` e recolorir os componentes já construídos para os
tokens novos desta Seção 2 em diante — isso é retrofit e é decisão futura do
Maestro (fora do escopo deste artefato, que só especifica o alvo).

## 2. Paleta de cores

### 2.1 Neutros (escala `cinza`) — mantida da v2, sem alteração

Continua válida porque já é uma escala neutra fria compatível com o
conteúdo claro dos 12 mockups (fundo de página, cards, texto). Nenhuma
mudança de valor.

```ts
cinza: {
  0:   "#FFFFFF", // superfície de card, popover, modal
  50:  "#F8FAFC", // fundo de página (área de conteúdo, fora da sidebar)
  100: "#F1F5F9", // hover de linha de tabela, badge neutro (bg), fundo de header de tabela
  200: "#E2E8F0", // borda padrão de card/input/tabela
  300: "#CBD5E1", // borda em destaque (hover de card, divisor forte)
  400: "#94A3B8", // texto terciário/placeholder, ícone inativo em fundo claro
  500: "#64748B", // texto secundário (muted), labels, badge neutro (texto)
  600: "#475569", // texto secundário forte, breadcrumb intermediário
  700: "#334155", // texto em componente escuro pontual
  800: "#1E293B", // reservado
  900: "#0F172A", // texto primário (títulos, valores, corpo) — quase preto
}
```

### 2.2 Navy (escala `marinho`) — NOVA, cor de superfície da sidebar

Extraída da sidebar escura visível em todos os 12 mockups e confirmada pela
logo oficial (Seção 2.9) como cor de marca, não decisão estética solta do
Product Designer.

```ts
marinho: {
  900: "#0E1420", // fundo principal da sidebar e do rodapé do PDF de proposta
  800: "#141B2B", // painel interno elevado dentro da sidebar (cards "Dica do dia"/"Indique e ganhe")
  700: "#1B2436", // linha de navegação ativa (bg) / hover de linha na sidebar
  600: "#232C3F", // divisor/borda dentro da sidebar
  300: "#8D96A8", // texto e ícone de item de navegação inativo
}
```

> Nota de contraste: branco (`#FFFFFF`) sobre `marinho-900` ≈ 18.7:1;
> `marinho-300` (`#8D96A8`) sobre `marinho-900` ≈ 6.8:1 — ambos acima do
> mínimo AA (4.5:1) para texto normal.

`marinho` é **cor de superfície fixa da sidebar**, não um "modo escuro"
alternável — ver nota na Seção 2.8.

### 2.3 Laranja (`accent`) — NOVA cor de destaque, substitui o azul da v2

O laranja dos mockups (botões primários, item ativo da sidebar, wordmark
"Fácil" da logo) tem contraste insuficiente para texto branco em cima dele
quando usado no tom "vívido" que aparece pontualmente (logo, ícones sobre
fundo escuro): `#D97706` sobre branco dá só ≈3.2:1, abaixo do 4.5:1exigido
para texto normal em botão preenchido. **Decisão de calibração** (a marca
define o matiz, a acessibilidade define a luminosidade exata do tom usado
como fundo de botão): dois tons do mesmo laranja — um "acionável" (mais
escuro, para fundo de botão com texto branco) e um "vívido" (o tom de marca
exato, para logo/ícone/indicador sobre fundo escuro ou fundo muito claro,
nunca como fundo atrás de texto branco pequeno).

```ts
accent: {
  DEFAULT: "#B45309", // botão primário, link ativo, foco — fundo com texto branco (contraste ≈5.0:1)
  hover:   "#92400E", // hover de botão/link primário
  active:  "#78350F", // estado pressionado
  subtle:  "#FFF3E0", // fundo tintado (chip, ícone de KPI, hover de linha ativa, badge "Enviado")
  border:  "#F3C88F", // borda de elemento tintado em accent-subtle
  vivid:   "#D97706", // tom de marca exato — SÓ para: logo/wordmark, ícone ativo da sidebar (sobre marinho-900),
                       // indicador (barra esquerda) do item ativo da sidebar, linha de gráfico, contorno de
                       // seleção do canvas técnico. NUNCA como fundo de botão com texto branco em cima.
}
```

Justificativa do valor-base: `#D97706` é o laranja que aparece na sidebar
ativa, no wordmark "Fácil" e nos botões de CTA dos 12 mockups e é confirmado
pela logo oficial como cor de marca (Seção 2.9) — `accent.DEFAULT` é uma
variação um passo mais escura da mesma família, não uma cor nova.

### 2.4 Semânticas

```ts
sucesso:    { DEFAULT: "#16A34A", subtle: "#F0FDF4", border: "#86EFAC" }, // "Aprovado", "Ativo", deltas positivos (+18,6%)
erro:       { DEFAULT: "#DC2626", subtle: "#FEF2F2", border: "#FCA5A5" }, // ações destrutivas, validação Tier 1 violada (bloqueante)
aviso:      { DEFAULT: "#A16207", subtle: "#FFFBEB", border: "#FDE68A" }, // validação Tier 2 (não bloqueante) — atenção que não é erro nem seleção
informacao: { DEFAULT: "#2563EB", subtle: "#EFF6FF", border: "#BFDBFE" }, // ícone "ⓘ", status "Em andamento", KPI icon azul
roxo:       { DEFAULT: "#7C3AED", subtle: "#F3E8FF", border: "#DDD6FE" }, // status "Fechado", KPI icon roxo, tag de categoria
```

> Nota: `informacao` reaproveita o hex que era o `accent` (azul) da v2 —
> deixa de ser cor de marca/ação e passa a ser puramente semântica
> (informativo/neutro-frio), já que o laranja assumiu o papel de destaque.

**Decisão explícita sobre `aviso` (correção de auditoria — o token estava
ausente nesta seção na primeira versão do documento, embora já citado na
Seção 7.13)**: `aviso` **não** reaproveita `accent.vivid` (`#D97706`),
apesar de os mockups usarem esse laranja como cor "de atenção" em alguns
lugares. Motivo: `accent`/`accent.vivid` já são, por definição desta v3, a
cor de **ação primária e de seleção/destaque no canvas técnico** (Seção 9.3
— hover e seleção de módulo usam `accent-vivid`). Se `aviso` usasse o mesmo
hex, um destaque de "Tier 2: aviso, não bloqueante" no canvas ficaria
visualmente idêntico a "módulo selecionado" — ambiguidade real, não
cosmética. `aviso.DEFAULT` (`#A16207`, dourado/amarelo-mostarda, contraste
≈4.9:1 sobre branco — passa AA 4.5:1 como texto) é deliberadamente deslocado
para o lado amarelo do espectro, distinto tanto do vermelho de `erro`
quanto do laranja de `accent`, preservando a leitura convencional de
severidade (erro vermelho > aviso amarelo) sem colidir com a cor de marca.
`aviso.subtle` reaproveita o `#FFFBEB` que já era `aviso.subtle` na v2
(mesmo tom, sem mudança).

> **Nota de retrofit para o Frontend Engineer**: `app/components/BoxCanvas.tsx`
> (Task 13.2a, já mesclada) hoje hardcoda `AVISO = "#D97706"` (mesmo valor
> de `accent.vivid`) para a severidade `"aviso"` de `EngineWarning`, com um
> `AVISO_SUBTLE` próprio. Esse hardcode **colide** com o token de marca por
> acidente de implementação — exatamente o risco que motivou a decisão
> acima. Atualizar `BoxCanvas.tsx` para consumir `aviso.DEFAULT`/
> `aviso.subtle` desta seção é retrofit futuro, fora do escopo deste
> documento, mas fica registrado aqui para não ser esquecido.

### 2.5 Paleta de status de orçamento (badges) — mapeamento canônico

Os mockups mostram duas fontes de cor para o mesmo conjunto de status
(legenda do donut "Orçamentos por status" no Dashboard vs. chips da lista
"Orçamentos recentes") **e elas não batem entre si** (ex.: o donut usa azul
para "Rascunho" e verde para "Enviado"; a lista usa cinza para "Rascunho" e
azul para "Enviado"). Isto é inconsistência do mockup estático, não uma
regra deliberada — **decisão do Product Designer**: fixar um mapeamento
único, determinístico, usado em toda a UI (donut, chips, lista, filtros):

| Status | Fundo | Texto | Token |
|---|---|---|---|
| Rascunho | `cinza-100` `#F1F5F9` | `cinza-600` `#475569` | neutro — ainda não tem ação pendente |
| Em andamento | `informacao-subtle` `#EFF6FF` | `informacao` `#2563EB` | informativo — trabalho em progresso |
| Enviado | `accent-subtle` `#FFF3E0` | `accent` `#B45309` | atenção — aguardando resposta do cliente |
| Aprovado | `sucesso-subtle` `#F0FDF4` | `sucesso` `#16A34A` | positivo — cliente aceitou |
| Fechado | `roxo-subtle` `#F3E8FF` | `roxo` `#7C3AED` | arquivado/finalizado — distinto de "aprovado" |
| Recusado | `erro-subtle` `#FEF2F2` | `erro` `#DC2626` | negativo — cliente não aceitou |

Mesmo mapeamento de cor para o donut do Dashboard (fatias na mesma ordem e
cor da tabela acima) e para qualquer filtro de status em `/orcamentos`.

**Token de `Recusado`** reaproveita o par semântico `erro`/`erro-subtle` já
definido na Seção 2 (mesmo hex usado em validação Tier 1 do canvas técnico e
em `Alert`/`Input` de erro — Seções 7.9/7.13/9). Não há conflito de
contexto: "erro" ali significa violação de regra técnica bloqueante,
"Recusado" aqui significa desfecho comercial negativo — são leituras
diferentes do mesmo sinal "algo deu errado/não vingou", e o produto já usa
`erro` como cor semântica única para negativo em qualquer contexto (nunca
uma segunda cor "vermelho" concorrente). Reaproveitar é o correto; criar um
sexto tom só para este badge duplicaria semântica sem ganho.

**Origem dos badges "Em andamento" e "Fechado"** (nota atualizada — a
pendência de Q-15 foi resolvida pelo Data Architect, `Modelo-de-Dominio.md`
§7.2). Os dois não são valores do enum `status`: são rótulos visuais
derivados de `etapaEsteira` via `rotuloDoCard(status, etapaEsteira)` — ver
§7.2 para a função completa. Nesta tabela isso não muda nada visualmente:
`Em andamento` e `Fechado` mantêm exatamente os tokens já fixados acima; a
única mudança é que o card agora sabe de onde tirar o rótulo (de
`etapaEsteira` quando ela estiver em `visita_agendada` / `projeto_3d` /
`aguardando_aprovacao` / `fechado`; do `status` comercial quando
`etapaEsteira === "novo"`). `Rascunho`, `Enviado`, `Aprovado` e `Recusado`
continuam vindo direto do `status`.

### 2.6 Paleta de ícone de KPI (dashboard, catálogo)

Os cards de KPI ("FATURAMENTO", "TOTAL DE PRODUTOS" etc.) usam um quadrado
com cantos arredondados (`rounded-lg`, 12px) atrás do ícone, tintado por
categoria — não é status, é só variedade visual entre os N KPIs de uma
mesma tela. Cores fixas, na ordem em que aparecem da esquerda para a
direita (reaproveitando os tokens já definidos, sem criar paleta nova):

| Posição/uso observado | Fundo do quadrado | Cor do ícone |
|---|---|---|
| 1ª KPI (Faturamento / Total de produtos) | `accent-subtle` `#FFF3E0` | `accent` `#B45309` |
| 2ª KPI (Lucro / Chapas) | `sucesso-subtle` `#F0FDF4` | `sucesso` `#16A34A` |
| 3ª KPI (Orçamentos / Ferragens) | `informacao-subtle` `#EFF6FF` | `informacao` `#2563EB` |
| 4ª KPI (Ticket médio / LEDs) | `roxo-subtle` `#F3E8FF` | `roxo` `#7C3AED` |
| 5ª KPI (Acessórios, quando houver) | `#FCE7F3` (novo, só para este caso) | `#DB2777` (novo, "rosa") |

Registra-se um 5º par apenas para o caso de 5 KPIs na mesma linha
(Catálogo tem 5): `rosa: { subtle: "#FCE7F3", DEFAULT: "#DB2777" }` —
uso exclusivo de ícone de KPI, não usar como status nem em outro contexto.

### 2.7 Paleta de material técnico (canvas) — ver Seção 9

Tokens dedicados ao desenho técnico (elevação de parede, plano de corte,
editor de item), documentados por completo na Seção 9 — não fazem parte da
paleta de UI geral e não devem ser usados em botão/badge/texto.

### 2.8 Mapeamento para as CSS variables semânticas do shadcn/ui

Mesma mecânica da v2 (`app/globals.css`, `@layer base`, hex direto —
Task do Frontend Engineer decide o formato final de armazenamento). Mapa
semântico atualizado:

| Variável shadcn | Token deste documento |
|---|---|
| `--background` | `cinza-50` `#F8FAFC` (fundo de página — não mais branco puro, ver mockups) |
| `--foreground` | `cinza-900` `#0F172A` |
| `--card` / `--popover` | `cinza-0` `#FFFFFF` |
| `--muted` | `cinza-100` `#F1F5F9` |
| `--muted-foreground` | `cinza-500` `#64748B` |
| `--border` / `--input` | `cinza-200` `#E2E8F0` |
| `--primary` | `accent` `#B45309` |
| `--primary-foreground` | `cinza-0` `#FFFFFF` |
| `--ring` | `accent` `#B45309` (anel de foco) |
| `--destructive` | `erro` `#DC2626` |
| `--radius` | `0.75rem` (12px = `--radius-lg`, ver Seção 5) |

A sidebar **não** usa as variáveis semânticas acima — ela é um componente
de layout com cor fixa (`marinho-900`), independente de tema. Ver 2.9.

### 2.9 Nota sobre modo escuro e a logo oficial da marca

Não há modo escuro alternável do conteúdo principal nesta fase (os 12
mockups mostram só conteúdo claro; o seletor "Tema: Claro" visível em
`/perfil` é preenchimento de mockup — implementar um toggle de tema real
**fica fora de escopo**, igual à v2). A sidebar escura **não é** dark mode:
é um componente de marca com cor fixa, presente em toda tela
independentemente de qualquer preferência de tema do usuário.

**Logo oficial "OrçaFácil"** (fonte fornecida pelo operador no chat em
2026-07-28 — tratada como autoridade final de cor de marca, mais confiável
que estimativa de pixel nos mockups, embora os mockups já usem esta mesma
paleta na sidebar, o que é confirmação cruzada):

- **Ícone**: monograma "OF" estilizado como forma de pasta/livro/armário
  (referência a marcenaria), contorno grosso de cantos arredondados, com um
  pequeno acento laranja no canto inferior direito (aparência de
  dobra/gaveta).
- **Wordmark**: "Orça" + "Fácil" na mesma família (visual geométrico bold,
  tipo Poppins/Montserrat Bold) — "Orça" na cor de base do lockup, "Fácil"
  sempre em `accent.vivid` (`#D97706`).
- **Tagline**: "ORÇAMENTOS INTELIGENTES PARA MÓVEIS PLANEJADOS", caixa alta,
  letter-spacing largo, com traço fino laranja decorativo ao lado.
- Linha vertical fina separando ícone de wordmark+tagline.

**Duas variantes de lockup, uso fixo por contexto** (não são tema
claro/escuro do produto — são a variante de logo correta para o fundo onde
ela é aplicada):

| Variante | Ícone/contorno | "Orça" | "Fácil" | Tagline | Onde usar |
|---|---|---|---|---|---|
| Fundo claro | contorno `marinho-900` | `marinho-900` | `accent.vivid` | `marinho-900` | Header da Proposta em PDF (fundo branco), tela de login/cadastro no painel de formulário (lado direito, fundo branco) |
| Fundo escuro | contorno branco/`cinza-300` | branco `#FFFFFF` | `accent.vivid` | branco/`cinza-300` | Topo da sidebar (todas as telas autenticadas), painel esquerdo de login/cadastro (fundo `marinho-900` com foto), rodapé do PDF de proposta |

**Asset disponível**: o operador salvou os dois arquivos em
`public/logo/logo-light.png` (variante fundo claro) e
`public/logo/logo-dark.png` (variante fundo escuro) — conferidos pelo
Maestro pixel a pixel contra a descrição acima, batem exatamente. O
Frontend Engineer usa esses arquivos diretamente (`next/image`, `alt="OrçaFácil"`)
em vez de recriar o lockup em SVG/CSS — não há necessidade de um SVG
vetorial próprio enquanto o PNG atende (ambos em resolução suficiente para
o tamanho de uso na sidebar/header; reavaliar se algum contexto exigir
upscaling maior).

## 3. Tipografia

Família mantida da v2 — **Inter**, via `next/font/google`, self-hosted,
exposta como `--font-inter`. Nenhuma mudança de stack de fonte: o visual
geométrico bold da logo é tratado como elemento de marca isolado (SVG/PNG
da logo, não uma segunda família de corpo de texto a carregar).

```ts
fontFamily: {
  sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system",
         "Segoe UI", "Roboto", "sans-serif"],
}
```

Escala — mantida da v2, com um tamanho novo (`valor-destaque-lg`) para o
total de proposta/pré-pedido, que aparece visivelmente maior que o valor de
KPI padrão nos mockups (`Orçamento - Proposta.png`, `Orçamento - Corte e
Material.png`):

```ts
fontSize: {
  display:             ["28px", { lineHeight: "1.25" }], // font-bold (700) — título de página
  "titulo-secao":       ["20px", { lineHeight: "1.3"  }], // font-semibold (600) — título de card/seção
  "titulo-card":        ["16px", { lineHeight: "1.4"  }], // font-semibold (600) — nome de item, subtítulo
  corpo:                ["14px", { lineHeight: "1.5"  }], // font-normal (400) — texto padrão, inputs, botões
  "corpo-pequeno":      ["13px", { lineHeight: "1.5"  }], // font-normal (400) — célula de tabela, texto denso
  legenda:              ["12px", { lineHeight: "1.4"  }], // font-medium (500) — label de campo, meta-informação, header de tabela
  "valor-destaque":     ["24px", { lineHeight: "1.2"  }], // font-bold + tabular-nums — valor de KPI padrão
  "valor-destaque-lg":  ["32px", { lineHeight: "1.15" }], // font-bold + tabular-nums — total de proposta/pré-pedido (destaque máximo de uma tela)
}
```

| Nome (`text-*`) | Uso | Peso |
|---|---|---|
| `text-display` | Título de página (`<h1>` do header, "Dashboard", "Catálogo de Produtos") | `font-bold` |
| `text-titulo-secao` | Título de card/seção ("Resumo financeiro", "Plano de corte") | `font-semibold` |
| `text-titulo-card` | Nome de item/módulo, subtítulo de card | `font-semibold` |
| `text-corpo` | Texto padrão, inputs, botões, breadcrumb | `font-normal` |
| `text-corpo-pequeno` | Célula de tabela, texto denso, descrição de KPI | `font-normal` |
| `text-legenda` | Label de campo, cabeçalho de tabela (uppercase), meta-informação, badge | `font-medium` |
| `text-valor-destaque` | Valor de KPI padrão (preço, custo, margem) | `font-bold tabular-nums` |
| `text-valor-destaque-lg` | Total final de destaque único por tela (total de proposta, total do pré-pedido) | `font-bold tabular-nums` |

Pesos permitidos: 400 / 500 / 600 / 700 (mesmo limite da v2 — a logo em
"bold geométrico" é asset de marca isolado, não abre novo peso de corpo).
Números monetários/medidas usam `tabular-nums` sempre.

## 4. Escala de espaçamento

Mantida integralmente da v2 (nenhum mockup contradiz a escala base-4px já
validada):

```ts
spacing: {
  xs: "4px", sm: "8px", md: "12px", lg: "16px",
  xl: "24px", "2xl": "32px", "3xl": "48px", "4xl": "64px",
}
```

Aplicação padrão (confirmada pelos mockups):
- Padding interno de card de conteúdo: `p-xl` (24px) — mockups usam
  respiro mais generoso que a v2 (que usava `p-lg`/16px); os cards do
  Dashboard/Catálogo/Financeiro têm claramente mais ar interno.
- Gap entre KPI cards e entre widgets de dashboard: `gap-xl` (24px).
- Gap entre campos de formulário dentro de uma seção: `gap-md` (12px);
  entre seções de um formulário longo (Perfil, Cadastro): `gap-xl` (24px).
- Padding interno da sidebar: `p-lg` (16px) nas laterais, `gap-xs` (4px)
  entre itens de navegação consecutivos.
- Padding de célula de tabela: `px-md py-sm` (12px/8px).

## 5. Raios e elevação

```ts
borderRadius: {
  sm:   "6px",   // input, select, ícone pequeno
  md:   "8px",   // botão, badge não-pill, dropdown item
  lg:   "12px",  // card, painel, quadrado de ícone de KPI (== --radius do shadcn)
  xl:   "16px",  // contêiner de canvas/preview, modal, thumbnail de imagem grande
  full: "999px", // pill de status/badge, avatar, barra de progresso
},
boxShadow: {
  xs: "0 1px 2px rgba(15,23,42,0.04)",
  sm: "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
  md: "0 4px 6px -1px rgba(15,23,42,0.08), 0 2px 4px -2px rgba(15,23,42,0.04)",
  lg: "0 10px 15px -3px rgba(15,23,42,0.1), 0 4px 6px -4px rgba(15,23,42,0.05)",
  sidebar: "1px 0 0 0 rgba(0,0,0,0.4)", // borda-sombra sutil entre sidebar e conteúdo (substitui border, já que ambos os lados têm cor sólida diferente)
}
```

Uso: `rounded-lg` (card, ícone de KPI), `rounded-md` (botão, badge não-pill),
`rounded-sm` (input), `rounded-full` (pill de status, avatar, progress bar),
`shadow-xs` (card em repouso), `shadow-sm` (hover de card), `shadow-md`
(dropdown/popover), `shadow-lg` (modal).

## 6. Layout global (shell): sidebar + topbar + conteúdo

Estrutura presente em toda tela autenticada (todos os mockups exceto
login/cadastro/PDF), fixa em três regiões:

- **Sidebar** (esquerda, fixa): largura `264px` (`≥ xl`), `bg-marinho-900`,
  altura total da viewport, não rola independente do conteúdo em desktop.
  Contém, de cima para baixo: lockup da logo (variante fundo escuro, Seção
  2.9) + `p-lg`; lista de itens de navegação (ícone 20px + label
  `text-corpo font-medium`, altura de linha `40px`, `rounded-md`,
  `gap-xs` entre itens); um espaço flexível; card de promoção (ver 7.15);
  divisor (`border-t marinho-600`); linha de usuário atual (avatar 32px +
  nome + org + chevron, clicável → dropdown de conta).
- **Topbar** (linha superior da área de conteúdo, `bg-cinza-0`,
  `border-b cinza-200`, altura `72px`): à esquerda, título da página
  (`text-display`) + subtítulo opcional (`text-corpo text-cinza-500`) **ou**
  breadcrumb quando dentro de um orçamento/item (`Orçamento #1247 >
  Editor de item`, separador `/` em `cinza-400`); à direita, botão(ões) de
  ação secundária (`ghost`/`outline`), botão "Ajuda" (`outline`, ícone "?"),
  sino de notificação (ver 7.16), seletor de organização (ver 7.17), e a
  ação primária da tela em destaque (`accent`, ex.: "Novo orçamento",
  "Fechar orçamento", "Salvar alterações") quando existir.
- **Conteúdo**: `bg-cinza-50`, `p-xl` (24px), rola independente da sidebar.
  Largura de referência de design: `1536px` (viewport dos mockups); grid
  principal em 12 colunas onde aplicável (ex.: 4 KPIs, 3 widgets).

**Colapso da sidebar abaixo de `md` (768px)**: vira drawer sobreposto
(off-canvas), acionado por botão hambúrguer que substitui o título da
topbar; overlay `rgba(15,23,42,0.5)` atrás do drawer. Nunca fica sempre
visível ocupando largura de tela abaixo de `md` (ver critério "não quebrar"
na Seção 10).

## 7. Componentes: mapa para shadcn/ui + spec Tailwind

### 7.1 Botão → shadcn `Button`

- **`primary`** (default): `bg-accent text-cinza-0 hover:bg-accent-hover
  active:bg-accent-active`, `h-9` (36px) / `h-10` (40px) para CTA de topbar
  em destaque ("Novo orçamento", "Fechar orçamento"), `px-4`, `rounded-md`,
  `text-corpo font-medium`, `transition-colors duration-120`. Focus-visible:
  `ring-2 ring-accent-subtle border-accent`. Disabled: `bg-cinza-200
  text-cinza-400 cursor-not-allowed`.
- **`outline`**: `bg-cinza-0 border border-cinza-300 text-cinza-700
  hover:bg-cinza-100`. Usado para ações secundárias de topbar ("Salvar",
  "Ajuda", "Ver histórico").
- **`ghost`**: `bg-transparent text-cinza-600 hover:bg-cinza-100`. Ícones de
  ação em linha de tabela (editar, menu "⋮").
- **`destructive`**: `bg-transparent border border-cinza-300 text-cinza-700`
  em repouso → `hover:border-erro hover:text-erro hover:bg-erro-subtle`
  (ex.: "Remover item"). Confirmação sempre via diálogo (7.11) antes de
  executar.
- **`size="sm"`**: `h-8` (32px), `px-3`, `text-corpo-pequeno`.
- **`size="icon"`**: `h-8 w-8` (32×32), `rounded-md`, ghost por padrão;
  estado ativo/selecionado (toolbar do canvas — "Selecionar/Mover/Régua/
  Elemento/Conjunto/Medir"): `bg-accent-subtle border border-accent-border
  text-accent`.

### 7.2 Card de conteúdo → shadcn `Card`

`bg-cinza-0 border border-cinza-200 rounded-lg p-xl shadow-xs` (desktop) /
`p-lg` (<768px). Gap entre cards empilhados `gap-xl`. Título (`CardTitle`):
`text-titulo-secao text-cinza-900`, sem caixa-alta.

### 7.3 KPI Card — composição sobre `Card`, sem primitivo shadcn dedicado

`p-lg rounded-lg border border-cinza-200 bg-cinza-0`. Estrutura: rótulo
`text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500` no
topo; quadrado de ícone `40×40px rounded-lg` tintado por posição (Seção
2.6), alinhado à esquerda do rótulo ou acima do valor conforme o mockup da
tela; valor em `text-valor-destaque text-cinza-900` (ou
`text-valor-destaque-lg` quando for o único destaque da tela); linha de
variação abaixo, opcional: seta + percentual, `text-corpo-pequeno
font-medium`, cor `sucesso` (▲) ou `erro` (▼), seguida de
`text-cinza-500` ("vs mês anterior").

### 7.4 Sidebar de navegação — componente NOVO, custom (sem primitivo shadcn)

Ver estrutura completa na Seção 6. Item de navegação:
- **Inativo**: `text-marinho-300`, ícone `text-marinho-300` 20px,
  `hover:bg-marinho-700 hover:text-cinza-0 rounded-md`.
- **Ativo**: `bg-marinho-700 text-cinza-0 rounded-md`, barra vertical de
  `3px` à esquerda em `accent-vivid` (posicionada fora do padding, encostada
  na borda esquerda da sidebar), ícone em `accent-vivid`.
- Transição de hover/ativo: `transition-colors duration-120`.

### 7.5 Topbar — componente NOVO, custom

Ver estrutura completa na Seção 6. Breadcrumb: `text-corpo text-cinza-500`,
segmento atual em `text-cinza-900 font-medium`, separador `/` em
`cinza-400 mx-xs`.

### 7.6 Badge/Chip de status → shadcn `Badge` (variantes customizadas)

`px-[10px] py-[2px] rounded-full text-legenda font-medium` (pill —
`rounded-full`, não `rounded-md`, diferente da v2). Variantes = mapeamento
da Seção 2.5 (`rascunho`, `em-andamento`, `enviado`, `aprovado`, `fechado`,
`recusado`) + variante genérica `neutro` (`cinza-100`/`cinza-600`, usada para "Global"
na Biblioteca) e `sucesso-solido` (usada para "Ativo" no Catálogo e "Seu
módulo" na Biblioteca: `bg-sucesso-subtle text-sucesso`).

### 7.7 Tabela → shadcn `Table`

Cabeçalho: `bg-cinza-50 text-legenda font-semibold uppercase
tracking-[0.03em] text-cinza-500 border-b border-cinza-200 px-md py-sm`.
Linha: `px-md py-sm text-corpo-pequeno border-b border-cinza-100
hover:bg-cinza-50`. Colunas numéricas/monetárias: `text-right tabular-nums`.
Linha de subtotal/total (lista de material, plano de corte): `bg-cinza-50
border-t-2 border-cinza-300 font-bold`. Ação em linha: ícones `ghost` 7.1
(editar = lápis, menu = "⋮" → `DropdownMenu`). Em telas estreitas: envolver
em `overflow-x-auto` próprio.

### 7.8 Tabs → shadcn `Tabs`

Usado em: abas do orçamento (Ambientes/Corte & Material/Financeiro/
Proposta), abas do catálogo (Todos/Chapas/Ferragens/LEDs/Acessórios/
Outros), abas do perfil (Dados da empresa/Usuários/Configurações globais),
abas da biblioteca (Todos/Módulos-caixa/Placas). Estilo "underline", não
"pill": trigger inativo `text-corpo font-medium text-cinza-500
border-b-2 border-transparent hover:text-cinza-700`; trigger ativo
`text-accent border-b-2 border-accent`. Ícone opcional à esquerda do
label (16px). `flex gap-lg` entre triggers, `border-b border-cinza-200` no
contêiner inteiro da lista de tabs.

### 7.9 Campo de formulário → shadcn `Input` + `Select` + `Label`

Input/select: `h-10 px-3 border border-cinza-300 rounded-sm bg-cinza-0
text-corpo`. Ícone opcional à esquerda (envelope, cadeado — login):
`pl-9`, ícone `text-cinza-400` 16px. Focus: `border-accent ring-2
ring-accent-subtle`. Disabled: `bg-cinza-100 text-cinza-400
border-cinza-200`. Erro: `border-erro ring-2 ring-erro-subtle` + mensagem
abaixo `text-corpo-pequeno text-erro`. `Label`: `text-legenda
text-cinza-500 mb-1`.

### 7.10 Switch/Toggle → shadcn `Switch`

Usado em "Mostrar veios" (Corte & Material) e nos toggles de elemento
contínuo (tampo/rodapé/tamponamento na aba Ambientes). Track off:
`bg-cinza-300`; track on: `bg-accent`; thumb: `bg-cinza-0` `shadow-sm`,
`20px`, transição `duration-120`.

### 7.11 Modal/Diálogo → shadcn `Dialog`

Overlay `bg-cinza-900/50`. Painel: `bg-cinza-0 rounded-xl shadow-lg p-xl`,
largura máxima `480px` (confirmação) ou `720px` (formulário). Título
`text-titulo-secao`. Rodapé com ações: `flex justify-end gap-sm` — botão
secundário (`outline`) à esquerda do primário/destrutivo. **Toda
confirmação destrutiva** (remover item, excluir ambiente, remover produto
do catálogo) passa por este componente — nunca `window.confirm` nativo.

**Exclusão de organização (Q-13) — o caso de maior severidade, um passo a
mais.** Fonte: `Modelo-de-Dominio.md` §7.3.

> **Papel exigido (Q-17, respondida).** Só o papel `admin`/dono pode disparar
> a exclusão de organização. Para qualquer outro papel, o botão "Excluir
> organização" no perfil aparece `disabled` (padrão da Seção 7.1:
> `bg-cinza-200 text-cinza-400 cursor-not-allowed`) com `Tooltip` (token da
> Seção 7.14: `bg-cinza-900 text-cinza-0 rounded-md px-sm py-xs
> text-corpo-pequeno shadow-md`) explicando "Só o administrador da
> organização pode excluir a conta."

Excluir a conta apaga a
organização inteira em cascata (todos os usuários, clientes, catálogo,
gabaritos próprios, orçamentos com ambientes/paredes/linhas de
proposta/listas de material) — é a única operação destrutiva multi-tabela
do produto e a única sem qualquer forma de desfazer (sem soft-delete, sem
lixeira, sem prazo de retenção). O padrão-base de confirmação destrutiva
(nomear o que será perdido, deixar por escrito que é irreversível) **não
basta sozinho** aqui: some tudo com um clique dentro de um `Dialog` é risco
alto demais para um erro de "cliquei sem ler". Este `Dialog` usa o mesmo
componente, com dois reforços adicionais, padrão comum em exclusões
catastróficas de produtos B2B:

- **Corpo do diálogo** nomeia a organização e o escopo completo:
  "Isso vai apagar permanentemente a organização **`<nome da organização>`**
  — todos os usuários, clientes, orçamentos, catálogo de produtos e
  gabaritos próprios. Esta ação não pode ser desfeita." (regra de UX
  Writing da Seção 11, sem tom alarmista, apenas fatos.)
- **Campo de confirmação por digitação**: `Input` (7.9) abaixo do corpo,
  rótulo "Digite **`<nome da organização>`** para confirmar", placeholder
  vazio (não pré-preenchido — copiar/colar o nome não deve ser mais fácil
  que digitá-lo). O botão primário/destrutivo do rodapé (`destructive`
  sólido: `bg-erro text-cinza-0 hover:bg-erro/90`, diferente do
  `destructive` outline padrão da 7.1 — a severidade máxima justifica o
  contraste maior) permanece `disabled` até o texto digitado bater
  exatamente com o nome da organização.
- **Rodapé**: botão secundário `outline` "Cancelar" + botão destrutivo
  sólido "Excluir organização" (rótulo explícito, não "Excluir" sozinho).

Este é o **único** ponto do produto que usa o campo de digitação como
reforço — nenhuma outra confirmação destrutiva do produto (remover item,
excluir ambiente, remover produto) precisa dele; o padrão simples de nomear
+ irreversível já basta para essas, que afetam uma linha, não um tenant
inteiro.

### 7.12 Toast → shadcn `Toast`/`Sonner`

Fundo escuro para contraste com o produto majoritariamente claro (reforça
identidade — mesma família de cor da sidebar): `bg-marinho-900
text-cinza-0 rounded-lg shadow-lg px-lg py-md`, ícone de status à esquerda
(`sucesso`/`erro`/`informacao`, 20px), texto `text-corpo`, ação opcional em
`accent-vivid` à direita ("Desfazer"). Posição: canto inferior direito.
Auto-dismiss em 5s (sucesso/informação); erro permanece até fechado
manualmente.

### 7.13 Alert/Banner informativo → shadcn `Alert`

Usado nos boxes "ⓘ" recorrentes (Corte & Material, Financeiro, Ambientes).
`bg-informacao-subtle border-l-[3px] border-l-informacao rounded-r-md
px-md py-sm text-corpo-pequeno text-cinza-800`, ícone "ⓘ" `text-informacao`
16px à esquerda. Variantes `erro` (`border-l-erro bg-erro-subtle
text-erro` no ícone), `sucesso` (`border-l-sucesso bg-sucesso-subtle
text-sucesso`) e `aviso` (`border-l-aviso bg-aviso-subtle text-aviso` —
token da Seção 2.4, **não** `accent`) trocam só a cor do ícone/borda; o
corpo do texto continua `text-cinza-800` em todas as variantes (mesmo
padrão da v2). Uso de `aviso` neste componente: lista de `EngineWarning[]`
de severidade não bloqueante (validação Tier 2) em `/orcamento/[id]`
aba Ambientes, ao lado dos `Alert` variante `erro` para Tier 1 bloqueante —
as duas variantes aparecem juntas na mesma lista e precisam ser
distinguíveis à primeira vista.

### 7.13.1 Aviso de orçamento congelado + ação "Reabrir" (Q-16)

> Fonte: `Modelo-de-Dominio.md` §5.4.1 (invariante I6) e §7.2 (T2). Congelar
> não bloqueia edição — avisa. Reabrir descongela e volta a etapa da esteira
> para `aguardando_aprovacao`; é ação com consequência real, tratada com o
> mesmo rigor de uma confirmação destrutiva.

> **Papel exigido (Q-18, respondida).** Só o papel `admin`/dono pode reabrir
> um orçamento congelado. O botão "Reabrir orçamento" só aparece/fica
> habilitado para esse papel; para qualquer outro papel, o `Alert` (7.13)
> permanece visível como aviso, sem a ação — não exibe o botão nem em estado
> `disabled`, já que aqui o próprio texto do aviso já comunica o estado
> congelado sem precisar de um controle que o usuário não pode acionar.

Quando o usuário tenta editar um orçamento com `congeladoEm !== null`
(ambientes, itens, linhas de proposta), a aba/tela exibe um `Alert` (7.13)
no topo do conteúdo editável — reaproveita os tokens já existentes, **sem
cor nova**:

- Variante `aviso`: `border-l-aviso bg-aviso-subtle`, ícone `AlertTriangle`
  `text-aviso` 16px (mesma variante já usada para `EngineWarning` Tier 2 —
  este é o mesmo nível de severidade: chama atenção, não bloqueia).
- Texto segue a regra de UX Writing da Seção 11 (o que aconteceu + o que
  fazer, sem tom alarmista) e reaproveita a mensagem **W-C1** do domínio:
  "Esta proposta está congelada desde `<data>`. Suas alterações não mudam
  os valores até você reabrir o orçamento."
- Ação à direita do texto do `Alert`: botão `outline` `size="sm"`, rótulo
  **"Reabrir orçamento"** (verbo + objeto, Seção 11).
- O `Alert` permanece fixo enquanto `congeladoEm !== null` — não é
  auto-dismiss (diferente do Toast da 7.12); ele só some quando o orçamento
  é reaberto ou recongelado altera o estado da tela.

Clicar em "Reabrir orçamento" abre o `Dialog` da 7.11 (mesmo componente das
confirmações destrutivas, não um segundo padrão):

- Título: "Reabrir orçamento?"
- Corpo: "Os valores desta proposta voltam a ser recalculados a cada
  alteração até você congelar de novo. O valor atual congelado deixa de ser
  exibido." — nomeia a consequência real (deixa de valer o valor congelado),
  sem alarmismo de "perda de dados" porque I6 preserva o `valorRateado`
  antigo em banco (não é irreversível no sentido de apagar histórico, mas
  **é** uma mudança de estado visível ao cliente se a proposta já foi
  enviada — por isso passa por confirmação, não é um clique único).
- Rodapé: botão secundário `outline` "Cancelar" + botão primário `bg-accent`
  "Reabrir orçamento" (não é `destructive` — reabrir não apaga nada, é
  reversível recongelando; usa a cor de ação primária, não `erro`).

### 7.14 Gráficos (Dashboard) — Recharts (ou equivalente), sem primitivo shadcn

- **Linha** ("Evolução de faturamento"): linha `stroke-accent-vivid`
  (`#D97706`) `2px`, área de preenchimento abaixo com gradiente
  `accent-vivid` a 16% de opacidade no topo até 0% na base, pontos
  `fill-accent-vivid` `4px`, grid horizontal `stroke-cinza-100`, eixo
  `text-legenda text-cinza-500`.
- **Donut** ("Orçamentos por status"): fatias na ordem e cor da Seção 2.5
  (cinza/informação/accent/sucesso/roxo), espessura de anel proporcional a
  ~28% do raio, valor total centralizado (`text-valor-destaque`) + rótulo
  (`text-corpo-pequeno text-cinza-500`), legenda lateral com ponto colorido
  `8px` + label + contagem + percentual.
- Tooltip de hover: `bg-cinza-900 text-cinza-0 rounded-md px-sm py-xs
  text-corpo-pequeno shadow-md`.

### 7.15 Card de promoção da sidebar ("Dica do dia" / "Indique e ganhe")

`bg-marinho-800 rounded-lg p-md`, ícone 20px em `accent-vivid` dentro de
círculo `bg-marinho-700`, título `text-corpo font-semibold text-cinza-0`,
corpo `text-corpo-pequeno text-marinho-300`, link/CTA em `accent-vivid
font-medium` com seta →. Botão-fechar opcional (`X` 14px,
`text-marinho-300`) no canto superior direito quando o card é dispensável
(ex.: "Dica do dia" no Dashboard, que aparece fora da sidebar também — ver
7.13 variante flutuante).

### 7.16 Sino de notificação

Botão ícone `size="icon"` ghost, contador em círculo `18px` `bg-accent
text-cinza-0 text-[11px] font-bold`, posicionado `absolute -top-1 -right-1`.
Painel de notificações ao clicar: `DropdownMenu`/`Popover` `w-[360px]`,
lista de itens com ícone de tipo, texto, timestamp relativo.

### 7.17 Seletor de organização (topbar)

Botão `outline`-like sem borda visível (`bg-cinza-100 hover:bg-cinza-200
rounded-md px-md h-9`), ícone de prédio/empresa 16px + nome da organização
(`text-corpo font-medium`) + chevron-down 14px `text-cinza-400`. Dropdown
associado lista organizações do usuário (multi-tenant) + "Criar nova
organização".

### 7.18 Paginação

`flex items-center gap-xs`. Botão de página: `h-8 w-8 rounded-md
text-corpo-pequeno text-cinza-600 hover:bg-cinza-100`; ativa:
`bg-accent text-cinza-0 font-medium`. Setas prev/next: `size="icon"` ghost,
desabilitadas nos extremos. Texto de contagem à esquerda ("Mostrando 1 a 6
de 482 produtos"): `text-corpo-pequeno text-cinza-500`.

### 7.19 Thumbnail de imagem (produto/módulo/render de linha de proposta)

`aspect-square` (catálogo/biblioteca) ou `aspect-[4/3]` (linha de
proposta), `rounded-md object-cover border border-cinza-200`,
`bg-cinza-100` como placeholder enquanto carrega (ver Seção 8).

### 7.20 Pager de item ("Item anterior / Item X de N / Próximo item")

Rodapé fixo do Editor de Item: `border-t border-cinza-200 px-xl py-md
flex items-center justify-between bg-cinza-0`. Botões `ghost` com ícone
seta + label (`text-corpo-pequeno`); centro mostra `text-corpo-pequeno
text-cinza-500` ("Item 3 de 8") + botão grid (`size="icon"` ghost) para
abrir visão geral dos itens do ambiente.

### 7.21 Progress bar (aproveitamento de chapa)

shadcn `Progress`: track `bg-cinza-200 rounded-full h-2`, preenchimento
`bg-sucesso rounded-full` quando representa aproveitamento/utilização
(conotação positiva), `bg-accent` quando representa progresso genérico
(carregamento, wizard). Rótulo percentual ao lado, `text-corpo-pequeno
font-medium tabular-nums`.

### 7.22 Documento de proposta (`/proposta/[id]/pdf`)

**Fica fora do Tailwind utility-first**, mesma decisão técnica da v2 (CSS
dedicado para paginação A4/impressão). Atualização de tokens: cabeçalho e
rodapé do documento usam `marinho-900` como fundo com a logo variante
fundo escuro (Seção 2.9); corpo do documento permanece `cinza-0`/`cinza-50`
com texto `cinza-900`; valores monetários em destaque usam `accent-vivid`
(ex.: total da proposta); citação de destaque ("Soluções personalizadas
que unem...") em card `bg-marinho-900 text-cinza-0 rounded-lg p-lg`,
aspas decorativas em `accent-vivid`.

## 8. Estados (loading / vazio / erro / preenchido)

Todo componente de listagem/tabela/canvas/KPI dos Blueprints precisa dos
quatro estados abaixo — tratamento genérico documentado uma vez, aplicado
por tipo de componente:

- **Preenchido**: o padrão especificado nas Seções 6–7.
- **Carregando (loading)**: skeleton — retângulos `bg-cinza-100
  rounded-md animate-pulse` na forma exata do conteúdo final (linha de
  tabela vira barra `h-4`; KPI card vira bloco `h-6 w-24` para o valor e
  `h-3 w-16` para o rótulo; thumbnail vira `bg-cinza-100` sem imagem).
  Nunca layout shift entre skeleton e conteúdo real (mesma altura/grid).
  Canvas técnico (Seção 9) em loading: contêiner com o mesmo
  `bg-cinza-50 border-cinza-200`, ícone de régua centralizado em
  `text-cinza-300`, sem desenho.
- **Vazio**: ícone 32px `text-cinza-300` centralizado, título
  `text-titulo-card text-cinza-700` (ex.: "Nenhum orçamento ainda"),
  descrição `text-corpo-pequeno text-cinza-500` (o que apareceria ali) +
  botão `primary` com a ação de preenchimento (ex.: "Novo orçamento").
  Aplica-se a: lista de orçamentos, lista de clientes, biblioteca sem
  módulos na categoria filtrada, ambiente sem paredes, parede sem itens
  posicionados, plano de corte sem chapas ainda calculadas, linhas de
  proposta antes de "Adicionar linha".
- **Erro**: `Alert` variante erro (7.13) substituindo o conteúdo ou acima
  dele quando parcial, com o texto seguindo a regra de UX Writing (Seção
  11) — o que aconteceu + o que fazer — e botão `outline` "Tentar
  novamente" quando a ação for re-executável (recalcular custos,
  reotimizar plano de corte, detectar conjuntos).

## 9. Canvas / ilustração técnica 2D — SEM 3D (seção crítica)

> **Leia antes de tocar em `BoxCanvas.tsx`, `ElevacaoParede.tsx` ou
> `PlanoCorteCanvas`**: o mockup `Editor de Item.png` mostra um painel
> "Visualização 3D" com botões Frontal/Traseira/Esquerda/Direita/Explodida
> e um render fotorrealista com textura de madeira e sombra de profundidade.
> **Essa direção foi explicitamente rejeitada pelo operador** — contradiz
> `docs/PRD.md` ("sem exigir modelagem 3D"). O que segue é a **tradução
> obrigatória** desse mockup para 2D: os mesmos botões de ângulo existem,
> mas cada um é uma **projeção ortográfica 2D plana** (elevação frontal,
> elevação traseira, elevação lateral esquerda/direita, diagrama explodido
> 2D com peças separadas por espaçamento no plano) — nunca uma câmera 3D,
> nunca perspectiva, nunca sombra volumétrica, nunca textura fotográfica.
> Se uma implementação futura adicionar rotação de câmera, iluminação ou
> qualquer biblioteca de renderização 3D (three.js, react-three-fiber etc.)
> a este componente, ela está violando este documento e o PRD — reportar,
> não implementar.

### 9.1 O que muda em relação à v2 (traço técnico → traço "elegante")

A v2 especificava traço técnico genérico (linhas cinza-400 finas, sem cor
de material). A v3 mantém o desenho **estritamente 2D e ortográfico**, mas:

- Preenchimento de cada peça usa a **cor aproximada do material real**
  (Seção 9.2), não mais um cinza técnico plano — é o que torna o desenho
  "mais elegante" sem virar 3D.
- Traço de contorno mais fino e mais quente (`#4A3F33`, não mais
  `cinza-400`/`#94A3B8`) — lê como "linha de caderno de marcenaria", não
  como wireframe de CAD genérico.
- Hardware (dobradiça, puxador, corrediça) desenhado como forma vetorial
  simples e reconhecível (retângulo arredondado, círculo, linha dupla) na
  cor `material-metal`, nunca ícone fotográfico.
- Sombra permitida: **só sombra de contato 2D rasa** (`0 1px 2px
  rgba(0,0,0,0.08)` no contêiner do canvas inteiro, igual à Seção 5) para
  separar o desenho do fundo da página — nunca sombra projetada por peça
  simulando profundidade/volume 3D.

### 9.2 Paleta de material (canvas técnico) — nova, isolada da paleta de UI

```ts
material: {
  claro:      "#F1E9DA", // MDF branco/TX, laminado claro — porta/lateral clara
  bancada:    "#E4DED2", // bancada/pedra clara, tampo
  medio:      "#D3A46C", // madeira média (carvalho, freijó) — a maioria dos módulos dos mockups
  escuro:     "#9C6B3E", // madeira escura (nogueira, imbuia) — acabamento premium
  metal:      "#B8BEC7", // eletrodoméstico embutido, dobradiça, puxador, corrediça
  vidro:      "#CFE3F0", // janela, porta de vidro
  vidroBorda: "#8FB8CE", // moldura da janela/vidro
  linha:      "#4A3F33", // contorno técnico (stroke) — usar sobre qualquer fill acima
}
```

Regra de aplicação: a cor de cada peça vem do **material real cadastrado no
catálogo** quando disponível (ex.: "MDF Carvalho" → `material.medio`); na
ausência de correspondência exata, usa-se `material.medio` como default
neutro (a maioria dos módulos nos mockups é madeira média) — nunca
default para `material.claro` puro-branco, que fica reservado a MDF branco
explícito.

### 9.3 Elevação de parede (`ElevacaoParede.tsx`) — aba Ambientes

- Contêiner: `bg-cinza-50 border border-cinza-200 rounded-md p-sm
  max-w-full shadow-xs`, régua de largura no topo (`stroke-cinza-400`,
  ticks a cada segmento, rótulo `text-legenda tabular-nums text-cinza-600`).
- Faixas (rodapé/bancada/aéreo/torre): linha guia horizontal tracejada
  `stroke-cinza-300`, rótulo à esquerda `text-legenda text-cinza-500`.
- Módulos/placas posicionados: preenchidos com a paleta de material (9.2),
  contorno `material.linha` `1.5px`.
- Elementos de parede (janela/porta/tomada/hidráulico): ícone vetorial
  simples na posição real, janela em `material.vidro` +
  `material.vidroBorda`; tomada/interruptor/ponto hidráulico como ícone de
  linha 16px `text-cinza-600` com "olho" (👁 → ícone `Eye` lucide) para
  reexibir.
- **Hover** de módulo: contorno tracejado `2px accent-vivid`.
- **Selecionado**: contorno sólido `2px accent-vivid` + 4 handles de canto
  (`8px` quadrado, `bg-cinza-0 border-2 border-accent-vivid`).
- **Validação em tempo real (Tier 1/2, `EngineWarning[]` do motor)**:
  destaque de módulo distinto do estado de seleção acima — usa a paleta
  semântica da Seção 2.4, nunca `accent`/`accent-vivid`, para não ser
  confundido com "selecionado":
  - **Tier 1 (bloqueante — não cabe, sobrepõe, invade elemento de parede;
    `severidade: "erro"`)**: contorno sólido `2px erro` (`#DC2626`) +
    preenchimento `erro-subtle` a 40% de opacidade sobre o módulo afetado.
  - **Tier 2 (não bloqueante — ex.: quase no limite, recomendação;
    `severidade: "aviso"`)**: contorno tracejado `2px aviso` (`#A16207`) +
    preenchimento `aviso-subtle` a 40% de opacidade.
  - Ambos os contornos usam traço mais espesso que o hover (`2px` igual ao
    selecionado, mas cor semântica, não laranja) para permanecerem visíveis
    mesmo quando o módulo também está selecionado (a seleção some ao trocar
    de módulo; o alerta de validação persiste até ser corrigido) — nesse
    caso de sobreposição, o contorno de validação (erro/aviso) fica por
    fora do contorno de seleção (accent-vivid), como dois anéis
    concêntricos, para as duas informações coexistirem sem se cancelar.
  - Ícone de severidade (opcional, canto superior direito do módulo
    afetado): `AlertTriangle` (lucide) 14px, `text-erro` ou `text-aviso`
    conforme o caso, com tooltip do texto de `EngineWarning.mensagem`.
- **Conjunto detectado** (contorno/colchete acima de módulos adjacentes):
  linha `stroke-informacao` `1.5px` com colchete nas extremidades,
  rótulo "Conjunto N (M módulos)" `text-legenda text-informacao` — cor
  informação (azul), não laranja, para não competir visualmente com o
  estado selecionado (laranja).
- **Handle de junção** (união/quebra entre módulos): círculo `20px`
  `bg-cinza-0 border-2 border-informacao` centralizado na linha divisória
  entre dois módulos de um conjunto, ícone de elo dentro (`Link`/`Unlink`
  lucide 12px).
- Ponto de interação central de cada módulo (ícone "+"): círculo `24px`
  `bg-cinza-0/90 border border-cinza-300`, ícone `+` `text-cinza-500` —
  vira `text-accent-vivid border-accent-vivid` no hover.
- Modo comercial (produção, read-only): mesma paleta de material, mas sem
  contorno técnico de seleção nem rótulos de handle — só o desenho limpo.

### 9.4 Plano de corte (`PlanoCorteCanvas`) — aba Corte & Material

- Cada chapa: contêiner `border border-cinza-300 rounded-sm bg-cinza-0`,
  dimensão da chapa no canto superior direito (`text-legenda tabular-nums
  text-cinza-500`).
- Peças dentro da chapa: preenchidas com `material.claro`/`material.medio`/
  `material.escuro` conforme o material real da peça (nunca cores
  arbitrárias por peça — a cor identifica o material, reforçando leitura
  de "quanto de cada chapa foi usado"), contorno `material.linha` `1px`,
  rótulo centralizado (`nome curto` + `dimensão`) em `text-corpo-pequeno
  text-cinza-800`, truncado com reticências se não couber.
- **Seta de sentido do veio** (Modelo de Domínio Seção 8): quando a peça
  tem `sentidoVeio` definido, desenhar uma seta dupla fina
  (`stroke-cinza-600`, `1.5px`) sobreposta ao centro da peça, na direção do
  veio — clicável para inverter (cursor `pointer`, tooltip "Inverter
  sentido do veio"). Sem veio (`temVeio: false` no material): sem seta.
- Área de sobra (não utilizada): `bg-cinza-100` hachurado (padrão diagonal
  `repeating-linear-gradient`, `cinza-200`/`cinza-100`, 4px), rótulo
  "Sobra" `text-legenda text-cinza-400`.
- Barra de aproveitamento (7.21): `bg-sucesso` quando ≥70%, `bg-accent`
  entre 40–70%, `bg-erro` abaixo de 40% (limiares como decisão do Product
  Designer — não estavam explícitos no mockup, mas o produto já tem o dado
  percentual e o operador pediu leitura rápida de eficiência).

### 9.5 Editor de Item — painel de "visualização" (2D, nunca 3D)

Renomear o rótulo do painel de "Visualização 3D" (mockup rejeitado) para
**"Visualização 2D"** no Frontend Engineer. Os botões de ângulo
(Frontal/Traseira/Esquerda/Direita/Explodida) mudam de "câmera 3D" para
"projeção 2D":

- **Frontal/Traseira/Esquerda/Direita**: elevação ortográfica 2D da face
  correspondente do módulo/placa, mesma paleta de material da 9.2, mesmo
  traço `material.linha`. Portas/gavetas/nichos desenhados como retângulos
  com puxador vetorial simples (`material.metal`) na posição configurada.
  Toggle de ângulo: `size="icon"` da 7.1, ativo em `accent`.
- **Explodida**: variante 2D onde as peças do módulo são desenhadas
  separadas entre si por um gap fixo (`24px` no espaço do desenho, não
  literal) ao longo de uma linha guia tracejada, preservando a mesma
  paleta de material — é um diagrama de montagem plano, não uma cena 3D
  com profundidade de câmera.
- **Dimensões detalhadas** (abaixo do desenho principal): mantém o estilo
  técnico de cotagem já existente (linhas de extensão `cinza-400`, seta de
  medida, rótulo `tabular-nums text-cinza-700`) — sem alteração de v2 além
  da paleta de material nas peças cotadas.
- Painel "Materiais" (lista lateral: Estrutura/Frentes/Fundo/Costas) usa a
  mesma pastilha de cor de material (quadrado `16px rounded-sm` com a cor
  `material.*` correspondente) ao lado do nome do material, para reforçar
  visualmente a ligação entre a lista e o desenho.

### 9.6 `ModuleViewer` — exceção pontual e estreita: 3D estático, não decorativo, decidida pelo operador (2026-07-31)

> **Isto NÃO reabre a proibição da Seção 9.** A regra "SEM 3D" continua
> valendo por completo para `BoxCanvas.tsx`, `ElevacaoParede.tsx` e
> `PlanoCorteCanvas` — nenhum dos três ganha câmera, iluminação realista ou
> biblioteca 3D. O que segue especifica **um componente novo e isolado**,
> `ModuleViewer`, autorizado pelo operador com escopo técnico já fechado por
> ele mesmo (câmera ortográfica fixa, sem `OrbitControls`, sem rotação livre,
> sem perspectiva — confirmado em `docs/Modelo-de-Dominio.md` Seção 4.1, que
> já valida não exigir dado novo de domínio). **Não é precedente**: nenhum
> outro lugar do produto ganha 3D sem nova decisão explícita e igualmente
> estreita do operador. Se um Frontend Engineer futuro encontrar este
> `ModuleViewer` e concluir que "3D já está liberado, dá para usar em outro
> canvas" — está errado; reportar, não estender.

**Onde aparece na tela**: dentro do painel de visualização do Editor de Item
(Seção 9.5), como um **segundo modo do mesmo painel**, não uma tela nova nem
um componente solto. O cabeçalho do painel ganha um seletor de modo estilo
`Tabs` "underline" (mesmo componente e mesmos estilos de trigger da Seção
7.8 — inativo `text-corpo font-medium text-cinza-500 border-b-2
border-transparent`, ativo `text-accent border-b-2 border-accent`), com dois
triggers: **"2D técnico"** (default, o conteúdo já especificado em 9.5) e
**"3D estático"** (o `ModuleViewer` novo). Motivo de ser um segundo modo do
mesmo painel, e não uma aba irmã nova em outro lugar da tela: o 3D estático
é uma vista alternativa do mesmo módulo, não um conteúdo diferente — o
usuário troca de modo, mas o contexto (qual item, qual painel de materiais
ao lado) permanece o mesmo. O contêiner externo (fundo, borda, raio, sombra)
não muda entre os dois modos — é o mesmo frame da Seção 9.5, só o conteúdo
interno troca.

**Controles de ângulo do modo "3D estático"**: um conjunto de botões
**próprio e distinto** dos botões Frontal/Traseira/Esquerda/Direita/
Explodida do modo 2D (que não fazem sentido para uma câmera ortográfica de
`view`) — mesmo estilo visual (`size="icon"` da Seção 7.1, ativo em
`bg-accent-subtle border border-accent-border text-accent`), mapeado 1:1 às
quatro props já fechadas: **Isométrica** (`view="isometric"`, default ao
abrir o modo 3D — é a vista que melhor comunica volume num único olhar),
**Frontal** (`view="front"`), **Superior** (`view="top"`), **Lateral**
(`view="side"`). Troca de ângulo é instantânea, sem animação de rotação de
câmera (mesma regra da Seção 12 para o 2D — animar a troca pareceria
rotação 3D livre, que é exatamente o que está proibido).

**Cor do módulo**: quando o `ModuleViewer` renderiza com `color` (MDF
uniclor sólido, sem `textureUrl`), a cor **não é lida diretamente da paleta
da Seção 9.2** — ela vem de `corParaHex(material.cor)`, a mesma função de
derivação já existente em `app/components/ModulePreview.tsx` e já reutilizada
por `BoxCanvas.tsx` (confirmado em `docs/Modelo-de-Dominio.md`, Seção 4.1 e
item A-19). Ou seja: o `ModuleViewer` consome o resultado de `corParaHex()`,
não um hex independente lido à mão da Seção 9.2 — a Seção 9.2 é onde esses
tons vivem como token de paleta, mas a fonte de verdade em runtime para
"qual cor este módulo mostra" é sempre `corParaHex()`. Isso é deliberado:
o mesmo módulo deve mostrar a mesma cor aproximada de material no 2D
(`BoxCanvas.tsx`) e no 3D estático (`ModuleViewer`), então os dois **têm que
ler da mesma função**, nunca de duas leituras independentes que podem
divergir silenciosamente. Consequência prática: se `BoxCanvas.tsx` um dia
migrar `corParaHex()` para outra fonte de derivação de cor (ex.: o `corHex?`
opcional citado no item A-19 do Modelo de Domínio), o `ModuleViewer`
**migra junto**, na mesma task — nunca fica com a heurística antiga enquanto
o 2D já usa a nova. Se `textureUrl` deve existir no lançamento ou o produto
sai só com cor sólida é **decisão em aberto do operador/Data Architect
(Q-14 do Modelo de Domínio)** — não decidida aqui.

**Loading do `ModuleViewer`** (enquanto `next/dynamic({ ssr: false })`
carrega o bundle `@react-three/fiber`/`@react-three/drei`/`three`): mesmo
tratamento de skeleton de canvas técnico já definido na Seção 8 — contêiner
com o mesmo `bg-cinza-50 border-cinza-200`, ícone centralizado em
`text-cinza-300` (usar `Box` do `lucide-react`, coerente com a curadoria de
ícone por contexto da Seção 15.2 — "Box" nomeia o objeto ausente, um render
3D do módulo, em vez de um ícone genérico), sem desenho. Não é um novo
padrão de loading — é o mesmo já especificado, aplicado a este conteúdo.

**Responsivo**: como o restante da Seção 9, o `ModuleViewer` tem
`max-w-full` e preserva proporção (critério 4 de "não quebrar", Seção 10);
abaixo de `md` (768px), os dois modos do painel continuam acessíveis via o
mesmo seletor de `Tabs`, empilhado conforme o restante do layout do Editor
de Item.

## 10. Breakpoints e "não quebrar"

Mantidos da v2 (nenhum mockup contradiz — todos são telas desktop ≥1536px):

```ts
screens: {
  sm:  "480px",
  md:  "768px",
  lg:  "960px",
  xl:  "1280px",
}
```

| Faixa | Comportamento |
|---|---|
| `≥ xl` (1280px) | Sidebar fixa 264px + conteúdo, grid de KPI em 4/5 colunas, dashboard em 3 colunas de widgets |
| `lg–xl` (960–1279) | Sidebar fixa, grid de KPI em 2 colunas, widgets empilham em 2 colunas |
| `< md` (768px) | Sidebar vira drawer off-canvas (Seção 6); grid de KPI e widgets em 1 coluna; tabs com `overflow-x-auto` se não couberem |
| `< sm` (480px) | Botões/inputs largura total; toolbars do canvas em `flex-wrap`; KPI cards empilhados 1 por linha |

**"Não quebrar" (critério de aceitação de toda task visual)** — mesmos 5
critérios da v2, reafirmados:
1. Nenhum overflow horizontal do `body` em qualquer largura ≥360px.
2. Nenhum elemento sobreposto abaixo de 768px.
3. Sidebar nunca ocupa espaço fixo abaixo de `md` — sempre off-canvas.
4. Canvas/preview técnico (Seção 9) tem `max-w-full` e preserva proporção.
5. Toda seleção do canvas funciona por toque simples (`onClick`), nunca só
   `hover`.

## 11. UX Writing

- **Tom de voz**: direto, na segunda pessoa, sem entusiasmo artificial. O
  produto fala com um marceneiro/lojista profissional, não com um
  consumidor final — frases curtas, vocabulário técnico do ofício (chapa,
  veio, engrossamento, rateio) sem explicação condescendente.
- **Proibições explícitas**: sem "Ops!", sem "Oopsie", sem exclamação em
  mensagem de erro, sem emoji salvo pedido do operador, sem "Estamos
  animados para...". O tom "amigável" que aparece em alguns rótulos de
  mockup ("Comece agora seu controle profissional", "Mais de 1.000
  marceneiros já usam e recomendam") é aceitável **só em copy de marketing
  de login/cadastro** (páginas de conversão, onde tom de confiança/prova
  social é esperado) — dentro do produto autenticado, o tom é
  operacional/direto, sem adjetivação de entusiasmo.
- **Mensagens de erro**: dizem o que aconteceu e o que fazer a seguir.
  "Não foi possível recalcular o plano de corte. Verifique a conexão e
  tente de novo." — não "Algo deu errado!". Erros de validação técnica
  (Tier 1/2) nomeiam a peça/módulo e a regra violada: "Balcão 2 portas
  (900mm) sobrepõe a Torre quente na posição 600–1500mm."
- **Estados vazios**: dizem o que apareceria ali e oferecem a ação para
  preencher — padrão fixado na Seção 8 ("Nenhum orçamento ainda" + "Crie o
  primeiro orçamento para começar" + botão "Novo orçamento").
- **Rótulos de botão**: verbo + objeto quando houver ambiguidade. "Salvar
  alterações", "Adicionar item", "Gerar proposta", "Fechar orçamento" — não
  "OK" nem "Salvar" sozinho quando o contexto não deixa óbvio o quê.
- **Confirmações destrutivas**: nomeiam o que será perdido e são
  irreversíveis por escrito. "Remover 'Balcão 2 portas + 3 gavetas'? Esta
  ação não pode ser desfeita e o item sairá do plano de corte." — sempre no
  `Dialog` da 7.11, nunca `window.confirm`.
- **Microcopy de dica/ajuda** (cards "Dica do dia", "Dica rápida" na
  sidebar): frase única, factual, sem tom professoral — "Use conjuntos e
  elementos contínuos para agilizar seus projetos e reduzir retrabalho." é
  aceitável como está no mockup (informa uma capacidade real do produto,
  não é enfeite).

## 12. Movimento

- **Microinteração** (hover de botão/card, toggle de switch, troca de tab):
  `150ms ease-out`.
- **Transição de estado do canvas** (seleção, hover de módulo, handle de
  junção): `120ms ease-out` — mais rápido que microinteração de UI porque
  precisa acompanhar cliques rápidos de posicionamento sem atraso
  perceptível.
- **Entrada de modal/drawer/toast**: `200ms cubic-bezier(0.16, 1, 0.3, 1)`
  (ease-out com leve overshoot), saída `150ms ease-in`, overlay
  fade `150ms linear`.
- **Curvas nomeadas**: `ease-out` = `cubic-bezier(0, 0, 0.2, 1)`;
  `ease-in` = `cubic-bezier(0.4, 0, 1, 1)`; `ease-out-back` (só entrada de
  modal) = `cubic-bezier(0.16, 1, 0.3, 1)`.
- **O que NÃO anima**: nada que atrase a leitura de conteúdo ou a resposta
  a um clique. Especificamente: preenchimento de tabela/lista não tem
  animação de entrada por linha (aparece de uma vez, só o skeleton→conteúdo
  já é suficiente feedback); o desenho técnico da Seção 9 não anima
  transição entre ângulos (Frontal→Lateral troca instantaneamente — animar
  essa troca começaria a parecer rotação de câmera 3D, o que é
  explicitamente proibido); números de KPI não fazem "count-up" a cada
  atualização.
- **`prefers-reduced-motion`**: obrigatório. Quando ativo, todas as
  durações acima colapsam para `0ms` (troca de estado instantânea, sem
  overshoot), exceto o indicador de loading (skeleton `animate-pulse`), que
  deve continuar sinalizando "carregando" de forma estática (ex.: opacidade
  fixa 60%, sem pulsar) em vez de remover o indicador por completo.

## 13. Decisão de stack: Tailwind + shadcn/ui (mantida, não reaberta)

Igual à v2 — **decisão fechada do operador em 2026-07-21**, não
questionada nesta revisão. Consequência desta revisão: o Frontend Engineer
precisa (a) atualizar `tailwind.config.ts` com os valores das Seções 2–5,
10 deste documento (substituindo os valores da v2, não só adicionando); (b)
recolorir os componentes shadcn/ui e customizados já construídos
(`/`, `/modulo`, `/biblioteca`, `/proposta`, `/ambientes`) para os novos
tokens — isso é retrofit de telas já existentes e é **decisão futura do
Maestro sobre quando/como sequenciar essa migração**, fora do escopo deste
artefato de especificação.

## 14. Cobertura dos Blueprints

Todo componente citado em `docs/Mapa-de-Telas.md` e visível nos 12 mockups
tem especificação nesta revisão: Botão, Card, KPI Card, Sidebar de
navegação, Topbar, Badge/status, Tabela, Tabs, Input/Select/Label, Switch,
Modal, Toast, Alert, Gráficos (linha+donut), Card de promoção, Notificação,
Seletor de organização, Paginação, Thumbnail, Pager de item, Progress bar,
Documento de proposta, Canvas técnico (elevação/plano de corte/editor de
item) e os quatro estados (loading/vazio/erro/preenchido).

**Lacuna reportada** (não resolvida silenciosamente): o mockup
`Editor de Item.png` pede um componente de "toggle 2D/3D" **fotorrealista e
interativo**, que **não deve ser construído** — ver Seção 9. Se o Maestro
considerar que a ausência desse toggle deixa a tela "incompleta" frente ao
mockup visual, essa é uma divergência deliberada e já decidida pelo
operador, não uma lacuna deste documento.

> **Atualização (2026-07-31, ver Seção 9.6)**: o operador posteriormente
> autorizou, com escopo estreito e specado por ele mesmo, um segundo modo
> "3D estático" (não-interativo, câmera ortográfica fixa, sem
> `OrbitControls`) no mesmo painel do Editor de Item — ver Seção 9.6. Isso
> **não invalida** o parágrafo acima: o toggle 3D fotorrealista/interativo
> do mockup original continua rejeitado; o que existe agora é um componente
> tecnicamente distinto (`ModuleViewer`), com regras próprias e restritas.

## 15. Reforço anti-genérico — Checklist de Acabamento Premium (adendo, 2026-07-31)

> **Origem**: quatro sessões de walkthrough com o cliente-piloto
> (`docs/01-backlog-pre-lancamento.md`, Lote 5 — "Limpeza visual") relataram
> telas com layout de versão antiga convivendo com este Design System,
> textos clicáveis remanescentes de protótipo, e vocabulário de spec
> ("tier 1/2") vazado para a UI. A leitura deste Product Designer é que a
> maior parte disso **não é lacuna de token** — é conformidade: as Seções
> 1 e 13 já registram a dívida de retrofit, e a Seção 6 já exige sidebar +
> topbar em toda tela autenticada. Esta seção é aditiva e cobre só o que,
> mesmo seguindo o restante do documento à risca, ainda faltava: tracking
> de títulos grandes, curadoria de ícone, e um critério objetivo e
> verificável para o `ux-auditor` aplicar contra "cara de produto feito por
> IA". **Não reabre nenhuma decisão fechada** (sidebar navy fixa, laranja
> de destaque, sem 3D no canvas — Seção 0).

### 15.1 Tracking (letter-spacing) obrigatório nos tamanhos de destaque

A Seção 3 definia tamanho, altura de linha e peso, mas não o tracking —
sem ele, título e valor grandes ficam com o espaçamento default do
navegador, que é o que mais denuncia "feito às pressas". Valores a aplicar
sobre os `fontSize` já existentes (nenhuma mudança de px/lineHeight):

```ts
letterSpacing: {
  display:            "-0.014em", // text-display (28px)
  "titulo-secao":      "-0.006em", // text-titulo-secao (20px)
  "valor-destaque":    "-0.012em", // text-valor-destaque (24px)
  "valor-destaque-lg": "-0.017em", // text-valor-destaque-lg (32px) — o maior número da tela, o que mais precisa de tracking negativo
}
```

`titulo-card`, `corpo`, `corpo-pequeno` mantêm tracking `normal` (0) — só
os quatro tamanhos de destaque acima recebem tracking negativo.
`legenda` **não muda**: continua `tracking-[0.03em]` (positivo, já
definido na Seção 7.3/7.7 para rótulo uppercase — regra oposta é
intencional, uppercase pequeno precisa de tracking aberto, não fechado).

### 15.2 Sistema de ícones — biblioteca única, sem mistura

Não estava explícito como princípio, só implícito nos exemplos da Seção 9
(`AlertTriangle`, `Eye`, `Link`/`Unlink` do `lucide-react`). Fica
explícito agora: **toda a interface usa exclusivamente `lucide-react`**,
`stroke-width` `1.75` (peso padrão da biblioteca), tamanhos `14px`/`16px`/
`20px`/`24px` conforme o contexto já especificado em cada componente da
Seção 7. Proibido: misturar com outro pacote de ícone (Feather, Heroicons,
Font Awesome), usar emoji como ícone funcional (exceção documentada: o
emoji de placeholder "👁" na Seção 9.3 é histórico e deve ser lido como
`Eye` do lucide, não emoji literal), ou usar um ícone genérico
("💡", "🚀", caixa/nuvem vazia sem relação com o domínio) num estado vazio
quando existe opção mais específica.

**Curadoria por contexto de estado vazio** (aplica-se à Seção 8): o ícone
do estado vazio deve nomear o objeto ausente, não ser um ícone genérico de
"nada aqui":

| Contexto vazio | Ícone (lucide) | Nunca usar |
|---|---|---|
| Lista de orçamentos | `FileText` | `Inbox` genérico |
| Biblioteca sem módulos na categoria | `Boxes` | `Package` genérico sem relação |
| Ambiente sem paredes | `LayoutPanelLeft` (referência a planta/parede) | ícone de "vazio" abstrato |
| Parede sem itens posicionados | `Ruler` | — |
| Plano de corte sem chapas calculadas | `Scissors` ou `LayoutGrid` | spinner ou ícone de erro |
| Catálogo sem produtos na categoria | `PackageSearch` | `Inbox` genérico |

### 15.3 Vocabulário de especificação nunca chega ao usuário (reforço da Seção 11)

O backlog pré-lançamento (Seção 2.5, itens 5.5/5.6) reportou um card
"validação tier 1 + tier 2" na UI — vocabulário criado no briefing técnico
(D-19) para escopar severidade de validação, não para ser lido pelo
marceneiro. A causa provável: a Seção 9.3 deste próprio documento usa
"Tier 1"/"Tier 2" como atalho para descrever *ao Frontend Engineer* qual
token semântico usar (`erro` vs `aviso`) — e esse atalho de especificação
vazou como se fosse copy de produto. Fica explícito para eliminar a
ambiguidade:

- **"Tier 1"/"Tier 2" são nomes internos de severidade do motor** (usados
  neste documento e no `Modelo-de-Dominio.md` para instruir engenharia).
  **Nunca aparecem como texto literal na interface.** O que a Seção 9.3 já
  determina continua valendo (contorno `erro` sólido para Tier 1, `aviso`
  tracejado para Tier 2) — o token visual está correto, só o **rótulo
  textual** ao lado/tooltip precisa ser em linguagem de produto: "Bloqueante"
  ou a mensagem nomeando peça+regra (já no padrão da Seção 11 — "Balcão 2
  portas... sobrepõe...") para Tier 1; "Atenção" ou a recomendação textual
  para Tier 2. Nunca literalmente "Tier 1" nem "Tier 2" em tela.
- **Teste de varredura objetivo, aplicável por qualquer agente**: antes de
  considerar uma string de UI pronta, perguntar "esse termo apareceria numa
  conversa com o marceneiro sobre o produto?". Se não (é vocabulário de
  arquitetura, de banco de dados, de planejamento interno, ou nome de
  entidade do domínio de dados que não é o nome comercial do conceito —
  ex.: "tier", "seed", "template" quando o produto já decidiu chamar de
  "módulo", "snapshot", "BOM", nome de tabela ou de rota interna) —
  reescrever. Este teste vale para toda string nova, não só para as já
  reportadas no Lote 5.

### 15.4 Checklist objetivo de Acabamento Premium (critério de aceite do `ux-auditor`)

Lista binária (passa/não passa), para aplicar tela a tela em qualquer task
de UI — inclui os pontos já existentes no documento e os três reforços
acima, consolidados num único lugar para conferência rápida:

1. Toda cor usada existe literalmente na Seção 2 (hex ou nome de token) —
   nenhum hex ad hoc, nenhuma opacidade inventada fora das já especificadas.
2. Toda sombra usada é exatamente um dos 5 valores da Seção 5
   (`xs`/`sm`/`md`/`lg`/`sidebar`) — nenhum `box-shadow` inline customizado.
3. Toda tela autenticada tem sidebar e topbar completas conforme a Seção 6
   — nenhuma tela "solta" sem o shell (cobre backlog 5.4).
4. Nenhum texto voltado ao usuário usa vocabulário de spec — varredura
   conforme 15.3 feita e documentada como concluída (cobre backlog 5.5/5.6).
5. Nenhum "texto clicável" herdado de versão anterior sem componente real
   por trás — todo elemento clicável é um `Button`/`Link` da Seção 7.1,
   nunca texto solto sublinhado de protótipo antigo (cobre backlog 5.3).
6. `text-display`, `text-titulo-secao`, `text-valor-destaque` e
   `text-valor-destaque-lg` usam o tracking da Seção 15.1 — nunca o
   tracking default do navegador.
7. Ícones vêm exclusivamente de `lucide-react`, mesmo peso de traço,
   tamanho conforme o contexto (Seção 15.2) — nenhum emoji funcional,
   nenhuma mistura de biblioteca de ícone.
8. Telas "irmãs" da mesma família funcional (as quatro abas do orçamento;
   Biblioteca vs. Catálogo; os cards de KPI de qualquer tela) usam o mesmo
   padding de card, o mesmo gap entre KPIs e a mesma altura de header —
   nenhuma inconsistência visual entre telas do mesmo nível de hierarquia
   (cobre a causa-raiz de fundo do backlog 5.1/5.2: layout antigo convivendo
   com o novo).
9. Estado vazio usa o ícone específico do contexto (Seção 15.2), nunca um
   ícone genérico de "nada aqui" sem relação com o domínio.
10. Todo elemento interativo (botão, card clicável, linha de tabela, módulo
    do canvas) tem a transição da Seção 12 aplicada — nenhuma mudança de
    estado instantânea, exceto com `prefers-reduced-motion` ativo.

    > **Exceções deliberadas a este item, não violações**: (a) a troca de
    > ângulo do desenho técnico 2D (Frontal/Traseira/Esquerda/Direita/
    > Explodida) especificada na Seção 12, e (b) a troca de `view`
    > (`isometric`/`front`/`top`/`side`) do `ModuleViewer` especificada na
    > Seção 9.6 — **ambas são instantâneas por design**, sempre, com ou sem
    > `prefers-reduced-motion`. Nos dois casos animar a troca faria o canvas
    > parecer uma câmera 3D livre em rotação, o que é explicitamente proibido
    > (Seção 9 e Seção 9.6). Um `ux-auditor` aplicando este item não deve
    > reprovar essas duas trocas de ângulo por ausência de transição — a
    > ausência de transição *é* a implementação correta.
11. Loading de bloco de conteúdo real usa skeleton na forma do conteúdo
    (Seção 8) — nunca spinner central substituindo lista/tabela/card
    inteiro (spinner pequeno dentro de botão durante ação pontual continua
    permitido).
12. Nenhum componente introduz cor, raio, sombra ou espaçamento fora dos
    tokens das Seções 2–5 — se a tela "parecer precisar" de um valor novo,
    isso é lacuna a reportar ao Product Designer, nunca decisão ad hoc do
    Frontend Engineer.

Este checklist não substitui os critérios de "não quebrar" da Seção 10
(responsividade) — é adicional, focado em acabamento visual e vocabulário,
não em quebra de layout.
