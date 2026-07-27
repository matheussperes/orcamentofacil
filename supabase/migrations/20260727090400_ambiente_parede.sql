-- Task 11.2 — Modelo de dados multi-tenant completo (5/8): ambiente + parede
--
-- docs/Modelo-de-Dominio.md Seção 7 ("Ambiente/Parede") e Seção 3.2. As duas
-- tabelas formam a mesma unidade conceitual (parede é filho direto de
-- ambiente, sem uso independente) e vão na mesma migration por coesão.
-- organizacao_id é denormalizado em ambas (decisão fechada do Maestro: RLS
-- direta por coluna, não via EXISTS em tabela pai).
--
-- parede: primeiro corte é 1 parede por ambiente, mas o limite é regra de
-- UI/app — a tabela já modela N paredes por ambiente sem alteração de schema.

create table public.ambiente (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  orcamento_id uuid not null references public.orcamento (id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);

comment on table public.ambiente is 'Ambiente de um orçamento (Modelo-de-Dominio.md Seção 7, 3.2). organizacao_id denormalizado para RLS direta.';

create index ambiente_organizacao_id_idx on public.ambiente (organizacao_id);
create index ambiente_orcamento_id_idx on public.ambiente (orcamento_id);

alter table public.ambiente enable row level security;

create table public.parede (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  ambiente_id uuid not null references public.ambiente (id) on delete cascade,
  altura numeric not null,
  largura numeric not null,
  elementos jsonb not null default '[]'::jsonb,
  itens jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now()
);

comment on table public.parede is 'Parede de um ambiente (Modelo-de-Dominio.md Seção 3.2). elementos = ElementoParede[] (janela/porta/tomada/ponto hidráulico); itens = ItemPosicionado[]. organizacao_id denormalizado para RLS direta.';

create index parede_organizacao_id_idx on public.parede (organizacao_id);
create index parede_ambiente_id_idx on public.parede (ambiente_id);

alter table public.parede enable row level security;

-- RLS — ambiente: CRUD completo, escopo = própria org.

create policy "ambiente_select_propria_org"
  on public.ambiente
  for select
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));

create policy "ambiente_insert_propria_org"
  on public.ambiente
  for insert
  to authenticated
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "ambiente_update_propria_org"
  on public.ambiente
  for update
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()))
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "ambiente_delete_propria_org"
  on public.ambiente
  for delete
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));

-- RLS — parede: CRUD completo, escopo = própria org.

create policy "parede_select_propria_org"
  on public.parede
  for select
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));

create policy "parede_insert_propria_org"
  on public.parede
  for insert
  to authenticated
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "parede_update_propria_org"
  on public.parede
  for update
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()))
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "parede_delete_propria_org"
  on public.parede
  for delete
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));
