-- Task 13.6a (contrato .maestro/tmp/13.6a-contract.md, fatia "Backend
-- Engineer") — primeiro bucket de Supabase Storage do projeto.
--
-- `linha_proposta.imagem_url` é RenderRef ("caminho/URL no Storage, nunca
-- binário", decisão já registrada em
-- supabase/migrations/20260727090600_linha_proposta.sql) — este bucket é o
-- destino do render automático do conjunto de itens de cada Linha de
-- Proposta (Design-System.md Seção 7.19: thumbnail `aspect-[4/3]`).
--
-- Nome do bucket: `linha-proposta-renders` — descreve exatamente o conteúdo
-- (render de Linha de Proposta), sem ambiguidade com um bucket futuro de
-- outra natureza (ex.: logo de organização, anexo de cliente).
--
-- PRIVADO (`public = false`): as imagens não são de acesso público anônimo —
-- só a organização dona do orçamento pode ler/escrever. Leitura pela UI
-- (`components/orcamento/PropostaTabConectada.tsx`) é feita via
-- `createSignedUrl` (client Supabase autenticado), nunca `getPublicUrl` —
-- ver `lib/linha-proposta/storage.ts`.
--
-- Convenção de path do objeto: `{organizacao_id}/{linha_proposta_id}.png`
-- (primeiro segmento = organizacao_id, mesma convenção sugerida pelo
-- contrato) — permite escopar a RLS de `storage.objects` comparando o
-- primeiro segmento do path com `private.org_do_usuario()`, mesmo espírito
-- das políticas de tabela já usadas no projeto (ver
-- 20260727090000_cliente.sql), sem precisar de uma tabela de metadados
-- própria para o Storage.

insert into storage.buckets (id, name, public)
values ('linha-proposta-renders', 'linha-proposta-renders', false)
on conflict (id) do nothing;

-- RLS de storage.objects já vem habilitada por padrão no Supabase (tabela do
-- sistema, gerenciada pela extensão de Storage) — só criamos as políticas,
-- escopadas por bucket_id + primeiro segmento do path. `private.org_do_usuario()`
-- envolvida em `(select ...)` para resolver uma vez por query (mesmo padrão
-- de initplan já fixado em 20260724182140_otimizar_rls_initplan_perfil.sql e
-- reaproveitado em toda tabela de organização deste projeto).
--
-- CRUD completo para `authenticated`, escopado à própria organização — mesmo
-- espírito de `linha_proposta_*_propria_org`
-- (20260727090600_linha_proposta.sql): o dono do path (`{organizacao_id}/...`)
-- precisa bater com a organização do usuário autenticado, tanto para ler
-- quanto para escrever/substituir/remover.

create policy "linha_proposta_renders_select_propria_org"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'linha-proposta-renders'
    and (storage.foldername(name))[1] = (select private.org_do_usuario())::text
  );

create policy "linha_proposta_renders_insert_propria_org"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'linha-proposta-renders'
    and (storage.foldername(name))[1] = (select private.org_do_usuario())::text
  );

create policy "linha_proposta_renders_update_propria_org"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'linha-proposta-renders'
    and (storage.foldername(name))[1] = (select private.org_do_usuario())::text
  )
  with check (
    bucket_id = 'linha-proposta-renders'
    and (storage.foldername(name))[1] = (select private.org_do_usuario())::text
  );

create policy "linha_proposta_renders_delete_propria_org"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'linha-proposta-renders'
    and (storage.foldername(name))[1] = (select private.org_do_usuario())::text
  );
