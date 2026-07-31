# 09 — DevOps, CI/CD e Pipeline de Testes

Estrutura simples e barata para o MVP, escalável para o SaaS futuro.

## Versionamento e Fluxo de Branches

- Repositório privado no GitHub (`matheussperes/orcamentofacil`).
- Trunk-based: `main` protegida; feature branches curtas + PR com review.
- Templates de engenharia (`engine/templates/*.json`) versionados junto do código —
  **toda alteração de fórmula passa por PR e CI**.

## Pipeline de CI (GitHub Actions — a cada PR)

```
push / pull_request
  │
  ├─ 1. Lint + typecheck (ESLint, tsc)
  │
  ├─ 2. Validação de templates JSON
  │     - Schema (engine/templates/SCHEMA.md → JSON Schema)
  │     - Toda variável usada em fórmula está declarada (MEDIDA_*, PARAM_*, CONFIG_*)
  │     - Fórmulas parseiam sem erro no interpretador
  │
  ├─ 3. Testes unitários do motor (Vitest/Jest)
  │
  ├─ 4. Testes golden de engenharia  ◀── portão crítico
  │
  └─ 5. Build (Next.js + API + imagem Docker)
```

Falhou qualquer etapa → merge bloqueado.

## Testes Golden de Engenharia (o portão de qualidade)

Um template errado por 5 cm quebra o orçamento e destrói a confiança do usuário.
Cada template exige **cenários fixos com saída exata esperada**:

```yaml
# engine/tests/golden/base_portas_600.yaml (exemplo)
entrada:
  template: BASE_PORTAS
  medidas: { largura: 600, altura: 720, profundidade: 550 }
  config: { portas: 2 }
  parametros: { espessura_caixa: 15, folga_porta: 3, perda_mdf: 0.12 }
esperado:
  area_mdf_caixa_m2: 1.87        # tolerância 0.01
  area_mdf_frente_m2: 0.85
  fita_borda_m: 9.4
  dobradicas: 4
  pecas: 8
```

Regras:

- Mínimo de **3 cenários por template** (mínimo, típico, máximo dos limites).
- Cenários validados por marceneiro parceiro contra orçamento real.
- Alterou template → o teste golden correspondente **deve** ser atualizado no mesmo
  PR (verificado no CI comparando paths alterados).

## Pre-commit Hooks

- Formatação (Prettier) e lint staged.
- Validação de schema dos templates JSON alterados (etapa 2 do CI, versão local) —
  impede commit de fórmula inválida ou variável não declarada.

## Pipeline de CD

```
merge em main
  │
  ├─ Deploy automático → STAGING (Vercel preview + Render staging + banco staging)
  │     └─ Smoke tests E2E (Playwright): login → criar orçamento → calcular → PDF
  │
  └─ Tag de release (v0.x.y) → Deploy PRODUÇÃO (aprovação manual no MVP)
        └─ Migrações de banco executadas antes do switch (expand/contract)
```

## Ambientes e Hospedagem

| Ambiente | Frontend | Backend/Engine | Banco |
|---|---|---|---|
| Preview (por PR) | Vercel Preview | — (usa staging) | staging |
| Staging | Vercel | Render/Railway (Docker) | Supabase/Neon (branch) |
| Produção | Vercel | Render/Railway (Docker) | Supabase/Neon |

- **PDF service** roda como worker separado (fila) para não competir com a API.
- **Redis** gerenciado (Upstash) para cache de tabelas de preço.

## Observabilidade e Operação

- Logs estruturados (pino) + Sentry para erros de front e API.
- Métrica de negócio no APM: **tempo de cálculo do motor** (alertar se P95 > 1 s,
  antes de estourar o RNF de 2 s).
- **Backup automático** do PostgreSQL: PITR do provedor + dump diário para S3
  (retenção 30 dias). Teste de restore mensal.
- Migrações versionadas (Prisma Migrate ou Drizzle), sempre reversíveis.

## Segurança

- Autenticação JWT com refresh; RBAC no middleware da API (papéis do doc 02).
- Isolamento por `tenant_id` em todas as queries (RLS no Postgres quando Supabase).
- Interpretador de fórmulas **sem `eval`** — whitelist de operadores e funções.
- Uploads com validação de tipo/tamanho, URLs assinadas com expiração.
- Secrets apenas em variáveis de ambiente do provedor (nunca no repositório).
