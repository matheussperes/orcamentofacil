-- Task 11.4 (1/2) — Cópia de catálogo padrão no signup (D-15: Produto = cópia)
--
-- docs/Modelo-de-Dominio.md D-15: cada organização nasce com seu próprio
-- catálogo de produtos (preço é local, editável por org). Fonte dos dados:
-- lib/catalog.ts (CATALOGO_PADRAO.mdf) e lib/engine/prices.ts
-- (PRECOS_REFERENCIA.ferragens / fitaMetro) — os mesmos valores hoje usados
-- no MVP em localStorage. `produto` não tem coluna `unidade` própria
-- (confirmado via information_schema antes de escrever esta migration) —
-- unidade vai dentro de `especificacao` (jsonb), mesmo padrão já usado para
-- cor/espessura de chapa. montagemPorM2/freteFixo NÃO são copiados como
-- produto (D-23/D-26 — viraram organizacao.modo_montagem_padrao e
-- orcamento.frete). Tipos led/acessorio nascem vazios (sem dado de
-- referência hoje em lib/catalog.ts ou lib/engine/prices.ts).
--
-- Trigger separada de handle_new_user (Task 11.1): AFTER INSERT em
-- `organizacao`, não em auth.users. Desacopla "criar organização" de
-- "popular catálogo padrão" (uma migration, uma mudança coesa; não editamos
-- a função de 11.1, já aprovada e em produção). Roda na mesma transação do
-- signup (handle_new_user insere a org; esta trigger dispara em seguida),
-- continua atômico. Qualquer caminho futuro que crie uma organizacao (não só
-- signup) ganha o catálogo de graça.
--
-- SECURITY DEFINER com search_path = '' (mesmo padrão de handle_new_user em
-- 11.1): a trigger precisa inserir em produto de uma org que acabou de
-- nascer, antes de qualquer perfil existir — não pode depender de
-- private.org_do_usuario().

create function public.seed_produtos_padrao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Chapas de MDF (lib/catalog.ts CATALOGO_PADRAO.mdf, 8 itens).
  insert into public.produto (organizacao_id, tipo, nome, especificacao, preco)
  values
    (new.id, 'chapa', 'Branco TX 6mm', '{"cor":"Branco TX","espessura":6}'::jsonb, 155),
    (new.id, 'chapa', 'Branco TX 15mm', '{"cor":"Branco TX","espessura":15}'::jsonb, 285),
    (new.id, 'chapa', 'Branco TX 18mm', '{"cor":"Branco TX","espessura":18}'::jsonb, 315),
    (new.id, 'chapa', 'Louro Freijó 15mm', '{"cor":"Louro Freijó","espessura":15}'::jsonb, 380),
    (new.id, 'chapa', 'Louro Freijó 18mm', '{"cor":"Louro Freijó","espessura":18}'::jsonb, 420),
    (new.id, 'chapa', 'Cinza Sagrado 15mm', '{"cor":"Cinza Sagrado","espessura":15}'::jsonb, 295),
    (new.id, 'chapa', 'Cinza Sagrado 18mm', '{"cor":"Cinza Sagrado","espessura":18}'::jsonb, 330),
    (new.id, 'chapa', 'Madeirado 18mm', '{"cor":"Madeirado","espessura":18}'::jsonb, 410);

  -- Ferragens (lib/engine/prices.ts PRECOS_REFERENCIA.ferragens + nomes de
  -- lib/catalog.ts NOMES_FERRAGENS, 10 itens).
  insert into public.produto (organizacao_id, tipo, nome, especificacao, preco)
  values
    (new.id, 'ferragem', 'Dobradiça 35mm', '{"codigo":"dobradica_35","unidade":"un"}'::jsonb, 8.0),
    (new.id, 'ferragem', 'Corrediça (par)', '{"codigo":"corredica_par","unidade":"par"}'::jsonb, 45.0),
    (new.id, 'ferragem', 'Puxador', '{"codigo":"puxador","unidade":"un"}'::jsonb, 15.0),
    (new.id, 'ferragem', 'Pé nivelador', '{"codigo":"pe_nivelador","unidade":"un"}'::jsonb, 2.0),
    (new.id, 'ferragem', 'Suporte de fixação (aéreo)', '{"codigo":"suporte_fixacao_aereo","unidade":"un"}'::jsonb, 6.0),
    (new.id, 'ferragem', 'Kit de parafusos (módulo)', '{"codigo":"parafuso_kit_modulo","unidade":"kit"}'::jsonb, 12.0),
    (new.id, 'ferragem', 'Fita LED', '{"codigo":"fita_led_m","unidade":"m"}'::jsonb, 25.0),
    (new.id, 'ferragem', 'Pistão a gás (basculante)', '{"codigo":"pistao","unidade":"un"}'::jsonb, 35.0),
    (new.id, 'ferragem', 'Kit porta de correr (trilho + roldanas)', '{"codigo":"kit_porta_correr","unidade":"kit"}'::jsonb, 90.0),
    (new.id, 'ferragem', 'Perfil puxador (alumínio)', '{"codigo":"perfil_puxador_m","unidade":"m"}'::jsonb, 45.0);

  -- Fita de borda (lib/engine/prices.ts PRECOS_REFERENCIA.fitaMetro).
  insert into public.produto (organizacao_id, tipo, nome, especificacao, preco)
  values
    (new.id, 'fita', 'Fita de borda', '{"unidade":"m"}'::jsonb, 2.5);

  return new;
end;
$$;

comment on function public.seed_produtos_padrao() is
  'AFTER INSERT em organizacao: popula o catálogo padrão de produtos (D-15 — '
  'Produto = cópia no signup). Fonte: lib/catalog.ts CATALOGO_PADRAO.mdf + '
  'lib/engine/prices.ts PRECOS_REFERENCIA.ferragens/fitaMetro. Não copia '
  'montagemPorM2/freteFixo (viraram organizacao.modo_montagem_padrao e '
  'orcamento.frete, D-23/D-26). Tipos led/acessorio nascem vazios.';

create trigger on_organizacao_created
  after insert on public.organizacao
  for each row
  execute function public.seed_produtos_padrao();

-- Mesmo padrão de handle_new_user (11.1): função só deve rodar via trigger,
-- nunca como RPC direta via PostgREST.
revoke execute on function public.seed_produtos_padrao() from public;
revoke execute on function public.seed_produtos_padrao() from anon;
revoke execute on function public.seed_produtos_padrao() from authenticated;
