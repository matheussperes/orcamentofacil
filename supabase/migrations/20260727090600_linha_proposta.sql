-- Task 11.2 — Modelo de dados multi-tenant completo (7/8): linha_proposta
--
-- docs/Modelo-de-Dominio.md Seção 6 (comercial). `itens` guarda os itemIds
-- (1..N, módulos e/ou placas) agrupados nessa linha. `imagem_url` é
-- RenderRef — caminho/URL no Storage, nunca binário. `valor_rateado` é
-- congelado no fechamento da proposta (null até lá), sobrescrevível por
-- override manual do usuário.

create table public.linha_proposta (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  orcamento_id uuid not null references public.orcamento (id) on delete cascade,
  titulo text not null,
  itens jsonb not null default '[]'::jsonb,
  imagem_url text,
  descricao text,
  valor_rateado numeric(12, 2),
  criado_em timestamptz not null default now()
);

comment on table public.linha_proposta is 'Linha de proposta comercial (Modelo-de-Dominio.md Seção 6). valor_rateado é congelado no fechamento; organizacao_id denormalizado para RLS direta.';

create index linha_proposta_organizacao_id_idx on public.linha_proposta (organizacao_id);
create index linha_proposta_orcamento_id_idx on public.linha_proposta (orcamento_id);

alter table public.linha_proposta enable row level security;

-- RLS: CRUD completo, escopo = própria org.

create policy "linha_proposta_select_propria_org"
  on public.linha_proposta
  for select
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));

create policy "linha_proposta_insert_propria_org"
  on public.linha_proposta
  for insert
  to authenticated
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "linha_proposta_update_propria_org"
  on public.linha_proposta
  for update
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()))
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "linha_proposta_delete_propria_org"
  on public.linha_proposta
  for delete
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));
