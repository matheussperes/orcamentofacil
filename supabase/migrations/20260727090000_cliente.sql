-- Task 11.2 — Modelo de dados multi-tenant completo (1/8): cliente
--
-- docs/Modelo-de-Dominio.md Seção 7 ("Cliente"): nome/telefone/endereço
-- capturados ao criar o orçamento, alimentam a proposta. Escopo Org, RLS
-- direta por organizacao_id (padrão fechado para a task inteira — ver
-- .maestro/tmp/schema.sql).

create table public.cliente (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  nome text not null,
  telefone text,
  endereco text,
  criado_em timestamptz not null default now()
);

comment on table public.cliente is 'Cliente da organização (Modelo-de-Dominio.md Seção 7). Captado ao criar o orçamento.';

create index cliente_organizacao_id_idx on public.cliente (organizacao_id);

alter table public.cliente enable row level security;

-- RLS: CRUD completo, escopo = própria org. private.org_do_usuario() envolvida
-- em (select ...) para resolver uma vez por query (padrão fixado na migration
-- 20260724182140_otimizar_rls_initplan_perfil.sql).

create policy "cliente_select_propria_org"
  on public.cliente
  for select
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));

create policy "cliente_insert_propria_org"
  on public.cliente
  for insert
  to authenticated
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "cliente_update_propria_org"
  on public.cliente
  for update
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()))
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "cliente_delete_propria_org"
  on public.cliente
  for delete
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));
