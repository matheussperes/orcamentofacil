-- Task 11.2 — Modelo de dados multi-tenant completo (3/8): gabarito
--
-- docs/Modelo-de-Dominio.md Seção 7 ("Módulo/Gabarito", D-15): base global
-- read-only + fork na edição. Única tabela do modelo com organizacao_id
-- NULLABLE (null = base global). `definicao` guarda a árvore BoxModule
-- (lib/engine/box/types.ts). `origem_gabarito_id` registra a linhagem do
-- fork; o mecanismo de fork em si (duplicar global -> org) é lógica de app
-- da Task 11.4, fora de escopo aqui.

create table public.gabarito (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid references public.organizacao (id) on delete cascade,
  origem_gabarito_id uuid references public.gabarito (id) on delete set null,
  nome text not null,
  categoria text not null,
  definicao jsonb not null,
  criado_em timestamptz not null default now()
);

comment on table public.gabarito is 'Base global (organizacao_id null, read-only para todas as orgs) + fork por org (Modelo-de-Dominio.md Seção 7, D-15). definicao = árvore BoxModule.';

create index gabarito_organizacao_id_idx on public.gabarito (organizacao_id);

alter table public.gabarito enable row level security;

-- RLS — única tabela com padrão diferente das demais (decisão fechada do
-- Maestro): SELECT enxerga global + própria org; escrita exige linha da
-- própria org (cliente nunca cria/edita/apaga a linha global).

create policy "gabarito_select_global_ou_propria_org"
  on public.gabarito
  for select
  to authenticated
  using (
    organizacao_id is null
    or organizacao_id = (select private.org_do_usuario())
  );

create policy "gabarito_insert_propria_org"
  on public.gabarito
  for insert
  to authenticated
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "gabarito_update_propria_org"
  on public.gabarito
  for update
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()))
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "gabarito_delete_propria_org"
  on public.gabarito
  for delete
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));
