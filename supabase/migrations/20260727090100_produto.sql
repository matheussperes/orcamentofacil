-- Task 11.2 — Modelo de dados multi-tenant completo (2/8): produto
--
-- docs/Modelo-de-Dominio.md Seção 7 ("Produto"): chapas, ferragens, LEDs,
-- acessórios. Atributos variam por tipo (chapa tem cor+espessura, ferragem
-- tem código+unidade) — `especificacao` é jsonb, mesmo padrão já usado em
-- organizacao.modo_precificacao_padrao. Cópia-no-signup (D-15) é lógica de
-- população de dados (Task 11.4), fora de escopo aqui — a tabela nasce vazia.

create table public.produto (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  tipo text not null check (tipo in ('chapa', 'ferragem', 'fita', 'led', 'acessorio')),
  nome text not null,
  especificacao jsonb not null default '{}'::jsonb,
  preco numeric(12, 2) not null default 0,
  fornecedor text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

comment on table public.produto is 'Catálogo de material da organização (Modelo-de-Dominio.md Seção 7). especificacao varia por tipo (chapa: cor/espessura; ferragem: codigo/unidade etc.).';

create index produto_organizacao_id_idx on public.produto (organizacao_id);

alter table public.produto enable row level security;

-- RLS: CRUD completo, escopo = própria org.

create policy "produto_select_propria_org"
  on public.produto
  for select
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));

create policy "produto_insert_propria_org"
  on public.produto
  for insert
  to authenticated
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "produto_update_propria_org"
  on public.produto
  for update
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()))
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "produto_delete_propria_org"
  on public.produto
  for delete
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));
