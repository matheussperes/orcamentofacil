-- =============================================================================
-- Schema de referência — Task 11.2 (Modelo de dados multi-tenant completo)
-- Produzido pelo Maestro a partir de docs/Modelo-de-Dominio.md Seção 7
-- (campos por entidade cruzados com Seções 2, 3, 6 para os tipos aninhados) +
-- padrão já estabelecido em supabase/migrations/20260724181915_fundacao_multitenant.sql
-- (Task 11.1: organizacao, perfil, public.org_do_usuario()).
--
-- NÃO É MIGRATION EXECUTÁVEL. É rascunho de referência (contrato de troca de
-- estado Maestro → Backend Engineer). O Backend Engineer traduz isto para as
-- migrations reais em supabase/migrations/, com ENABLE ROW LEVEL SECURITY e
-- políticas formais em CADA migration — não misturar tabelas não relacionadas
-- na mesma migration (regra do seu próprio prompt, Seção "Regras de Migration").
--
-- Convenção de RLS adotada (repetir em toda tabela, salvo nota em contrário):
--   - organizacao_id é DENORMALIZADO em toda tabela (mesmo as que só têm um
--     ancestral indireto via orcamento_id/ambiente_id). Motivo: RLS direta
--     por coluna é mais rápida e MUITO mais fácil de testar isoladamente
--     (Task 11.3 exige um teste de isolamento POR TABELA) do que RLS via
--     EXISTS(subquery em tabela pai). Já tivemos que otimizar RLS por
--     initplan na Task 11.1 (migration 20260724182140) — não repetir o custo.
--   - Toda política usa public.org_do_usuario() (SECURITY DEFINER já existe,
--     não recriar). SELECT/UPDATE/DELETE: using (organizacao_id = org_do_usuario()).
--     INSERT: with check (organizacao_id = org_do_usuario()).
--   - Nomenclatura de política: "<tabela>_<operacao>_<escopo>" (ex.:
--     "cliente_select_propria_org"), igual ao padrão de organizacao/perfil.
--   - Índice em toda coluna organizacao_id (mesmo padrão de perfil_organizacao_id_idx).
--
-- Duas exceções à regra "organizacao_id not null" — ver nota em cada tabela:
--   gabarito (pode ser global, organizacao_id null = base read-only para todos).
--
-- =============================================================================
-- 1. cliente — Org (Modelo-de-Dominio.md Seção 7, linha "Cliente")
-- =============================================================================

create table public.cliente (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  nome text not null,
  telefone text,
  endereco text,
  criado_em timestamptz not null default now()
);

-- RLS: CRUD completo, escopo = própria org (é o dono do dado, sem regra de
-- "admin only" mencionada no briefing — perfil.papel não restringe isto).

-- =============================================================================
-- 2. produto — Org (Seção 7 "Produto": chapas, ferragens, LEDs, acessórios)
--
-- ASSUNÇÃO DO MAESTRO (a doc de domínio não detalha os campos, só descreve o
-- propósito): campos espelham lib/catalog.ts (AcabamentoMdf, FerragemCatalogo
-- — hoje em localStorage, é o que este catálogo substitui). Como os atributos
-- variam por tipo (chapa tem cor+espessura; ferragem tem código+unidade), uso
-- jsonb para o específico — mesmo padrão já usado em
-- organizacao.modo_precificacao_padrao. Backend Engineer: se discordar da
-- forma, é decisão sua documentar o porquê, mas não pare a task por isso —
-- é catálogo vazio agora (popular via cópia-no-signup é Task 11.4, fora
-- de escopo aqui).
-- =============================================================================

