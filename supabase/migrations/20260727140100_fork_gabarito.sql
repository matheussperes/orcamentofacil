-- Task 11.4 (2/2) — Fork de gabarito (D-15: base global read-only + fork na edição)
--
-- docs/Modelo-de-Dominio.md D-15: gabaritos globais (organizacao_id null) são
-- read-only para todas as orgs; para editar, a org bifurca (fork) uma cópia
-- própria. O schema (organizacao_id nullable + origem_gabarito_id, Task
-- 11.2) já suporta isso — esta função é o mecanismo de fork. Sem seed de
-- gabaritos globais nesta task (não existe hoje biblioteca "oficial" de
-- módulos-base no código — lib/boxPresets.ts é só presets de usuário em
-- localStorage — população da base global fica para quando o operador
-- definir os módulos padrão, fora de escopo aqui).
--
-- SECURITY INVOKER (padrão, não DEFINER — menos privilégio, não precisa de
-- mais): a leitura do gabarito de origem passa pela RLS normal do chamador
-- (policy gabarito_select_global_ou_propria_org) — só enxerga o que já podia
-- enxergar (global ou da própria org). Se p_gabarito_id não existir ou não
-- for visível, a leitura retorna zero linhas — tratado com `if not found`
-- explícito, sem retornar null silenciosamente.
--
-- `search_path = ''` mesmo em SECURITY INVOKER: get_advisors (security)
-- aponta função com search_path mutável como achado, independente de
-- DEFINER/INVOKER — todas as referências já são schema-qualificadas
-- (public.gabarito, private.org_do_usuario()), então fixar não muda
-- comportamento, só fecha o achado.

create function public.fork_gabarito(p_gabarito_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_nome text;
  v_categoria text;
  v_definicao jsonb;
  v_novo_id uuid;
begin
  select nome, categoria, definicao
    into v_nome, v_categoria, v_definicao
    from public.gabarito
    where id = p_gabarito_id;

  if not found then
    raise exception 'fork_gabarito: gabarito % não existe ou não é visível para o usuário atual', p_gabarito_id;
  end if;

  insert into public.gabarito (organizacao_id, origem_gabarito_id, nome, categoria, definicao)
  values (private.org_do_usuario(), p_gabarito_id, v_nome, v_categoria, v_definicao)
  returning id into v_novo_id;

  return v_novo_id;
end;
$$;

comment on function public.fork_gabarito(uuid) is
  'Bifurca (fork) um gabarito visível ao chamador (global ou da própria org) '
  'em uma nova linha pertencente à própria organização, preservando a '
  'linhagem via origem_gabarito_id (D-15). SECURITY INVOKER: leitura sujeita '
  'à RLS normal de gabarito; escrita sujeita à policy gabarito_insert_propria_org.';

-- Só authenticated deve poder chamar (precisa de private.org_do_usuario(),
-- que só resolve para usuário com perfil); anon não tem uso legítimo aqui e
-- a policy de INSERT bloquearia de qualquer forma (organizacao_id = null
-- nunca satisfaz `organizacao_id = org_do_usuario()`), mas revogamos
-- explicitamente por princípio de menor privilégio.
revoke execute on function public.fork_gabarito(uuid) from public;
revoke execute on function public.fork_gabarito(uuid) from anon;
grant execute on function public.fork_gabarito(uuid) to authenticated;
