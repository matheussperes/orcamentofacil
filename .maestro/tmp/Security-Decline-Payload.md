# Security Decline Payload

**Task**: 4.15
**Branch**: feature/4.15 (commit d05b67a)
**Data**: 2026-08-13
**Veredicto**: REPROVADO

## 1. `perfil.papel` é auto-editável pelo próprio usuário — o gate de admin da exclusão é contornável com uma chamada PostgREST

- **Severidade**: Crítico
- **Categoria**: OWASP:A01 Broken Access Control (elevação de privilégio)
- **Arquivo e linha**: `lib/organizacao/excluir.ts:110` (o gate) — a causa está em `supabase/migrations/20260724182140_otimizar_rls_initplan_perfil.sql:17-24` (policy `perfil_update_proprio`, sem restrição de coluna) somada à ausência de qualquer `revoke update on public.perfil`
- **Trecho**:
  ```ts
  // lib/organizacao/excluir.ts:104-115
  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfil")
    .select("organizacao_id, papel")
    .eq("id", user.id)
    .maybeSingle();

  if (erroPerfil || !perfil?.organizacao_id || perfil.papel !== "admin") {
    ...
    return E_D1;
  }
  ```
  ```sql
  -- 20260724182140_otimizar_rls_initplan_perfil.sql:19-24
  create policy "perfil_update_proprio"
    on public.perfil
    for update
    to authenticated
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));
  ```
- **Risco concreto**: `authenticated` tem UPDATE em **todas** as colunas de `public.perfil` (grants padrão do Supabase; a varredura de `grant`/`revoke` em `supabase/migrations/*.sql` mostra revokes só em funções, nenhum em tabela). A policy autoriza o UPDATE da própria linha sem restringir quais colunas mudam, e `papel` é uma coluna comum dessa linha, com `check (papel in ('admin','vendedor','projetista'))` (`20260724181915_fundacao_multitenant.sql:53`). Então um `vendedor` ou `projetista` faz, do navegador, com a publishable key e o próprio JWT:

  `PATCH /rest/v1/perfil?id=eq.<seu-uid>` com `{"papel":"admin"}`

  e em seguida chama a Server Action. O gate da linha 110 lê `admin` e libera: apaga a organização inteira, todos os clientes, orçamentos, produtos e gabaritos, expurga o Storage e remove de `auth.users` **todos os logins da organização, inclusive os dos outros usuários**. Destruição irreversível, sem soft-delete e sem retenção (Q-13). O critério de aceitação "papel vendedor/projetista recebe `NAO_AUTORIZADO_EXCLUIR_ORG` e nenhuma linha é apagada" só vale contra um usuário que não tenta contornar.

  O mesmo buraco expõe `organizacao_id`: a policy também não impede o usuário de reapontar o próprio perfil para outra organização. Com um `organizacao_id` alheio conhecido, isso vira leitura cross-tenant de todo o schema (toda RLS deste projeto deriva de `private.org_do_usuario()`, que lê exatamente essa coluna) e, combinado com `papel = 'admin'`, exclusão da organização de outro cliente.

  A premissa escrita na Seção 7.3 ("não existe política de `delete` em `organizacao`... ter uma porta só é o que torna a checagem de aplicação suficiente") está correta quanto à porta, mas depende de a **entrada** da checagem não ser gravável pelo próprio sujeito da checagem — e hoje ela é.
- **Correção esperada**: migration que tire `papel`, `organizacao_id` e `id` do alcance de escrita do cliente. O caminho mínimo é grant por coluna (a RLS continua valendo por cima):
  ```sql
  revoke update on public.perfil from authenticated;
  grant update (nome, telefone, foto_url) on public.perfil to authenticated;
  ```
  Isso não quebra nada: o único write em `perfil` fora de `SECURITY DEFINER` é `lib/perfil/salvar.ts:44-51`, que grava exatamente `nome`, `telefone` e `foto_url`. Os outros 17 usos de `.from("perfil")` no código são `select`. `handle_new_user` insere como dono da tabela e não é afetada. Alternativa equivalente: trigger `before update` que rejeite mudança de `papel`/`organizacao_id`.

  Precedência, para o executor não se surpreender: a policy é anterior a esta task e já governava `lib/orcamento/reabrir.ts:55` (papel admin, Task 1.9). O que a 4.15 muda é a consequência — de "reabrir um orçamento congelado" (reversível) para "apagar o tenant inteiro e todas as contas de login" (irreversível). Por isso o achado bloqueia esta task em vez de virar observação de dívida: é a task que transforma a coluna em fronteira de privilégio destrutiva.
- **Responsável**: backend-engineer

## Observações fora do escopo da task

1. **Bucket `linha-proposta-renders` não é expurgado.** O projeto tem quatro buckets; a rotina limpa dois. `linha-proposta-renders` (`20260730190000`) usa o path `{organizacao_id}/...` e guarda render das propostas da organização — sem FK, sobrevive à exclusão como objeto órfão. Não é explorável (bucket privado, policies exigem `private.org_do_usuario()` batendo com o primeiro segmento do path, e depois da exclusão nenhum perfil aponta para aquele UUID, que nunca será reemitido), mas contraria "destruição imediata e irreversível" da Q-13 e a armadilha 3 da 7.3 ("senão sobra arquivo órfão — e, com ele, dado que deveria ter sido eliminado"). O contrato e a 7.3 nomeiam só logos e fotos, então a omissão é fiel à spec: a spec é que está desatualizada em relação ao bucket criado na Task 13.6a. Vale emenda à 7.3 e uma linha a mais no expurgo. (`texturas` é global e não precisa de expurgo.)
2. **`storage.list(prefixo)` usa o limite default de 100 objetos e não recursa.** Hoje cada prefixo guarda um arquivo só (`{org}/logo.<ext>`, `{perfil}/foto.<ext>`), então nada trunca. Se algum bucket passar a acumular versões por prefixo, o expurgo passa a deixar resto em silêncio — `expurgarPrefixo` (`lib/organizacao/excluir.ts:67-88`) não pagina.
