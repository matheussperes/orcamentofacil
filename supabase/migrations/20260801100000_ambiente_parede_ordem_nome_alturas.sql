-- Task 0.1-0.3 — Ambiente/Parede como entidade real N×N (fim do singleton)
--
-- docs/Modelo-de-Dominio.md Seção 3.2 ([V2.1]): a hierarquia
-- Orçamento 1—N Ambiente 1—N Parede 1—N ItemPosicionado deixa de ter limite
-- de cardinalidade. O schema de `ambiente`/`parede`
-- (supabase/migrations/20260727090400_ambiente_parede.sql) já suporta N
-- linhas por FK — o limite de "1 ambiente, 1 parede" era só da aplicação.
-- Esta migration só acrescenta o que falta para ORDENAR e NOMEAR de forma
-- estável (RF-19): `ordem` em ambas as tabelas, `nome`/`alturas_override` em
-- `parede`. Nenhuma política de RLS nova — coluna nova em tabela que já tem
-- as 4 políticas (select/insert/update/delete escopadas por
-- organizacao_id = private.org_do_usuario()).
--
-- Retrocompatível: toda coluna nova tem DEFAULT, nenhuma linha existente
-- fica inválida. Shape e comentários copiados de
-- .maestro/tmp/schema-v2.1-delta.sql Seções 1 e 2 (não inventar shape novo).

-- =============================================================================
-- 1. ambiente — ordenação estável (Modelo 3.2)
-- =============================================================================

alter table public.ambiente
  add column ordem integer not null default 0;

create index ambiente_orcamento_ordem_idx
  on public.ambiente (orcamento_id, ordem);

-- Invariante de nome (Modelo 3.2: "Ambiente.nome não vazio").
alter table public.ambiente
  add constraint ambiente_nome_nao_vazio check (length(btrim(nome)) > 0);

-- =============================================================================
-- 2. parede — nome livre, ordem e override de alturas (Modelo 3.2 / 3.2.1)
-- =============================================================================

alter table public.parede
  add column nome text not null default 'Parede 1',   -- item 0.6 (nome livre)
  add column ordem integer not null default 0,
  add column alturas_override jsonb not null default '{}'::jsonb;  -- Q-1

alter table public.parede
  add constraint parede_nome_nao_vazio check (length(btrim(nome)) > 0);

create index parede_ambiente_ordem_idx on public.parede (ambiente_id, ordem);

comment on column public.parede.alturas_override is
  'Q-1 (Modelo 3.2.1): override CAMPO A CAMPO de AlturasFaixas. Chave ausente = herdado de organizacao.alturas_padrao. `{}` = tudo herdado. NUNCA gravar aqui uma cópia integral do perfil — copiar congela o valor e quebra a propagação.';

-- Chaves aceitas em alturas_override (subconjunto de AlturasFaixas):
--   alturaRodape · alturaBancada · alturaInstalacaoAereo · peDireito
-- Validação de shape fica na aplicação (jsonb sem schema formal, mesmo
-- padrão já usado em organizacao.modo_precificacao_padrao).
