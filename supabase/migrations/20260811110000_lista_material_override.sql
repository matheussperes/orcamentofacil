-- Task 3.8 (back) — override de quantidade por item da lista de material,
-- pré-congelamento (RF-15).
--
-- lib/insumos.ts: `LinhaInsumo` é derivada ao vivo do motor a cada render,
-- sem id próprio — o texto `item` (ex. "MDF Branco TX 15mm") é
-- determinístico e estável para a mesma config, escopado por
-- `orcamento_id` (sem colisão entre orçamentos). Só a quantidade é
-- editável: categoria, descrição e valor unitário continuam vindo do
-- cálculo ao vivo, nunca são persistidos aqui.
--
-- Diferente de `lista_material` (Task 11.2, snapshot imutável pós-
-- congelamento), esta tabela É mutável enquanto o orçamento está aberto —
-- por isso tem política de UPDATE. Overrides não são limpos ao congelar
-- nem ao reabrir: ficam dormentes enquanto `congelado_em is not null`
-- (mesmo espírito do `valorRateado`, Modelo-de-Dominio.md 5.4.1 I3), e a
-- checagem de congelamento é feita na Server Action, não no schema.

create table public.lista_material_override (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  orcamento_id uuid not null references public.orcamento (id) on delete cascade,
  item_chave text not null,
  quantidade numeric not null check (quantidade >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (orcamento_id, item_chave)
);

comment on table public.lista_material_override is 'Override de quantidade por item da lista de material (LinhaInsumo.item como chave natural), pré-congelamento. Task 3.8 (back), RF-15.';

create index lista_material_override_organizacao_id_idx on public.lista_material_override (organizacao_id);
create index lista_material_override_orcamento_id_idx on public.lista_material_override (orcamento_id);

alter table public.lista_material_override enable row level security;

-- RLS: SELECT/INSERT/UPDATE/DELETE escopados pela própria org — estado
-- mutável pré-congelamento, precisa de UPDATE (diferente de lista_material).

create policy "lista_material_override_select_propria_org"
  on public.lista_material_override
  for select
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));

create policy "lista_material_override_insert_propria_org"
  on public.lista_material_override
  for insert
  to authenticated
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "lista_material_override_update_propria_org"
  on public.lista_material_override
  for update
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()))
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "lista_material_override_delete_propria_org"
  on public.lista_material_override
  for delete
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));
