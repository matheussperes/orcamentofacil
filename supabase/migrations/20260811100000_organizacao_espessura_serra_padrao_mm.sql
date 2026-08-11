-- Task 4.16-back — kerf do perfil (docs/Modelo-de-Dominio.md Seção 8.2, A-13, A-14)
--
-- Campo único no Perfil da organização, não por chapa/material (A-13): a
-- mesma serra/disco corta qualquer chapa com o mesmo consumo de material no
-- corte. Default 3 mm, editável (A-14) — `0` é um valor válido (kerf real
-- zero), não "não preenchido"; por isso o sentinela de "sem valor" nunca é
-- null/undefined na aplicação, é o próprio DEFAULT do banco.
--
-- Sem RLS nova: coluna em `organizacao`, que já tem as 4 policies da
-- fundação multitenant (supabase/migrations/20260724181915_fundacao_multitenant.sql).
-- Retrocompatível: DEFAULT cobre todas as linhas existentes.

alter table public.organizacao
  add column espessura_serra_padrao_mm numeric not null default 3;

alter table public.organizacao
  add constraint organizacao_espessura_serra_padrao_mm_nao_negativa
  check (espessura_serra_padrao_mm >= 0);

comment on column public.organizacao.espessura_serra_padrao_mm is
  'Kerf (Modelo-de-Dominio.md Seção 8.2): espessura de serra/disco em mm, consumida em cada corte entre peças adjacentes na mesma chapa. Campo único da organização, não por chapa/material (A-13). Default 3 mm, editável; 0 é valor válido (A-14).';
