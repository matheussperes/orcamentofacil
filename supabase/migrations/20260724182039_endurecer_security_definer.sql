-- Task 11.1 — Endurece exposição das funções SECURITY DEFINER
--
-- get_advisors (security) apontou, após a migration anterior, que
-- `public.org_do_usuario()` e `public.handle_new_user()` eram chamáveis
-- diretamente via PostgREST RPC (`/rest/v1/rpc/...`) pelos papéis `anon` e
-- `authenticated` — comportamento padrão do Postgres, que concede EXECUTE a
-- PUBLIC na criação da função, salvo revogação explícita.
--
-- Correção:
-- 1. `handle_new_user` só deve rodar via trigger em auth.users — trigger não
--    exige que o papel que dispara o INSERT tenha EXECUTE na função. Basta
--    revogar EXECUTE de PUBLIC para fechar a rota de RPC direta.
-- 2. `org_do_usuario` PRECISA continuar executável por `authenticated`
--    (é usada dentro de USING/CHECK das políticas RLS, avaliadas com o papel
--    da sessão). Não dá para revogar de authenticated sem quebrar RLS. A
--    correção correta é mover a função para um schema não exposto pelo
--    PostgREST (`private`) — o OID da função não muda, então as políticas
--    já criadas continuam resolvendo para a mesma função automaticamente,
--    mas `/rest/v1/rpc/org_do_usuario` deixa de existir (PostgREST só expõe
--    funções dos schemas configurados, `public` por padrão — `private` não
--    está nessa lista).

create schema if not exists private;

alter function public.org_do_usuario() set schema private;

comment on function private.org_do_usuario() is
  'Retorna o organizacao_id do usuário autenticado. Movida para o schema '
  '`private` (não exposto pelo PostgREST) para que só seja alcançável via '
  'políticas RLS, nunca como RPC pública. Ver policies de organizacao/perfil.';

revoke execute on function private.org_do_usuario() from public;
revoke execute on function private.org_do_usuario() from anon;
grant usage on schema private to authenticated;
grant execute on function private.org_do_usuario() to authenticated;

revoke execute on function public.handle_new_user() from public;
