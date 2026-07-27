-- Task 11.2 — Modelo de dados multi-tenant completo (8/8): lista_material
--
-- docs/Modelo-de-Dominio.md Seção 7 ("Lista de material fechada", D-08):
-- snapshot congelado no fechamento da proposta, extraível texto/CSV. Seção
-- 5.4: "proposta se regenera, nunca se edita" — por isso esta tabela NÃO tem
-- política de UPDATE (decisão fechada do Maestro). Regenerar = inserir nova
-- linha, nunca editar a existente.

create table public.lista_material (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  orcamento_id uuid not null references public.orcamento (id) on delete cascade,
  snapshot jsonb not null,
  criado_em timestamptz not null default now()
);

comment on table public.lista_material is 'Lista de material congelada no fechamento do orçamento (Modelo-de-Dominio.md Seção 7, D-08). Imutável: sem política de UPDATE, regeneração cria nova linha.';

create index lista_material_organizacao_id_idx on public.lista_material (organizacao_id);
create index lista_material_orcamento_id_idx on public.lista_material (orcamento_id);

alter table public.lista_material enable row level security;

-- RLS: SELECT/INSERT/DELETE escopo = própria org. Sem UPDATE (imutabilidade
-- é regra de negócio, não só convenção de app).

create policy "lista_material_select_propria_org"
  on public.lista_material
  for select
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));

create policy "lista_material_insert_propria_org"
  on public.lista_material
  for insert
  to authenticated
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "lista_material_delete_propria_org"
  on public.lista_material
  for delete
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));
