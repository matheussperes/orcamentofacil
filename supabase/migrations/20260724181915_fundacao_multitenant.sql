-- Task 11.1 — Fundação multi-tenant (D-13: tenant = Organização)
--
-- Cria as duas tabelas raiz do modelo multi-tenant (docs/Modelo-de-Dominio.md
-- Seção 7): `organizacao` (tenant raiz) e `perfil` (liga auth.users à
-- organização). RLS habilitada e políticas escritas nesta mesma migration,
-- sem exceção (regra do Backend Engineer / briefing 4.1).
--
-- Padrão anti-recursão de RLS: `public.org_do_usuario()` é SECURITY DEFINER +
-- STABLE, lê `perfil` como o dono da tabela (bypassa RLS internamente) e
-- devolve o organizacao_id do usuário autenticado. As políticas de outras
-- tabelas (Task 11.2+) devem usar essa função em vez de repetir o join.
--
-- `search_path` fixado em todas as funções SECURITY DEFINER (achado comum de
-- advisor de segurança: função sem search_path fixo é sequestrável via
-- search_path malicioso na sessão do chamador).

-- =============================================================================
-- 1. organizacao — tenant raiz
-- =============================================================================

create table public.organizacao (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  endereco text,
  telefone text,
  logo_url text,
  unidade text not null default 'mm' check (unidade in ('mm', 'cm')),
  -- Tagged union (docs/Modelo-de-Dominio.md 5.1): {modo, ...campos do modo}.
  -- Ex.: {"modo":"multiplicador","fator":2} | {"modo":"percentual","percentual":150}
  --      {"modo":"por_chapa","valorChapa":50} | {"modo":"fixo","valor":1000}
  modo_precificacao_padrao jsonb not null default '{"modo":"multiplicador","fator":2}'::jsonb,
  -- Modo exclusivo por orçamento (docs/Modelo-de-Dominio.md 5.3): percentual_material | por_chapa | manual.
  modo_montagem_padrao jsonb not null default '{"modo":"percentual_material","percentual":10}'::jsonb,
  -- Alturas padrão das faixas de posicionamento 1D, por categoria de faixa.
  alturas_padrao jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

comment on table public.organizacao is 'Tenant raiz (D-13). Dados do emitente que saem na proposta + defaults de perfil.';

alter table public.organizacao enable row level security;

-- =============================================================================
-- 2. perfil — liga auth.users à organização
-- =============================================================================

create table public.perfil (
  id uuid primary key references auth.users (id) on delete cascade,
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  nome text,
  telefone text,
  papel text not null default 'admin' check (papel in ('admin', 'vendedor', 'projetista')),
  criado_em timestamptz not null default now()
);

comment on table public.perfil is 'Liga auth.users à organização (D-13). Criado automaticamente no signup pela trigger handle_new_user.';

create index perfil_organizacao_id_idx on public.perfil (organizacao_id);

alter table public.perfil enable row level security;

-- =============================================================================
-- 3. Função SECURITY DEFINER anti-recursão
-- =============================================================================

create function public.org_do_usuario()
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select organizacao_id
  from public.perfil
  where id = auth.uid()
$$;

comment on function public.org_do_usuario() is
  'Retorna o organizacao_id do usuário autenticado. SECURITY DEFINER lê perfil '
  'como dono da tabela (bypassa RLS), evitando recursão nas políticas de '
  'outras tabelas que dependem de organizacao_id.';

-- =============================================================================
-- 4. Políticas RLS — organizacao
-- =============================================================================

create policy "organizacao_select_propria"
  on public.organizacao
  for select
  to authenticated
  using (id = public.org_do_usuario());

create policy "organizacao_update_propria"
  on public.organizacao
  for update
  to authenticated
  using (id = public.org_do_usuario())
  with check (id = public.org_do_usuario());

-- Sem política de INSERT/DELETE para o cliente: a organização só é criada
-- pela trigger handle_new_user (SECURITY DEFINER, bypassa RLS) e não é
-- removida via app.

-- =============================================================================
-- 5. Políticas RLS — perfil
-- =============================================================================

create policy "perfil_select_proprio_ou_mesma_org"
  on public.perfil
  for select
  to authenticated
  using (
    id = auth.uid()
    or organizacao_id = public.org_do_usuario()
  );

create policy "perfil_update_proprio"
  on public.perfil
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Sem política de INSERT/DELETE para o cliente: perfil só é criado pela
-- trigger handle_new_user (SECURITY DEFINER, bypassa RLS); remoção acompanha
-- o ON DELETE CASCADE de auth.users, que é ação de sistema, não DML de app.

-- =============================================================================
-- 6. Trigger de signup — cria organização + perfil (torna D-13 real)
-- =============================================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organizacao_id uuid;
  v_nome_organizacao text;
begin
  v_nome_organizacao := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'organizacao_nome'), ''),
    new.email
  );

  insert into public.organizacao (nome)
  values (v_nome_organizacao)
  returning id into v_organizacao_id;

  insert into public.perfil (id, organizacao_id, nome, papel)
  values (
    new.id,
    v_organizacao_id,
    nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
    'admin'
  );

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT em auth.users: cria a organizacao (tenant raiz, D-13) e o '
  'perfil correspondente. Nome da org vem de raw_user_meta_data.organizacao_nome, '
  'com fallback para o e-mail. Primeiro usuário da org nasce como admin.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
