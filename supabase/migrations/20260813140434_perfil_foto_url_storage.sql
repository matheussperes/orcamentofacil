-- Task 4.11-back (contrato .maestro/state/contracts/4.11-back.md) — bucket
-- de Storage para a foto de perfil PESSOAL do usuário (RF-31), fundação que
-- ainda não existia (`perfil` não tinha nenhuma coluna de foto). Réplica do
-- padrão de `20260812130418_storage_organizacao_logos.sql`, com uma
-- diferença de escopo: a foto é posse individual do usuário, não da
-- organização — a RLS de `storage.objects` escopa por `auth.uid()`, não por
-- `private.org_do_usuario()`. Colegas da mesma organização não devem
-- conseguir ler/escrever a foto uns dos outros.

alter table perfil add column if not exists foto_url text;

comment on column perfil.foto_url is
  'Path do objeto no bucket privado perfil-fotos ({perfil_id}/foto.<ext>), nunca uma signed URL — mesma semântica de organizacao.logo_url.';

-- Nome do bucket: `perfil-fotos` — kebab-case, descritivo, mesma convenção
-- de `organizacao-logos`/`linha-proposta-renders`/`texturas`.
--
-- PRIVADO (`public = false`): dado pessoal do usuário. Leitura via
-- `createSignedUrl`, nunca `getPublicUrl` — ver `lib/perfil/foto-storage.ts`.
--
-- Convenção de path do objeto: `{perfil_id}/foto.<ext>` — primeiro segmento
-- = perfil_id, que é o próprio `auth.uid()` do dono da foto.
--
-- `allowed_mime_types`: PNG/JPEG/WEBP — SEM SVG (mesma prevenção de XSS já
-- aplicada em todos os buckets de upload deste projeto).
-- `file_size_limit`: 2 MB (2097152 bytes) — mesmo limite de `organizacao-logos`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('perfil-fotos', 'perfil-fotos', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS de storage.objects já vem habilitada por padrão (tabela do sistema,
-- gerenciada pela extensão de Storage) — só criamos as políticas, escopadas
-- por bucket_id + primeiro segmento do path comparado a `(select
-- auth.uid())::text` (initplan, mesmo padrão de
-- 20260724182140_otimizar_rls_initplan_perfil.sql). `auth.uid()` é função
-- nativa do Supabase, não custom deste schema — não precisa de
-- `private.org_do_usuario()`.
--
-- CRUD completo para `authenticated`, escopado ao próprio usuário — o dono
-- do path (`{perfil_id}/foto.<ext>`) precisa bater com o `auth.uid()` do
-- usuário autenticado, tanto para ler quanto para escrever/substituir/remover.

create policy "perfil_fotos_select_propria"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'perfil-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "perfil_fotos_insert_propria"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'perfil-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "perfil_fotos_update_propria"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'perfil-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'perfil-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "perfil_fotos_delete_propria"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'perfil-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
