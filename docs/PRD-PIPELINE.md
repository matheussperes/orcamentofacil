# PRD & Pipeline — Budget Planner AI

> Documento de referência único para não depender da memória de conversa. Este
> arquivo resume o produto e o pipeline técnico; os documentos numerados em
> `docs/01-*.md` a `docs/13-*.md` têm o detalhamento original de cada etapa e
> permanecem como fonte de detalhe — este arquivo é o mapa, não substitui os originais.

## 1. O problema

Marcenarias de móveis planejados hoje fazem orçamento assim:

```
Cliente pede orçamento
  → Projeto completo no SketchUp
  → Cálculo pelo Dinabox
  → Anotação manual de placas, fita, corrediças, dobradiças, puxadores, ferragens
  → Cálculo de custo + margem manual
  → Planilha Google preenchida à mão
  → PDF gerado e enviado
```

Isso leva de 1 a 3 horas por orçamento, é repetitivo, sujeito a erro de digitação e
de cálculo, e não é padronizado entre vendedores.

## 2. O produto

**Budget Planner AI** — plataforma web que gera orçamento completo de móveis
planejados em minutos, sem precisar modelar o projeto no SketchUp antes. O usuário
informa ambiente, medidas, materiais e ferragens; o sistema calcula peças, chapas,
fita de borda, ferragens, mão de obra, frete, margem e gera uma proposta em PDF.

**Público-alvo:** marcenarias, projetistas, arquitetos e representantes comerciais
de móveis planejados.

**Objetivo primário:** reduzir o tempo de orçamento em mais de 90% e padronizar o
cálculo, eliminando planilha e SketchUp na fase comercial.

## 3. Pipeline técnico (visão de dados)

```
[UI Next.js/React]
      │  ambiente, módulos, medidas, materiais
      ▼
[Motor de cálculo — função pura]  ◀── [Biblioteca de módulos] (templates/gabaritos)
      │                            ◀── [Parâmetros de fábrica] (espessuras, folgas, perdas)
      ▼
[Explosão de peças — BOM por módulo]
      ▼
[Etapa global — elementos contínuos: tampos, rodapés]
      ▼
[Motor de custos & margem]  ◀── [Tabelas de preço: MDF, ferragens, montagem, frete]
      │
      ├──▶ [Simulador de margem/desconto — tempo real, client-side]
      ▼
[Proposta comercial em PDF]
```

Princípio de arquitetura (doc 02): o motor de cálculo é uma função pura (entrada →
BOM + custos, sem estado), e a biblioteca de módulos é dado (templates), não código —
novos móveis se adicionam sem mexer no motor.

## 4. Dois motores de engenharia coexistindo

O projeto tem **dois modelos de módulo**, unificados na camada de orçamento por um
discriminated union (`ModuloOrcamento` em `lib/orcamento.ts`):

### 4.1 Motor de templates (V1, doc 04)

Módulos paramétricos clássicos: um template JSON com fórmulas (parser `expr-eval`)
descreve peças a partir de largura/altura/profundidade + parâmetros (nº de portas,
gavetas, prateleiras). Rápido, mas cada tipo novo de móvel exige um template
pré-programado — não modela geometria arbitrária.

### 4.2 Motor de caixa / box-builder (V3, docs 11-13)

Modelo tipo CAD simplificado: uma **caixa vazia** (`BoxModule`: largura/altura/
profundidade/tipo `aereo|inferior|torre` + material da carcaça) que se subdivide
recursivamente em **vãos** (`BayNode`: split vertical/horizontal + N divisórias +
filhos ou conteúdo). Cada vão-folha tem um `BayContent`:

```ts
type BayContent =
  | { tipo: "espaco"; frente: FrenteConteudo; prateleiras?: {...}; fundo?: {...} }
  | { tipo: "tamponamento"; lado; material; sarrafo };
```

`frente` (vazio/portas/gaveta) é mutuamente exclusiva dentro de si, mas
**prateleiras e fundo são independentes e combináveis com qualquer frente** — um
vão pode ter 2 portas + prateleiras + fundo sem precisar dividir a caixa.

