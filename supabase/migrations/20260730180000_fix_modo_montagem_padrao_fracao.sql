-- Task 13.5 — corrige o default de organizacao.modo_montagem_padrao.
--
-- A migration 20260724181915_fundacao_multitenant.sql (Task 11.1, anterior à
-- Task 12.6/lib/engine/precificacao) gravou o default como
-- {"modo":"percentual_material","percentual":10}. O módulo de precificação
-- V2 (lib/engine/precificacao/types.ts, modos.ts) documenta e implementa
-- `percentual` como FRAÇÃO (0.5 = 50%) em todos os modos — com o valor 10,
-- `calcularMontagemTotal` computaria custoMaterial × 10 (1000% do material)
-- para qualquer organização usando o default, em vez dos 10% pretendidos.
--
-- A Task 13.5 (aba Financeiro) é a primeira tela a efetivamente LER este
-- valor e rodar `ratearPrecificacao` de verdade sobre ele — o bug era
-- inofensivo até aqui (organizacao tem 0 linhas hoje, nenhuma conta real
-- criada ainda), por isso é seguro corrigir só o default, sem UPDATE de
-- dados existentes.
alter table public.organizacao
  alter column modo_montagem_padrao
  set default '{"modo":"percentual_material","percentual":0.1}'::jsonb;

-- Nenhuma linha existente para corrigir (0 organizações cadastradas até
-- agora), mas o UPDATE abaixo é idempotente e seguro caso isso mude antes do
-- deploy desta migration: só toca linhas que ainda estão com o valor errado
-- (10 = 1000%), nunca uma que já foi customizada pelo usuário para outro
-- valor (incluindo um 10 legítimo digitado depois desta correção, o que é
-- improvável mas theoreticamente possível — por isso o filtro é específico
-- ao valor exato do bug, não "todo mundo com modo percentual_material").
update public.organizacao
set modo_montagem_padrao = '{"modo":"percentual_material","percentual":0.1}'::jsonb
where modo_montagem_padrao = '{"modo":"percentual_material","percentual":10}'::jsonb;
