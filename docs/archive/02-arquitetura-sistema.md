# 02 — Arquitetura do Sistema

## Princípios

1. **Motor de cálculo como função pura** — recebe entrada (medidas + template +
   parâmetros) e devolve a BOM e os custos. Sem estado, sem I/O interno. Isso garante
   testabilidade e o RNF de cálculo < 2 s.
2. **Biblioteca de Engenharia desacoplada do motor** — novos tipos de móveis são
   adicionados como dados (templates), não como código.
3. **Ambiente é um agrupador lógico de módulos** — a hierarquia é
   `Orçamento → Ambiente → Módulo → Template → Componentes → Peças → Materiais → Custos`.

## Fluxo de Dados

```
[UI Client: Next.js/React]
      │  (JSON: ambiente, módulos, medidas, seleção de materiais)
      ▼
[API / BFF (Node.js + TypeScript)]
      │
      ├──(cache de tabelas de preço)──▶ [Redis]
      │
      ▼
[MOTOR DE CÁLCULO]  ◀── [BIBLIOTECA DE ENGENHARIA]   (templates JSON versionados)
      │             ◀── [PARÂMETROS DE FÁBRICA]      (espessuras, folgas, perdas do tenant)
      │
      ▼
[Explosão de Peças — BOM por módulo]
      │
      ▼
[Etapa Global — elementos contínuos: tampos, rodapés]
      │
      ▼
[Motor de Custos & Margem]  ◀── [Tabelas Catálogo → Fornecedor → Preço]
      │
      ├──▶ [Simulador de margem (tempo real, no cliente)]
      ▼
[PDF Generator Service (assíncrono)] ──▶ [Storage: S3/Supabase] ──▶ link ao cliente
```

## Módulos da Aplicação

```
Dashboard → Clientes → Orçamentos → Ambientes → Motor de Engenharia
         → Custos → Proposta → PDF → Configurações
```

| Módulo | Responsabilidade |
|---|---|
| **Dashboard** | Indicadores: nº de orçamentos, valor vendido, valor em negociação, taxa de conversão, ticket médio, lucro e margem médios |
| **Clientes** | Nome, telefone, e-mail, endereço, origem, arquiteto, observações, status |
| **Orçamentos** | Cliente, data, validade, responsável, desconto, prazo, forma de pagamento, status, versões |
| **Ambientes** | Nome, tipo (cozinha, closet, banheiro…), fotos, observações, medidas de paredes/aberturas |
| **Biblioteca de Engenharia** | Templates de módulos, componentes, fórmulas, regras, ferragens obrigatórias |
| **Motor Paramétrico** | Explosão de peças, consolidação de BOM, elementos contínuos |
| **Custos** | Custos diretos e indiretos, margens, simulador |
| **Proposta / PDF** | Layout comercial, capa, resumo, renderizações, condições, QR code |
| **Configurações** | Tabelas de MDF, ferragens, fornecedores, montagem, frete, comissão, impostos; permissões |
| **Uploads** | Fotos, croquis, PDF, DWG, renders, referências |
| **Histórico** | Alterações, versões, autor, data |

## Permissões (RBAC)

| Papel | Acesso |
|---|---|
| Administrador | Tudo, incluindo tabelas de preço e parâmetros de fábrica |
| Projetista | Orçamentos, ambientes, módulos, biblioteca (leitura) |
| Vendedor | Clientes, orçamentos, simulador de margem (limitado à margem mínima), PDF |
| Financeiro | Custos, margens, impostos, dashboard financeiro |

## Stack Tecnológica (MVP)

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js + React + TailwindCSS | Velocidade de desenvolvimento, SSR, responsivo |
| Backend/API | Node.js + TypeScript (NestJS ou Fastify) | Mesmo idioma do front, tipagem para o motor |
| Motor de fórmulas | Interpretador matemático seguro (ex.: `expr-eval`) | Avalia strings de fórmulas dos templates sem `eval` |
| Banco | PostgreSQL (Supabase ou Neon) | Relacional, JSONB para templates, low-cost |
| Cache | Redis | Tabelas de preço e templates quentes |
| Storage | S3 / Supabase Storage | PDFs, fotos, uploads |
| PDF | Puppeteer (HTML → PDF) | Layout profissional com CSS |
| Auth | Supabase Auth ou Auth.js | Login + RBAC |
| Hospedagem | Vercel (front) + Render/Railway (API) | Barato no MVP, escala em containers |

## Requisito de Performance (< 2 s)

- O motor resolve strings de fórmulas em memória — computacionalmente leve
  (< 50 ms para um ambiente com ~15 módulos).
- Tabelas de preço e templates ficam em cache (Redis + cache local por request).
- O **slider de margem não reprocessa a engenharia**: a BOM e o custo direto ficam no
  estado do cliente; apenas o markup é recalculado no front (ver doc 05).
- A geração de PDF é **assíncrona** (fila) e não bloqueia o fluxo de cálculo.

## Evolução para SaaS Multiempresa (Fase 4)

- `tenant_id` presente desde o dia 1 em todas as tabelas (mesmo com um único tenant).
- Parâmetros de fábrica, tabelas de preço e permissões já são por tenant.
- Templates da biblioteca são globais no MVP; na V2 poderão ter overrides por tenant.
