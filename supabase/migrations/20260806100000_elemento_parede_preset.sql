-- Task 2.12 (back) — ElementoParedePreset, fora do catálogo de produtos (Q-5).
--
-- docs/Modelo-de-Dominio.md Seção 3.2.3: "só nome" — atalho de digitação por
-- organização, sem preço/status/tipo (não é insumo, não entra em custo/BOM/
-- rateio, não aparece em /catalogo). Aplicar o preset COPIA nome/dimensões
-- para o ElementoParede (lógica client-side da Task 2.12 (front) — fora
-- deste escopo). Sem conceito de preset global: toda linha pertence a uma
-- organização (organizacao_id not null) — diferente do padrão de
-- `gabarito`. Padrão de migration/RLS reaproveitado de
-- 20260727090000_cliente.sql.

create table public.elemento_parede_preset (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  nome text not null,
  largura_padrao numeric,
  altura_padrao numeric,
  criado_em timestamptz not null default now()
);

comment on table public.elemento_parede_preset is 'Preset de elemento de parede (Modelo-de-Dominio.md Seção 3.2.3, decisão Q-5) — atalho de digitação por organização, fora do catálogo de produtos. Sem preço/status/tipo; aplicar o preset copia nome/dimensões para o ElementoParede, sem vínculo vivo.';

create index elemento_parede_preset_organizacao_id_idx on public.elemento_parede_preset (organizacao_id);

alter table public.elemento_parede_preset enable row level security;

-- RLS: CRUD completo, escopo = própria org. private.org_do_usuario() envolvida
-- em (select ...) para resolver uma vez por query (padrão fixado na migration
-- 20260724182140_otimizar_rls_initplan_perfil.sql).

create policy "elemento_parede_preset_select_propria_org"
  on public.elemento_parede_preset
  for select
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));

create policy "elemento_parede_preset_insert_propria_org"
  on public.elemento_parede_preset
  for insert
  to authenticated
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "elemento_parede_preset_update_propria_org"
  on public.elemento_parede_preset
  for update
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()))
  with check (organizacao_id = (select private.org_do_usuario()));

create policy "elemento_parede_preset_delete_propria_org"
  on public.elemento_parede_preset
  for delete
  to authenticated
  using (organizacao_id = (select private.org_do_usuario()));
