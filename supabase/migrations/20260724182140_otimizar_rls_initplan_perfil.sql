-- Task 11.1 — get_advisors (performance) apontou re-avaliação de auth.uid()
-- por linha nas políticas de `perfil` (auth_rls_initplan). Fix recomendado
-- pelo próprio Supabase: envolver auth.<fn>() em subquery `(select ...)` para
-- que o planner resolva uma vez por query, não uma vez por linha.

drop policy "perfil_select_proprio_ou_mesma_org" on public.perfil;

create policy "perfil_select_proprio_ou_mesma_org"
  on public.perfil
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or organizacao_id = private.org_do_usuario()
  );

drop policy "perfil_update_proprio" on public.perfil;

create policy "perfil_update_proprio"
  on public.perfil
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
