-- Task 11.2 — Modelo de dados multi-tenant completo (6/8): elemento_continuo
--
-- docs/Modelo-de-Dominio.md Seção 3.4/3.5 (tampo/rodapé/tamponamento/
-- fechamento). `alvo` referencia um Conjunto (derivado por adjacência, não
-- persistido nesta task) ou um Módulo — por isso é jsonb solto
-- ({tipo: "conjunto"|"modulo", id: string}), SEM foreign key (decisão
-- fechada do Maestro: não criar tabela `conjunto` por conta própria).
-- `engrossamento` só se aplica a tipo='tampo' (Seção 2.1); fica null nos
-- demais tipos.

create table public.elemento_continuo (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  orcamento_id uuid not null references public.orcamento (id) on delete cascade,
  tipo text not null check (tipo in ('tampo', 'rodape', 'tamponamento', 'fechamento')),
  alvo jsonb not null,
  posicao text not null check (posicao in ('superior', 'base', 'esquerda', 'direita', 'topo')),
  produto_id uuid references public.produto (id) on delete set null,
  espessura numeric,
  override jsonb,
  engrossamento jsonb,
  criado_em timestamptz not null default now()
);

comment on table public.elemento_continuo is 'Tampo/rodapé/tamponamento/fechamento de um orçamento (Modelo-de-Dominio.md Seção 3.4/3.5). alvo referencia Conjunto ou Módulo por jsonb solto (sem FK: Conjunto não é entidade persistida). organizacao_id denormalizado para RLS direta.';

create index elemento_continuo_organizacao_id_idx on public.elemento_continuo (organizacao_id);
create index elemento_continuo_orcamento_id_idx on public.elemento_continuo (orcamento_id);
create index elemento_continuo_produto_id_idx on public.elemento_continuo (produto_id);

alter table public.elemento_continuo enable row level security;

-- RLS: CRUD completo, escopo = própria org.

create policy "elemento_continuo_select_propria_org"
  on public.elemento_continuo
  for select
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));

create policy "elemento_continuo_insert_propria_org"
  on public.elemento_continuo
  for insert
  to authenticated
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "elemento_continuo_update_propria_org"
  on public.elemento_continuo
  for update
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()))
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "elemento_continuo_delete_propria_org"
  on public.elemento_continuo
  for delete
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));
