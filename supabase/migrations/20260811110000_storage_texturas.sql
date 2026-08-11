-- Task 3.13 (catálogo-back, contrato
-- .maestro/state/contracts/3.13-catalogo-back.md) — segundo bucket de
-- Supabase Storage do projeto. Referência de convenção:
-- 20260730190000_storage_linha_proposta_renders.sql — mas natureza diferente,
-- por isso a policy de escopo por organização NÃO é copiada aqui.
--
-- Nome do bucket: `texturas` — imagens de textura de chapa usadas como
-- `EspecificacaoChapa.texturaUrl` (lib/produto/tipos.ts).
--
-- Modelo-de-Dominio.md Seção 4.1.1, regra 3: "uma cópia só, compartilhada por
-- todas as orgs" — diferente de `linha-proposta-renders` (dado por-tenant),
-- textura de chapa é conteúdo curado pelo operador, igual para toda
-- organização. Não há coluna `organizacao_id` para escopar, então a policy de
-- leitura é ampla para qualquer `authenticated`, sem filtro de path.
--
-- PÚBLICO (`public = true`): o conteúdo (imagem de textura de madeira) não é
-- dado de cliente nem de tenant — não há nada sensível a proteger. Marcar o
-- bucket como público permite `getPublicUrl` direto na Task 3.13
-- (catálogo-front, consumo em `ModuleViewer`), sem o custo de gerar/renovar
-- `createSignedUrl` para um recurso que já é intencionalmente compartilhado.
-- A policy de SELECT abaixo é redundante para leitura pública (bucket público
-- já serve `getPublicUrl` sem passar por RLS), mas mantemos explícita para
-- cobrir leitura autenticada via client Supabase (`storage.from(...).list()`,
-- etc.) com o mesmo critério.
--
-- Escrita: NENHUMA policy de INSERT/UPDATE/DELETE para `authenticated` —
-- só `service_role` (que ignora RLS por padrão no Supabase) pode escrever.
-- O marceneiro nunca faz upload de textura; a Task 3.13 (catálogo-front) só
-- seleciona entre imagens já existentes no bucket. Curadoria/upload das
-- imagens reais é responsabilidade do operador, fora de qualquer task de
-- código (Modelo-de-Dominio.md Seção 4.1.1, nota final).
--
-- `allowed_mime_types`: WebP é o formato-alvo da spec, mas aceitamos também
-- PNG/JPEG caso o operador ainda não tenha convertido as imagens — curadoria
-- de conteúdo fora do controle desta task, não é bloqueante.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'texturas',
  'texturas',
  true,
  5242880,
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS de storage.objects já vem habilitada por padrão (tabela do sistema,
-- gerenciada pela extensão de Storage) — só a policy de leitura, sem escopo
-- de organização (regra 3, ver comentário acima).
create policy "texturas_select_authenticated"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'texturas');