Isso permite representar qualquer geometria de módulo (aéreo, inferior, torre, com
qualquer combinação de portas/gavetas/prateleiras/nichos) sem escrever um template
novo por tipo de móvel — é o caminho que substitui a necessidade de programar cada
móvel como código.

### 4.3 Por que dois motores

O motor de templates (V1) cobre o catálogo original de 6 módulos de cozinha do MVP.
O motor de caixa (V3) foi construído para dar liberdade total de composição sem
depender de templates pré-programados. Os dois convivem hoje via `ModuloOrcamento`;
a expectativa de longo prazo é que o motor de caixa absorva os casos de uso do motor
de templates, mas isso não está decidido/agendado.

## 5. Modelo "Laboratório × Produção" (Fase 3, doc 12)

- **Laboratório** (`/modulo`): onde se define a física do móvel — monta-se a caixa,
  subdivide-se em vãos, define-se conteúdo, calibra-se cor/espessura da carcaça. É
  aqui que se salva um **gabarito** (preset) numa **categoria** (Cozinha, Quarto...).
  O laboratório é a fonte da verdade da engenharia.
- **Produção** (página principal `/`): onde o vendedor monta o orçamento — escolhe
  gabaritos pelo assistente **Ambiente → Tipo → Modelo**, ajusta overrides de
  instância (medidas, cor, tamponamento, portas, fundo) sem alterar o gabarito
  salvo, e organiza os módulos nas paredes.

## 6. Escopo original do MVP (doc 01) vs. estado real

O PRD original (docs 01-09) previa: login/RBAC, CRUD de clientes, múltiplos
ambientes por orçamento, motor paramétrico, simulador de margem, PDF, histórico de
versões — com stack completa (Next.js + Node/TS + PostgreSQL/Prisma + Redis +
Puppeteer + Auth).

**O que existe hoje como backend real:** autenticação (login/registro/logout via
`app/api/auth/*`), schema Prisma (`prisma/schema.prisma`), rotas de clientes e
orçamentos (`app/api/clientes`, `app/api/orcamentos`).

**O que roda hoje só no cliente (sem persistência em banco):** todo o fluxo de
módulos-caixa (V3/Fase 3) — gabaritos/presets ficam em `localStorage`
(`lib/boxPresets.ts`), e a lista de módulos do orçamento na página principal é
estado React puro (`useState`, sem chamada a `/api/orcamentos`). Ou seja: o
orçamento montado na tela principal hoje **não é salvo** — recarregar a página
perde o trabalho, exceto pelos gabaritos (que ficam salvos no navegador). Isso é
uma lacuna real em relação ao PRD original (RF-002/RF-009: múltiplos orçamentos por
cliente, versionamento) e está registrado como pendência em `docs/STATUS.md`.

## 7. Onde estão os detalhes

| Doc | Conteúdo |
|---|---|
| `docs/01-visao-geral.md` | Visão de produto, RF/RNF, escopo do MVP original |
| `docs/02-arquitetura-sistema.md` | Arquitetura, stack, RBAC, fluxo de dados |
| `docs/03-modelo-de-dados.md` | Schema relacional original (Prisma) |
| `docs/04-motor-parametrico.md` | Motor de templates V1 (fórmulas, explosão de peças) |
| `docs/05-pipeline-financeiro.md` | Custos, margem, simulador |
| `docs/06-ux-wizard.md` | Wizard de orçamento original (6 etapas) |
| `docs/07-onboarding-precos.md` | Catálogo de preços de referência pré-carregado |
| `docs/08-roadmap.md` | Sprints do MVP + fases futuras (2, 3, 4) |
| `docs/09-devops-ci-cd.md` | CI/CD, deploy |
| `docs/10-v2-ajustes.md` | V2: config de material por módulo, preview 2D, catálogo, editor de fórmulas |
| `docs/11-v3-box-builder.md` | V3: motor de caixa/vãos (origem do box-builder) |
| `docs/12-fase3-lab-producao.md` | Separação Laboratório × Produção, categorias, wizard, tamponamento |
| `docs/13-correcoes-box-v3.md` | Rodada de correções de bugs reais do box-builder (travessa, prateleiras+portas, tamponamento por lado, overrides, card colapsável) |

Para o estado atual do projeto, decisões tomadas, pendências e próximos passos, ver
`docs/STATUS.md`.
