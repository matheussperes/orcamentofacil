# Budget Planner AI — Orçamento Fácil

> Plataforma web que gera orçamentos completos de móveis planejados em ~5 minutos,
> sem necessidade de modelar o projeto no SketchUp.

O usuário responde perguntas simples (ambiente, medidas, materiais, ferragens) e um
**motor paramétrico de engenharia** explode cada móvel em peças, consolida a lista de
materiais (BOM), calcula custos, aplica margem e gera uma proposta comercial em PDF.

**Meta:** reduzir um processo de 1–3 horas para ~5 minutos (redução > 90%).

## Documentação do Pipeline

| # | Documento | Conteúdo |
|---|-----------|----------|
| 01 | [Visão Geral do Produto](docs/01-visao-geral.md) | Problema, objetivos, público-alvo, escopo do MVP |
| 02 | [Arquitetura do Sistema](docs/02-arquitetura-sistema.md) | Fluxo de dados, módulos, stack tecnológica |
| 03 | [Modelo de Dados](docs/03-modelo-de-dados.md) | Schema relacional, dicionário de dados, herança em cascata |
| 04 | [Motor Paramétrico de Engenharia](docs/04-motor-parametrico.md) | Engine em 3 camadas, biblioteca de módulos, pipeline de explosão (BOM) |
| 05 | [Pipeline Financeiro](docs/05-pipeline-financeiro.md) | Cálculo de chapas, custos diretos/indiretos, markup, simulador de margem |
| 06 | [UX — Wizard de Orçamento](docs/06-ux-wizard.md) | Wizard de 6 etapas, barra linear de ocupação, heurísticas de sugestão |
| 07 | [Onboarding e Estratégia de Preços](docs/07-onboarding-precos.md) | Biblioteca pré-carregada, modelagem Catálogo → Fornecedor → Preço |
| 08 | [Roadmap e Backlog do MVP](docs/08-roadmap.md) | Sprints, backlog técnico, fases futuras (V2–V4) |
| 09 | [DevOps, CI/CD e Testes](docs/09-devops-ci-cd.md) | Pipeline de CI/CD, testes de engenharia, hospedagem |
| 10 | [Ajustes da V2 (backlog)](docs/10-v2-ajustes.md) | Config de cor por módulo, previews Canvas 2D, layout de paredes, configurador de engenharia, BOM unificada, cadastro de materiais |
| 11 | [V3 — Box-builder CAD](docs/11-v3-box-builder.md) | Motor de caixa vazia + subdivisões recursivas, editor visual em Canvas, presets |

## Biblioteca de Engenharia (Templates Iniciais)

Os 6 módulos essenciais do MVP estão em [`engine/templates/`](engine/templates/):

- [`base_portas.json`](engine/templates/base_portas.json) — Módulo base inferior com portas
- [`gaveteiro.json`](engine/templates/gaveteiro.json) — Gaveteiro
- [`aereo_portas.json`](engine/templates/aereo_portas.json) — Módulo aéreo com portas
- [`torre_quente.json`](engine/templates/torre_quente.json) — Torre quente / paneleiro
- [`canto_reto.json`](engine/templates/canto_reto.json) — Módulo de canto
- [`nicho.json`](engine/templates/nicho.json) — Nicho aberto

O formato dos templates está especificado em
[`engine/templates/SCHEMA.md`](engine/templates/SCHEMA.md).

## Decisões de Arquitetura (resumo)

1. **Fórmulas não editáveis no MVP** — templates fixos + parâmetros configuráveis pelo
   usuário (espessuras, folgas, perdas). Editor de fórmulas (DSL) fica para a V2.
2. **Biblioteca de módulos, não de ambientes** — o ambiente é apenas um agrupador de
   módulos reutilizáveis. Um "Base 600" serve para cozinha, banheiro, lavanderia etc.
3. **Motor de cálculo como função pura** — recebe medidas + template + parâmetros e
   devolve a BOM. Sem estado, sem acoplamento com UI ou persistência.
4. **Cálculo em duas etapas** — atômica (por módulo) e global (elementos contínuos:
   tampos, rodapés).
5. **Preços modelados como Catálogo → Fornecedor → Preço** — com base de referência
   pré-carregada para eliminar o cold start.
6. **Visão de longo prazo** — o motor de orçamento é o núcleo de um ERP comercial para
   marcenarias (CRM, ordens de produção, lista de corte, compras, financeiro).