create table public.produto (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  tipo text not null check (tipo in ('chapa', 'ferragem', 'fita', 'led', 'acessorio')),
  nome text not null,
  especificacao jsonb not null default '{}'::jsonb,  -- cor/espessura (chapa), codigo/unidade (ferragem) etc.
  preco numeric(12, 2) not null default 0,
  fornecedor text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- RLS: CRUD completo, escopo = própria org. D-15 "cópia no signup" é lógica
-- de população (trigger/seed), não muda o RLS — fica para 11.4.

-- =============================================================================
-- 3. gabarito — Global + Org (Seção 7 "Módulo/Gabarito", D-15: base global
-- read-only + fork na edição)
--
-- ASSUNÇÃO DO MAESTRO: `definicao` guarda a árvore BoxModule inteira (ver
-- lib/boxPresets.ts::BoxPreset, hoje localStorage — { id, nome, categoria,
-- box }). O mecanismo de FORK (duplicar um gabarito global para a org editar)
-- é lógica de app da Task 11.4 — aqui só a estrutura que sustenta fork
-- (organizacao_id nullable + origem_gabarito_id de linhagem).
-- =============================================================================

create table public.gabarito (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid references public.organizacao (id) on delete cascade,  -- NULL = base global
  origem_gabarito_id uuid references public.gabarito (id) on delete set null, -- linhagem do fork
  nome text not null,
  categoria text not null,
  definicao jsonb not null,  -- BoxModule (lib/engine/box/types.ts)
  criado_em timestamptz not null default now()
);

-- RLS — ÚNICA tabela com padrão diferente das demais:
--   SELECT: organizacao_id is null OR organizacao_id = org_do_usuario()
--           (todos leem os gabaritos globais + os da própria org)
--   INSERT: with check (organizacao_id = org_do_usuario())
--           (cliente NUNCA cria linha global; só via seed/admin fora do RLS)
--   UPDATE/DELETE: using (organizacao_id = org_do_usuario())
--           (cliente nunca edita/apaga a linha global — só a própria, seja
--           original ou fork)

-- =============================================================================
-- 4. orcamento — Org (Seção 7 "Orçamento": ref. Cliente, status, itens, prazo)
--
-- ASSUNÇÃO DO MAESTRO: `itens` guarda o array de ItemOrcamento (union
-- custom_box | placa, Seção 1) como jsonb — ainda não há tabela normalizada
-- para isso no modelo (só Seção 12/Stage 12 estende o motor; a normalização
-- de itens não está no escopo dos 8 nomes que o operador listou para 11.2).
-- Se preferir normalizar em tabela própria, PARE e pergunte antes — é decisão
-- de escopo, não de sintaxe.
-- `status`: domínio não fecha os valores. Sugestão mínima não-bloqueante:
-- check (status in ('rascunho','enviado','aprovado','recusado')) — ajustável
-- sem migração destrutiva depois (é só um check constraint).
-- =============================================================================

create table public.orcamento (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,
  cliente_id uuid not null references public.cliente (id) on delete restrict,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  prazo_entrega text,  -- estimativa livre (ex.: "15 dias úteis"), não data fixa
  modo_precificacao jsonb,  -- override de organizacao.modo_precificacao_padrao; null = usa o da org
  modo_montagem jsonb,      -- override de organizacao.modo_montagem_padrao; null = usa o da org
  frete numeric(12, 2),     -- D-23, editável
  itens jsonb not null default '[]'::jsonb,  -- ItemOrcamento[] (Seção 1)
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Nota de integridade: cliente_id deve pertencer à MESMA organizacao_id do
-- orçamento. FK simples não garante isso sozinha (cross-tenant cliente_id
-- tecnicamente passaria a FK). Como RLS de `cliente` já impede o app de
-- SELECIONAR um cliente de outra org para popular o formulário, o risco
-- prático é baixo — mas se quiser fechar 100%, um trigger BEFORE INSERT/UPDATE
-- validando `cliente.organizacao_id = new.organizacao_id` é o caminho.
-- Decisão sua; não é bloqueante para aprovar a task.

-- RLS: CRUD completo, escopo = própria org.

-- =============================================================================
-- 5. ambiente — filho de orcamento (Seção 7 "Ambiente/Parede", Seção 3.2)
-- =============================================================================

create table public.ambiente (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,  -- denormalizado, ver nota de RLS no topo
  orcamento_id uuid not null references public.orcamento (id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);

-- RLS: CRUD completo, escopo = própria org (organizacao_id direto na linha,
-- não via join em orcamento).

-- =============================================================================
-- 6. parede — filho de ambiente (Seção 3.2). Primeiro corte: 1 parede/ambiente,
-- mas a tabela já modela N (o limite de 1 é regra de UI/app, não de schema).
-- =============================================================================

create table public.parede (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,  -- denormalizado
  ambiente_id uuid not null references public.ambiente (id) on delete cascade,
  altura numeric not null,
  largura numeric not null,
  elementos jsonb not null default '[]'::jsonb,  -- ElementoParede[] (janela/porta/tomada/ponto_hidraulico)
  itens jsonb not null default '[]'::jsonb,       -- ItemPosicionado[] ({itemId, x, faixa})
  criado_em timestamptz not null default now()
);

-- RLS: CRUD completo, escopo = própria org.

-- =============================================================================
-- 7. elemento_continuo — Org (Seção 3.4/3.5: tampo/rodape/tamponamento/fechamento)
--
-- ASSUNÇÃO DO MAESTRO — LEIA COM ATENÇÃO: o tipo de referência
-- (Modelo-de-Dominio.md Seção 3.4) tem `alvo: {conjuntoId} | {moduloId}`, mas
-- **Conjunto NÃO está na lista de 8 tabelas que o operador pediu para a Task
-- 11.2** (ele é "derivado por adjacência", Seção 3.3 — não persistido como
-- tabela própria neste corte). Por isso `alvo` aqui é jsonb solto
-- ({tipo: "conjunto"|"modulo", id: string}), SEM foreign key — o id de
-- "conjunto" não referencia nenhuma tabela ainda (é computado em runtime/app).
-- Se isso for um problema (ex.: perder o override de Conjunto entre sessões),
-- é uma lacuna de arquitetura para o Solution Architect resolver numa task
-- futura — não invente a tabela Conjunto aqui por conta própria.
-- =============================================================================

create table public.elemento_continuo (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,  -- denormalizado
  orcamento_id uuid not null references public.orcamento (id) on delete cascade,
  tipo text not null check (tipo in ('tampo', 'rodape', 'tamponamento', 'fechamento')),
  alvo jsonb not null,        -- {tipo: "conjunto"|"modulo", id: string} — ver nota acima
  posicao text not null check (posicao in ('superior', 'base', 'esquerda', 'direita', 'topo')),
  produto_id uuid references public.produto (id) on delete set null,  -- material (chapa)
  espessura numeric,
  override jsonb,             -- Partial<{largura, profundidade, altura}> — rodapé/fechamento editáveis
  engrossamento jsonb,        -- só tampo (Seção 2.1); null nos demais tipos
  criado_em timestamptz not null default now()
);

-- RLS: CRUD completo, escopo = própria org.

-- =============================================================================
-- 8. linha_proposta — filho de orcamento (Seção 6, comercial)
-- =============================================================================

create table public.linha_proposta (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,  -- denormalizado
  orcamento_id uuid not null references public.orcamento (id) on delete cascade,
  titulo text not null,
  itens jsonb not null default '[]'::jsonb,  -- itemIds (1..N, módulos e/ou placas)
  imagem_url text,           -- RenderRef — URL/caminho no Storage, não binário
  descricao text,
  valor_rateado numeric(12, 2),  -- congelado no fechamento; null até lá; sobrescrevível (override manual)
  criado_em timestamptz not null default now()
);

-- RLS: CRUD completo, escopo = própria org.

-- =============================================================================
-- 9. lista_material — filho de orcamento (Seção 7 "Lista de material fechada":
-- snapshot congelado no fechamento da proposta, D-08 extraível texto/CSV)
--
-- Diferente das demais: é IMUTÁVEL por natureza (congelamento, Seção 5.4 —
-- "proposta se regenera, nunca se edita"). Por isso SEM política de UPDATE.
-- =============================================================================

create table public.lista_material (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacao (id) on delete cascade,  -- denormalizado
  orcamento_id uuid not null references public.orcamento (id) on delete cascade,
  snapshot jsonb not null,  -- BOM consolidado congelado (estrutura equivalente a EngineOutput.consolidado)
  criado_em timestamptz not null default now()
);

-- RLS: SELECT/INSERT/DELETE escopo = própria org. SEM política de UPDATE
-- (imutabilidade da lista fechada é regra de negócio, não só convenção de
-- app — regenerar = criar nova linha, nunca editar a existente).

-- =============================================================================
-- Fim do rascunho de referência. Task 11.3 (próxima) escreve um teste de
-- isolamento por tabela: tenant A não lê/edita/apaga linha do tenant B, para
-- CADA UMA das 9 tabelas acima (cliente, produto, gabarito, orcamento,
-- ambiente, parede, elemento_continuo, linha_proposta, lista_material).
-- =============================================================================
