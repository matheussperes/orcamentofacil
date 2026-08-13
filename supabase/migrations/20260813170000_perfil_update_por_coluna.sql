-- Task 4.15 — correção do achado CRÍTICO do security-auditor
-- (`.maestro/tmp/Security-Decline-Payload.md`, achado 1): `perfil.papel` era
-- gravável pelo próprio usuário, o que tornava contornável o gate de admin da
-- exclusão da organização.
--
-- O buraco: `authenticated` tem UPDATE em TODAS as colunas de `public.perfil`
-- (grant padrão do Supabase), e a policy `perfil_update_proprio`
-- (`20260724182140_otimizar_rls_initplan_perfil.sql`) autoriza o UPDATE da
-- própria LINHA sem dizer nada sobre COLUNAS. RLS filtra linha, não coluna.
-- Logo, do navegador, com a publishable key e o próprio JWT:
--
--   PATCH /rest/v1/perfil?id=eq.<seu-uid>   {"papel": "admin"}
--
-- e um `vendedor` vira `admin` — depois chama `excluirOrganizacao`
-- (`lib/organizacao/excluir.ts`) e apaga o tenant inteiro, o Storage e TODOS os
-- logins da organização. Irreversível (Q-13: sem soft-delete, sem retenção).
-- A mesma brecha permitia reapontar `organizacao_id` para outra organização —
-- e como toda RLS deste projeto deriva de `private.org_do_usuario()`, que lê
-- exatamente essa coluna, isso era leitura cross-tenant do schema inteiro.
--
-- A premissa da Seção 7.3 ("a única porta é a Server Action, e ter uma porta só
-- torna a checagem de aplicação suficiente") continua verdadeira quanto à
-- porta. O que faltava é o outro lado dela: a ENTRADA da checagem não pode ser
-- gravável pelo sujeito da própria checagem. Esta migration fecha isso no
-- banco, onde não há como esquecer.
--
-- Correção: grant por COLUNA. A RLS continua valendo por cima (as duas camadas
-- se somam: o grant limita QUAIS colunas, a policy limita QUAL linha).
--
-- Retrocompatível — verificado, não presumido: o único write em `perfil` fora
-- de `SECURITY DEFINER` em todo o código é `lib/perfil/salvar.ts`, que grava
-- exatamente `nome`, `telefone` e `foto_url`. Todos os outros 17 usos de
-- `.from("perfil")` são `select`. A trigger `handle_new_user`
-- (`20260724181915_fundacao_multitenant.sql:133`) é `SECURITY DEFINER` e roda
-- como dona da tabela: grants de `authenticated` não a alcançam, o signup
-- continua criando o perfil com `papel = 'admin'` e o `organizacao_id` novo.
--
-- `id`, `papel`, `organizacao_id`, `criado_em` e `atualizado_em` passam a ser
-- inescreviveis pelo cliente. Mudar papel de alguém (quando existir convite e
-- gestão de membros) terá que passar por uma Server Action / RPC própria, com
-- sua própria autorização — que é exatamente o desenho correto.

revoke update on public.perfil from authenticated;

grant update (nome, telefone, foto_url) on public.perfil to authenticated;

comment on column public.perfil.papel is
  'admin/vendedor/projetista. NÃO é gravável por `authenticated` (grant por coluna em 20260813170000_perfil_update_por_coluna.sql): é entrada de decisão de autorização — o gate de `excluirOrganizacao` e o de `reabrirOrcamento` leem esta coluna. Só muda por SECURITY DEFINER (handle_new_user) ou service_role.';

comment on column public.perfil.organizacao_id is
  'Tenant do usuário. NÃO é gravável por `authenticated` (grant por coluna em 20260813170000_perfil_update_por_coluna.sql): `private.org_do_usuario()` lê esta coluna e toda a RLS do schema deriva dela — deixá-la gravável seria deixar o usuário escolher o próprio tenant.';
