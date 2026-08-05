-- Task 5.10-back — orcamento.etapa_esteira: etapa do workflow de esteira
-- (Modelo-de-Dominio.md Seção 7.2), campo novo e ORTOGONAL a `status`
-- comercial (mesmo princípio já aplicado a `congelado_em` na 0.7a).
--
-- Enum como text + check, mesmo padrão já usado em orcamento.status
-- (20260727090300_orcamento.sql) — este projeto não usa `create type enum`
-- para os enums de domínio, para não pagar o custo de `alter type ... add
-- value` fora de transação em migrations futuras.
--
-- Transições (T1/T2/T3, E-E1/E-E2) são responsabilidade da aplicação
-- (lib/orcamento/etapa-esteira.ts e lib/orcamento/congelar.ts), não do
-- banco — o `check` aqui só garante que o VALOR pertence ao enum, não que a
-- TRANSIÇÃO é válida (isso exigiria um trigger com acesso ao valor antigo,
-- que o modelo não pediu; a Server Action já é a única porta de escrita
-- manual, T3).
--
-- Backfill: `default 'novo'` cobre tanto orçamentos futuros (gatilho 1,
-- ∅ → novo) quanto os já existentes, via `not null default`, sem UPDATE
-- manual.

alter table public.orcamento
  add column etapa_esteira text not null default 'novo'
    check (etapa_esteira in ('novo', 'visita_agendada', 'projeto_3d', 'aguardando_aprovacao', 'fechado'));

comment on column public.orcamento.etapa_esteira is
  'Modelo 7.2: etapa do workflow de esteira, ORTOGONAL a `status` (comercial). Default ''novo'' (gatilho 1: criar orçamento). Avança para ''aguardando_aprovacao'' no gatilho 2 (congelar/gerar proposta, ver lib/orcamento/congelar.ts) quando a etapa atual for anterior a ela; não muda se já ''fechado'' (recongelamento, I3). ''fechado'' é porta única (T2): só entra pelo gatilho de aprovação (fora do corte de lançamento, portanto inalcançável nesta fase) e só sai pela ação Reabrir (Task 1.9). Movimento livre entre as demais etapas (T1) via lib/orcamento/etapa-esteira.ts:atualizarEtapaEsteira.';

-- RLS: INALTERADA. Coluna nova em tabela que já tem as 4 políticas por org
-- (20260727090300_orcamento.sql). Nenhuma política nova, nenhum índice novo.
