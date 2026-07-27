-- Task 11.3 — Teste de isolamento por tabela (tenant A != tenant B)
--
-- docs/Modelo-de-Dominio.md Secao 7 exige, como criterio de aceitacao
-- obrigatorio: "um teste de isolamento por tabela: tenant A nao le dados do
-- tenant B" para as 11 tabelas multi-tenant: as 9 criadas na Task 11.2
-- (cliente, produto, gabarito, orcamento, ambiente, parede,
-- elemento_continuo, linha_proposta, lista_material) + organizacao + perfil,
-- criadas na Task 11.1.
--
-- SEGURO DE RODAR CONTRA PRODUCAO QUANTAS VEZES QUISER
-- ------------------------------------------------------
-- O script inteiro roda dentro de UMA UNICA transacao `begin; ... rollback;`.
-- Ele:
--   1. Insere 2 usuarios sinteticos em auth.users (emails
--      qa_isolamento_tenant_a@maestro.local / _b@maestro.local), o que
--      dispara a trigger real `on_auth_user_created` (Task 11.1) e cria
--      organizacao + perfil de cada um automaticamente.
--   2. Para cada tabela multi-tenant, simula a sessao autenticada de cada
--      tenant via `set local role authenticated` + `set local
--      request.jwt.claims`, insere dados como tenant A e tenta ler/escrever
--      como tenant B, comparando com o esperado.
--   3. Falha ALTO com RAISE EXCEPTION se qualquer asuncao nao bater (o script
--      inteiro aborta e a transacao e desfeita automaticamente).
--   4. Termina com `rollback;` explicito no caminho de sucesso -- nenhuma
--      linha inserida por este script sobrevive, em nenhum dos dois casos.
--
-- Por que precisa de `set local role authenticated`:
-- a conexao usada para rodar este script (via MCP `execute_sql` do Supabase,
-- ou via SQL Editor do painel, ou via psql com a connection string do
-- projeto) roda tipicamente como `postgres`, que e superuser e BYPASSA RLS
-- por completo (as migrations desta base nao usam `FORCE ROW LEVEL
-- SECURITY`, entao RLS so e aplicada a quem nao e dono da tabela). Sem o
-- `set local role authenticated`, todo SELECT/UPDATE/DELETE abaixo passaria
-- mesmo com uma policy quebrada -- falso-positivo. Verificado manualmente
-- antes de escrever este arquivo (`select current_user` = postgres; depois
-- de `set local role authenticated`, `select current_user` = authenticated).
--
-- Como rodar:
--   - Via MCP do Supabase: chame `execute_sql` (project_id do projeto real,
--     ioakptuwhfvlirvrciwg) com o CONTEUDO INTEIRO deste arquivo como uma
--     unica query (nao rode statement a statement -- `set local role` e as
--     variaveis de sessao precisam sobreviver entre statements, e isso so
--     acontece dentro da mesma chamada/conexao).
--   - Via SQL Editor do painel Supabase ou `psql`: cole o arquivo inteiro e
--     execute de uma vez (mesma razao acima).
--   - Depois de rodar, confirme zero residuo:
--       select count(*) from auth.users
--       where email like 'qa_isolamento_tenant_%@maestro.local';
--     Deve retornar 0 (o rollback ja garante isso; a query e so uma
--     confirmacao independente).
--
-- Saida esperada: uma sequencia de `NOTICE: OK ...` e, no final,
-- `NOTICE: TODOS OS TESTES DE ISOLAMENTO PASSARAM.` seguido do `rollback`.
-- Qualquer `ERROR:` interrompe o script e aponta exatamente qual tabela /
-- operacao falhou.

begin;

-- =============================================================================
-- 0. Setup: usuarios sinteticos (dispara a trigger on_auth_user_created)
-- =============================================================================
-- Schema de auth.users investigado antes de escrever este INSERT (`select
-- column_name, is_nullable, column_default from information_schema.columns
-- where table_schema='auth' and table_name='users'`): a unica coluna NOT
-- NULL sem default e `id`; is_sso_user/is_anonymous tem default false. Nao
-- ha necessidade de senha real (nenhum login de verdade acontece aqui).

