# Como rodar e fazer deploy

Este repositório contém, além da documentação do pipeline (`/docs`), um **app
Next.js funcional** que demonstra o motor paramétrico ponta a ponta: você monta
módulos, o motor explode em peças (BOM), consolida MDF/fita/ferragens e o
pipeline financeiro calcula o preço com slider de margem em tempo real.

## Rodar localmente

```bash
npm install
npm run dev          # http://localhost:3000
```

Outros scripts:

```bash
npm test             # testes golden do motor (docs 09)
npm run typecheck    # checagem de tipos
npm run build        # build de produção
```

## Deploy na Vercel (o app de demonstração)

O app **roda na Vercel sem configuração adicional** — a engine é pura (sem banco),
os templates são empacotados como JSON e o cálculo acontece em API Routes
serverless.

1. Faça push do branch para o GitHub (já feito).
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório
   `matheussperes/orcamentofacil`.
3. A Vercel detecta Next.js automaticamente. Framework preset: **Next.js**.
   Build: `next build`. Nenhuma variável de ambiente é necessária para a demo.
4. Deploy. Pronto — a calculadora fica no ar.

> O `vercel.json` já fixa o framework e os comandos.

## O que a demo NÃO inclui (próximas etapas do MVP)

A demo prova o **núcleo** (engine + pricing + UX da barra de ocupação). Falta,
nesta ordem (ver `docs/08-roadmap.md`):

| Etapa | O que falta | Onde roda |
|---|---|---|
| Persistência | Banco PostgreSQL + Prisma (`prisma/schema.prisma` já pronto) | Supabase / Neon |
| Autenticação | Login + RBAC (doc 02) | Vercel + Supabase Auth |
| Elementos contínuos | Etapa global de tampos/rodapés (flags já nos templates) | engine |
| PDF | Geração da proposta comercial | **não roda bem na Vercel serverless** |

### Sobre o PDF e a Vercel

Puppeteer + Chromium estoura o limite de bundle (250 MB) e o timeout das funções
serverless da Vercel. Duas saídas:

- **`@sparticuz/chromium`** (Chromium slim para Lambda) numa API Route dedicada, ou
- **Worker separado** no Railway/Render com fila (recomendado — doc 09), gerando o
  PDF de forma assíncrona e salvando no storage.

## Arquitetura de produção sugerida (barata)

```
Vercel     → Next.js (UI + API: CRUD, engine, simulador)
Railway    → Worker de PDF assíncrono (Puppeteer + fila)
Supabase   → PostgreSQL + Storage (uploads, PDFs)
Upstash    → Redis (cache de tabelas de preço)
```

Custo estimado no MVP: ~US$ 0–15/mês até escalar.

## Ligar o banco (quando for para a Sprint 1)

```bash
# 1. Crie um projeto no Supabase ou Neon e copie a connection string
echo 'DATABASE_URL="postgresql://..."' > .env

# 2. Gere o client e rode a migração inicial
npx prisma generate
npx prisma migrate dev --name init

# 3. (seed) carregue a biblioteca de templates e os preços de referência
#    a partir de engine/templates/*.json e lib/engine/prices.ts
```
