# OrçaFácil (orcamentofacil)

> Painel de orçamento para marceneiros. Monta módulos e placas num
> box-builder paramétrico, posiciona numa parede 2D, calcula BOM/plano de
> corte com restrição de veio, precifica com rateio por custo alocado e gera
> uma proposta comercial em PDF — tudo com persistência multi-tenant real
> (Supabase) e autenticação própria por organização.

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Visão, persona, jornada, requisitos, decisões de produto (D-01 a D-26) |
| [`docs/Modelo-de-Dominio.md`](docs/Modelo-de-Dominio.md) | Fundação técnica: itens de orçamento, parede/ambiente/conjunto, elementos contínuos, precificação, veio de chapa |
| [`docs/Mapa-de-Telas.md`](docs/Mapa-de-Telas.md) | Árvore de telas do produto |
| [`docs/Design-System.md`](docs/Design-System.md) | Tokens de cor/tipografia/espaçamento (v3) |
| [`docs/STATUS.md`](docs/STATUS.md) | **Comece por aqui** — estado atual, o que existe, decisões fechadas |
| [`docs/Backlog.md`](docs/Backlog.md) | O que ainda não foi feito |
| [`docs/Lessons-Learned.md`](docs/Lessons-Learned.md) | Aprendizados registrados ao final de cada etapa |
| [`docs/archive/`](docs/archive/) | Planejamento original V1 (histórico, não é fonte de verdade) |

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui, Supabase
(Postgres + Auth + Storage, RLS multi-tenant), Vitest.

## Esteira de execução

Este projeto usa o framework Maestro (`.maestro/`) para orquestrar o
desenvolvimento — ver `CLAUDE.md` na raiz e `.maestro/agents/maestro.md`.
