-- Task 11.1 — Supabase concede EXECUTE em novas funções de `public` a
-- anon/authenticated/service_role via default privileges do projeto (grant
-- explícito por role, não só a PUBLIC). A migration anterior só revogou de
-- PUBLIC, o que não remove esses grants explícitos — get_advisors confirmou
-- que anon/authenticated ainda podiam chamar handle_new_user() via RPC.
-- handle_new_user só deve rodar pela trigger on_auth_user_created; nenhum
-- papel de cliente precisa (ou deve) chamá-la diretamente.

revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