insert into auth.users (
  id, instance_id, aud, role, email,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'qa_isolamento_tenant_a@maestro.local',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"organizacao_nome":"QA Isolamento Tenant A"}'::jsonb,
    now(), now(), false, false
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'qa_isolamento_tenant_b@maestro.local',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"organizacao_nome":"QA Isolamento Tenant B"}'::jsonb,
    now(), now(), false, false
  );

-- Tabela temporaria para carregar ids entre statements/blocos deste script
-- (cada `do $$ ... $$` tem escopo proprio; a tabela e a forma simples de
-- compartilhar estado). Cai junto no rollback, nao deixa residuo.
create temporary table qa_ids (
  key text primary key,
  value uuid not null
);

-- A tabela temporaria nasce sem privilegios para PUBLIC/authenticated (so o
-- dono, que roda este script como postgres, enxerga por padrao). Como o
-- restante do script le/escreve nela enquanto a sessao esta como
-- `authenticated` (Secoes 2-4), o grant explicito e necessario -- sem ele,
-- toda referencia a qa_ids depois do `set local role authenticated` falha
-- com "permission denied for table qa_ids" (confirmado ao rodar este script
-- pela primeira vez).

grant select, insert on qa_ids to authenticated;

do $$
declare
  v_org_a uuid;
  v_org_b uuid;
