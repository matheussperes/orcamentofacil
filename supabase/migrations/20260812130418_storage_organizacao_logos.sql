-- Task 4.8-4.9-back (contrato .maestro/state/contracts/4.8-4.9-back.md) —
-- bucket de Storage para a logo da organização, substituindo o campo de URL
-- de texto livre (`organizacao.logo_url`) por upload real (PRD RF-31/RF-02:
-- "o campo de URL sai"). Réplica exata do padrão de
-- `20260730190000_storage_linha_proposta_renders.sql`, adaptando bucket/path.
--
-- Nome do bucket: `organizacao-logos` — descreve exatamente o conteúdo (logo
-- da organização), kebab-case, sem ambiguidade com `linha-proposta-renders`.
--
-- PRIVADO (`public = false`): mesmo raciocínio do precedente — dado
-- por-tenant, não é conteúdo curado compartilhado como `texturas`. Leitura
-- via `createSignedUrl`, nunca `getPublicUrl` — ver `lib/organizacao/logo-storage.ts`.
--
-- Convenção de path do objeto: `{organizacao_id}/logo.<ext>` — primeiro
-- segmento = organizacao_id, permite escopar a RLS de `storage.objects`
-- comparando o primeiro segmento do path com `private.org_do_usuario()`.
--
-- `allowed_mime_types`: PNG/JPEG/WEBP — SEM SVG (risco de XSS embutido em SVG
-- servido como imagem; prevenção padrão de bucket de upload de usuário,
-- decisão aplicada aqui mesmo sem achado prévio de security-auditor).
-- `file_size_limit`: 2 MB (2097152 bytes) — mais restritivo que os 5 MB do
-- precedente, porque logo é imagem pequena (ícone/marca), não um render de
-- cena 3D.
--
-- `organizacao.logo_url` não muda de nome nem de tipo (continua `text`) —
-- só de semântica: passa a guardar o PATH do objeto no bucket, nunca uma
-- signed URL (mesma decisão já tomada para `linha_proposta.imagem_url`).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('organizacao-logos', 'organizacao-logos', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS de storage.objects já vem habilitada por padrão (tabela do sistema,
-- gerenciada pela extensão de Storage) — só criamos as políticas, escopadas
-- por bucket_id + primeiro segmento do path. `private.org_do_usuario()`
-- envolvida em `(select ...)` para resolver uma vez por query (padrão de
-- initplan já fixado em 20260724182140_otimizar_rls_initplan_perfil.sql).
--
-- CRUD completo para `authenticated`, escopado à própria organização — o
-- dono do path (`{organizacao_id}/logo.<ext>`) precisa bater com a
-- organização do usuário autenticado, tanto para ler quanto para
-- escrever/substituir/remover.

create policy "organizacao_logos_select_propria_org"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'organizacao-logos'
    and (storage.foldername(name))[1] = (select private.org_do_usuario())::text
  );

create policy "organizacao_logos_insert_propria_org"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'organizacao-logos'
    and (storage.foldername(name))[1] = (select private.org_do_usuario())::text
  );

create policy "organizacao_logos_update_propria_org"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'organizacao-logos'
    and (storage.foldername(name))[1] = (select private.org_do_usuario())::text
  )
  with check (
    bucket_id = 'organizacao-logos'
    and (storage.foldername(name))[1] = (select private.org_do_usuario())::text
  );

create policy "organizacao_logos_delete_propria_org"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'organizacao-logos'
    and (storage.foldername(name))[1] = (select private.org_do_usuario())::text
  );
