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

## Estado das etapas do MVP

| Etapa | Estado | Observação |
|---|---|---|
| Motor + pricing + UX | ✅ pronto e verificado | núcleo do produto |
| Elementos contínuos | ✅ pronto e verificado | tampo/rodapé por parede (etapa global, doc 04) |
| PDF / proposta | ✅ proposta imprimível (`/proposta`) | Vercel-safe; PDF via "Salvar em PDF" do navegador |
| Persistência | ✅ código pronto (compila/valida/builda) | **runtime requer `DATABASE_URL`** (Supabase/Neon) |
| Autenticação | ✅ registro/login/JWT + middleware | requer `AUTH_SECRET` e o banco |

Verificação em ambiente sem banco: `typecheck`, `prisma validate`, `build` e os
14 testes do motor passam. As rotas de dados (`/api/clientes`,
`/api/orcamentos`) só respondem com um banco conectado.

### Autenticação e proteção de rotas

- `POST /api/auth/register` cria tenant + admin e inicia sessão (cookie httpOnly).
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- `middleware.ts` protege `/api/clientes/*` e `/api/orcamentos/*`; o motor
  (`/api/calcular`, `/api/templates`) fica público para a demo.
- Sessão via JWT (`jose`), senha com hash `bcryptjs`. Defina `AUTH_SECRET` em
  produção.

### Proposta comercial (PDF)

`/proposta` lê o orçamento atual (via `sessionStorage`, botão “Gerar proposta”)
e renderiza uma proposta imprimível com a **BOM unificada + custo** (pré-orçamento
de insumos). O usuário usa **Imprimir → Salvar em PDF** — funciona na Vercel sem
Chromium.

Para **PDF server-side automático** (anexar por e-mail, salvar no storage), o
Puppeteer + Chromium estoura o bundle (250 MB) e o timeout da Vercel. Saídas:

- **`@sparticuz/chromium`** (Chromium slim) numa API Route dedicada, ou
- **Worker separado** no Railway/Render com fila (recomendado — doc 09),
  renderizando a mesma rota `/proposta` de forma assíncrona.

## Arquitetura de produção sugerida (barata)

```
Vercel     → Next.js (UI + API: CRUD, engine, simulador)
Railway    → Worker de PDF assíncrono (Puppeteer + fila)
Supabase   → PostgreSQL + Storage (uploads, PDFs)
Upstash    → Redis (cache de tabelas de preço)
```

Custo estimado no MVP: ~US$ 0–15/mês até escalar.

## Ligar o banco (para ativar persistência/auth)

```bash
# 1. Crie um projeto no Supabase ou Neon e configure o .env
cp .env.example .env
#    edite DATABASE_URL e AUTH_SECRET

# 2. Gere o client e rode a migração inicial
npx prisma generate
npx prisma migrate dev --name init

# 3. Seed: biblioteca de templates + preços de referência + admin de exemplo
npm run db:seed
#    login de exemplo: admin@demo.com / demo1234
```

Na Vercel, adicione `DATABASE_URL` e `AUTH_SECRET` em *Environment Variables*.
O `postinstall` já roda `prisma generate` no build.