begin
  select organizacao_id into v_org_a from public.perfil where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  select organizacao_id into v_org_b from public.perfil where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  if v_org_a is null or v_org_b is null then
    raise exception 'Trigger on_auth_user_created nao criou perfil/organizacao para os usuarios sinteticos -- teste nao pode continuar (isso e falha de setup, nao de RLS)';
  end if;

  if v_org_a = v_org_b then
    raise exception 'Os dois usuarios sinteticos cairam na mesma organizacao (%), impossivel testar isolamento entre tenants', v_org_a;
  end if;

  insert into qa_ids (key, value) values
    ('org_a', v_org_a),
    ('org_b', v_org_b),
    ('user_a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('user_b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

  raise notice 'OK setup -- org_a=%, org_b=% (trigger 11.1 funcionou, orgs distintas)', v_org_a, v_org_b;
end $$;

-- =============================================================================
-- 1. Funcoes auxiliares (pg_temp -- somente desta sessao/transacao)
-- =============================================================================

create function pg_temp.qa_expect_select_count(
  p_table text, p_id uuid, p_expected int, p_label text
) returns void language plpgsql as $$
declare
  v_count int;
begin
  execute format('select count(*) from public.%I where id = $1', p_table) into v_count using p_id;
  if v_count <> p_expected then
    raise exception 'FALHA em % -- SELECT: esperado % linha(s), obteve % (id=%)', p_label, p_expected, v_count, p_id;
  end if;
  raise notice 'OK % -- SELECT retornou % linha(s) (esperado)', p_label, v_count;
end;
$$;

create function pg_temp.qa_expect_affected_count(
  p_op text, p_table text, p_id uuid, p_expected int, p_label text
) returns void language plpgsql as $$
declare
  v_count int;
begin
  if p_op = 'update' then
    execute format('update public.%I set criado_em = criado_em where id = $1', p_table) using p_id;
  elsif p_op = 'delete' then
    execute format('delete from public.%I where id = $1', p_table) using p_id;
  else
    raise exception 'operacao invalida em qa_expect_affected_count: %', p_op;
  end if;
  get diagnostics v_count = row_count;
  if v_count <> p_expected then
    raise exception 'FALHA em % -- % afetou % linha(s), esperado % (id=%)', p_label, upper(p_op), v_count, p_expected, p_id;
  end if;
  raise notice 'OK % -- % afetou % linha(s) (esperado)', p_label, upper(p_op), v_count;
end;
$$;

-- EXECUTE ja e concedido a PUBLIC por default privilege ao criar a funcao,
-- mas o grant explicito abaixo documenta a intencao e blinda o script caso o
-- projeto altere os default privileges de `postgres` no futuro.
grant execute on function pg_temp.qa_expect_select_count(text, uuid, int, text) to authenticated;
grant execute on function pg_temp.qa_expect_affected_count(text, text, uuid, int, text) to authenticated;

-- =============================================================================
-- 2. Sessao do tenant A -- insere 1 linha em cada uma das 9 tabelas de 11.2
-- =============================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

do $$
begin
  if current_user <> 'authenticated' then
    raise exception 'set local role authenticated nao teve efeito -- current_user=% (a conexao pode nao ter permissao de SET ROLE; pare e reporte, nao force alternativa)', current_user;
  end if;
  if auth.uid() is distinct from 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid then
    raise exception 'auth.uid() nao retornou o usuario A esperado -- retornou %', auth.uid();
  end if;
  raise notice 'OK sessao tenant A ativa (current_user=authenticated, auth.uid()=%)', auth.uid();
end $$;

do $$
declare
  v_org_a uuid := (select value from qa_ids where key = 'org_a');
  v_cliente_a uuid;
  v_orcamento_a uuid;
  v_ambiente_a uuid;
  v_parede_a uuid;
  v_elemento_a uuid;
  v_linha_a uuid;
  v_lista_a uuid;
  v_produto_a uuid;
  v_gabarito_a uuid;
begin
  insert into public.cliente (organizacao_id, nome, telefone, endereco)
    values (v_org_a, 'QA Cliente A', '11999999999', 'Rua A, 1')
    returning id into v_cliente_a;

  insert into public.produto (organizacao_id, tipo, nome, especificacao, preco)
    values (v_org_a, 'chapa', 'QA Produto A', '{"cor":"branco"}'::jsonb, 100)
    returning id into v_produto_a;

  insert into public.orcamento (organizacao_id, cliente_id)
    values (v_org_a, v_cliente_a)
    returning id into v_orcamento_a;

  insert into public.ambiente (organizacao_id, orcamento_id, nome)
    values (v_org_a, v_orcamento_a, 'QA Ambiente A')
    returning id into v_ambiente_a;

  insert into public.parede (organizacao_id, ambiente_id, altura, largura)
    values (v_org_a, v_ambiente_a, 2400, 3000)
    returning id into v_parede_a;

  insert into public.elemento_continuo (organizacao_id, orcamento_id, tipo, alvo, posicao)
    values (v_org_a, v_orcamento_a, 'tampo', '{"tipo":"modulo","id":"qa-modulo-a"}'::jsonb, 'superior')
    returning id into v_elemento_a;

  insert into public.linha_proposta (organizacao_id, orcamento_id, titulo)
    values (v_org_a, v_orcamento_a, 'QA Linha A')
    returning id into v_linha_a;

  insert into public.lista_material (organizacao_id, orcamento_id, snapshot)
    values (v_org_a, v_orcamento_a, '{"itens":[]}'::jsonb)
    returning id into v_lista_a;

  insert into public.gabarito (organizacao_id, nome, categoria, definicao)
    values (v_org_a, 'QA Gabarito A', 'teste', '{}'::jsonb)
    returning id into v_gabarito_a;

  insert into qa_ids (key, value) values
    ('cliente_a', v_cliente_a),
    ('produto_a', v_produto_a),
    ('orcamento_a', v_orcamento_a),
    ('ambiente_a', v_ambiente_a),
    ('parede_a', v_parede_a),
    ('elemento_a', v_elemento_a),
    ('linha_a', v_linha_a),
    ('lista_a', v_lista_a),
    ('gabarito_a', v_gabarito_a);

  raise notice 'OK tenant A inseriu 1 linha em cada uma das 9 tabelas de 11.2';
end $$;

-- Controle positivo: tenant A tem que enxergar as proprias linhas (se isso
-- falhar, o teste esta quebrado, nao a RLS -- pare e avise).

do $$
begin
  perform pg_temp.qa_expect_select_count('cliente', (select value from qa_ids where key = 'cliente_a'), 1, 'cliente (controle positivo, tenant A)');
  perform pg_temp.qa_expect_select_count('produto', (select value from qa_ids where key = 'produto_a'), 1, 'produto (controle positivo, tenant A)');
  perform pg_temp.qa_expect_select_count('orcamento', (select value from qa_ids where key = 'orcamento_a'), 1, 'orcamento (controle positivo, tenant A)');
  perform pg_temp.qa_expect_select_count('ambiente', (select value from qa_ids where key = 'ambiente_a'), 1, 'ambiente (controle positivo, tenant A)');
  perform pg_temp.qa_expect_select_count('parede', (select value from qa_ids where key = 'parede_a'), 1, 'parede (controle positivo, tenant A)');
  perform pg_temp.qa_expect_select_count('elemento_continuo', (select value from qa_ids where key = 'elemento_a'), 1, 'elemento_continuo (controle positivo, tenant A)');
  perform pg_temp.qa_expect_select_count('linha_proposta', (select value from qa_ids where key = 'linha_a'), 1, 'linha_proposta (controle positivo, tenant A)');
  perform pg_temp.qa_expect_select_count('lista_material', (select value from qa_ids where key = 'lista_a'), 1, 'lista_material (controle positivo, tenant A)');
  perform pg_temp.qa_expect_select_count('gabarito', (select value from qa_ids where key = 'gabarito_a'), 1, 'gabarito -- linha org-scoped (controle positivo, tenant A)');
  perform pg_temp.qa_expect_select_count('organizacao', (select value from qa_ids where key = 'org_a'), 1, 'organizacao (controle positivo, tenant A)');
  perform pg_temp.qa_expect_select_count('perfil', (select value from qa_ids where key = 'user_a'), 1, 'perfil (controle positivo, tenant A)');
end $$;

-- lista_material e imutavel por design (Modelo-de-Dominio.md Secao 5.4/7,
-- D-08): nao tem politica de UPDATE nenhuma. Confirma que o UPDATE afeta 0
-- linhas mesmo para o proprio dono (tenant A) -- isso NAO e bug.

do $$
begin
  perform pg_temp.qa_expect_affected_count('update', 'lista_material', (select value from qa_ids where key = 'lista_a'), 0, 'lista_material -- sem politica de UPDATE (tenant A, dono da linha)');
end $$;

-- =============================================================================
-- 3. Gabarito global (D-15): so pode ser criado como owner (bypassa RLS),
--    pois a policy de INSERT normal exige organizacao_id = org_do_usuario(),
--    que nunca e null.
-- =============================================================================

reset role;

do $$
declare
  v_gabarito_global uuid;
begin
  insert into public.gabarito (organizacao_id, nome, categoria, definicao)
    values (null, 'QA Gabarito Global', 'teste', '{}'::jsonb)
    returning id into v_gabarito_global;

  insert into qa_ids (key, value) values ('gabarito_global', v_gabarito_global);
  raise notice 'OK gabarito global criado (id=%) como owner -- unica forma de popular organizacao_id=null', v_gabarito_global;
end $$;

-- De volta a sessao do tenant A: espera enxergar o global (comportamento
-- esperado, nao falha de isolamento) mas NAO conseguir editar (nao e dono).

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

do $$
begin
  perform pg_temp.qa_expect_select_count('gabarito', (select value from qa_ids where key = 'gabarito_global'), 1, 'gabarito global visto por tenant A (esperado: visivel para todas as orgs)');
  perform pg_temp.qa_expect_affected_count('update', 'gabarito', (select value from qa_ids where key = 'gabarito_global'), 0, 'gabarito global -- tenant A tenta editar (nao e dono, so a base global e read-only)');
end $$;

-- =============================================================================
-- 4. Sessao do tenant B -- tenta ler/escrever tudo que pertence a A
-- =============================================================================

set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

do $$
begin
  if current_user <> 'authenticated' then
    raise exception 'sessao nao esta mais como authenticated -- current_user=%', current_user;
  end if;
  if auth.uid() is distinct from 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid then
    raise exception 'auth.uid() nao retornou o usuario B esperado -- retornou %', auth.uid();
  end if;
  raise notice 'OK sessao tenant B ativa (current_user=authenticated, auth.uid()=%)', auth.uid();
end $$;

-- As 9 tabelas de 11.2: SELECT/UPDATE/DELETE de B sobre as linhas de A devem
-- afetar/retornar 0 linhas (RLS filtra silenciosamente, sem erro).

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('cliente', (select value from qa_ids where key = 'cliente_a')),
      ('produto', (select value from qa_ids where key = 'produto_a')),
      ('orcamento', (select value from qa_ids where key = 'orcamento_a')),
      ('ambiente', (select value from qa_ids where key = 'ambiente_a')),
      ('parede', (select value from qa_ids where key = 'parede_a')),
      ('elemento_continuo', (select value from qa_ids where key = 'elemento_a')),
      ('linha_proposta', (select value from qa_ids where key = 'linha_a')),
      ('lista_material', (select value from qa_ids where key = 'lista_a')),
      ('gabarito', (select value from qa_ids where key = 'gabarito_a'))
    ) as x(tbl, id)
  loop
    perform pg_temp.qa_expect_select_count(t.tbl, t.id, 0, format('%s (tenant B le linha de A)', t.tbl));
    perform pg_temp.qa_expect_affected_count('update', t.tbl, t.id, 0, format('%s (tenant B tenta UPDATE em linha de A)', t.tbl));
    perform pg_temp.qa_expect_affected_count('delete', t.tbl, t.id, 0, format('%s (tenant B tenta DELETE em linha de A)', t.tbl));
  end loop;

  raise notice 'OK isolamento confirmado nas 9 tabelas de 11.2 (SELECT/UPDATE/DELETE de B sobre linhas de A = 0)';
