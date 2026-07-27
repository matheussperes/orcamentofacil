-- Task 11.2 — Modelo de dados multi-tenant completo (4/8): orcamento
--
-- docs/Modelo-de-Dominio.md Seção 7 ("Orçamento"): ref. Cliente, status,
-- itens, prazo de entrega. `itens` guarda ItemOrcamento[] (union
-- custom_box | placa, Seção 1) como jsonb — normalização de itens não está
-- no escopo das 9 tabelas desta task. `modo_precificacao`/`modo_montagem`
-- são overrides opcionais dos defaults em organizacao (null = usa o da org).
-- `frete` é editável (D-23).
--
-- Nota de integridade (não bloqueante, decisão documentada): cliente_id deve
-- pertencer à mesma organizacao_id do orçamento. FK simples não garante isso
-- sozinha; RLS de `cliente` já impede o app de selecionar cliente de outra
-- org para popular o formulário, então o risco prático é baixo. Fechar 100%
-- via trigger fica para uma iteração futura, se necessário.

create table public.orcamento (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  cliente_id uuid not null references public.cliente (id) on delete restrict,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  prazo_entrega text,
  modo_precificacao jsonb,
  modo_montagem jsonb,
  frete numeric(12, 2),
  itens jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.orcamento is 'Orçamento da organização (Modelo-de-Dominio.md Seção 7). itens = ItemOrcamento[] (Seção 1); modo_precificacao/modo_montagem sobrescrevem os defaults de organizacao quando não nulos.';

create index orcamento_organizacao_id_idx on public.orcamento (organizacao_id);
create index orcamento_cliente_id_idx on public.orcamento (cliente_id);

alter table public.orcamento enable row level security;

-- RLS: CRUD completo, escopo = própria org.

create policy "orcamento_select_propria_org"
  on public.orcamento
  for select
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));

create policy "orcamento_insert_propria_org"
  on public.orcamento
  for insert
  to authenticated
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "orcamento_update_propria_org"
  on public.orcamento
  for update
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()))
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "orcamento_delete_propria_org"
  on public.orcamento
  for delete
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));
