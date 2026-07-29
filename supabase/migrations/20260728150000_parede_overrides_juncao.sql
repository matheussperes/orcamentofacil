-- Task 13.2b — Conjuntos + handle de junção (persistência de override)
--
-- Coluna nova em parede (já existente, Task 11.2) para guardar os overrides
-- manuais do "handle de junção" da Elevação 2D (Task 13.2a). A lógica pura
-- que consome isso já existe e está testada em lib/engine/conjunto/detectar.ts
-- (detectarConjuntos + aplicarOverrides, Task 12.3).
--
-- Nesta task (13.2b) o Frontend ainda persiste via localStorage, não via
-- Supabase — a coluna fica pronta no schema para a Task 13.3 passar a
-- persistir de verdade. parede já tem RLS completa via organizacao_id
-- denormalizado (Task 11.2), então não é preciso política nova.

alter table public.parede
  add column overrides_juncao jsonb not null default '[]'::jsonb;

comment on column public.parede.overrides_juncao is
  'OverrideJuncao[] (lib/engine/conjunto/types.ts) — override manual do handle de junção, sobrepõe detectarConjuntos(). Task 13.2b.';