end $$;

-- gabarito global: B tambem enxerga (esperado), mas nao pode editar.

do $$
begin
  perform pg_temp.qa_expect_select_count('gabarito', (select value from qa_ids where key = 'gabarito_global'), 1, 'gabarito global visto por tenant B (esperado: visivel para todas as orgs)');
  perform pg_temp.qa_expect_affected_count('update', 'gabarito', (select value from qa_ids where key = 'gabarito_global'), 0, 'gabarito global -- tenant B tenta editar (nao e dono, so a base global e read-only)');
end $$;

-- organizacao/perfil (Task 11.1): sem politica de INSERT/DELETE para o
-- cliente -- so testamos SELECT/UPDATE de B sobre a organizacao/perfil de A.

do $$
begin
  perform pg_temp.qa_expect_select_count('organizacao', (select value from qa_ids where key = 'org_a'), 0, 'organizacao (tenant B le organizacao de A)');
  perform pg_temp.qa_expect_affected_count('update', 'organizacao', (select value from qa_ids where key = 'org_a'), 0, 'organizacao (tenant B tenta UPDATE na organizacao de A)');
  perform pg_temp.qa_expect_select_count('perfil', (select value from qa_ids where key = 'user_a'), 0, 'perfil (tenant B le perfil de A)');
  perform pg_temp.qa_expect_affected_count('update', 'perfil', (select value from qa_ids where key = 'user_a'), 0, 'perfil (tenant B tenta UPDATE no perfil de A)');
end $$;

-- =============================================================================
-- 5. Fim -- tudo passou. Desfaz tudo, sem excecao.
-- =============================================================================

reset role;

do $$
begin
  raise notice 'TODOS OS TESTES DE ISOLAMENTO PASSARAM (11/11 tabelas multi-tenant: 9 de Task 11.2 + organizacao + perfil de Task 11.1). Fazendo rollback -- nenhum dado residual.';
end $$;

rollback;
