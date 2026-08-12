-- Task 4.4 — coluna `codigo` em `produto`, chamada rápida de item do
-- catálogo durante a montagem do orçamento (PRD RF-03, RF-30). Opcional
-- (produto pode não ter código) mas, quando preenchido, único por
-- organização — não globalmente único, cada organização tem catálogo
-- isolado por RLS (supabase/migrations/20260727090100_produto.sql).
--
-- `unique (organizacao_id, codigo)`: comportamento padrão de UNIQUE com NULL
-- em Postgres — NULL nunca colide com NULL, então múltiplos produtos sem
-- código na mesma org continuam válidos; só dois produtos da mesma org com o
-- MESMO `codigo` não-nulo violam a constraint.

alter table public.produto add column if not exists codigo text;

comment on column public.produto.codigo is 'Código opcional de chamada rápida do produto durante a montagem do orçamento (RF-03/RF-30) — único por organização, não globalmente.';

alter table public.produto
  add constraint produto_organizacao_id_codigo_key unique (organizacao_id, codigo);
