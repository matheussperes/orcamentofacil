-- Task 0.7a — orcamento.congelado_em: estado congelado da proposta como
-- campo real e consultável (Modelo-de-Dominio.md 5.4.1).
--
-- PRD/Modelo/Design-System já falam de "orçamento congelado"/"não congelado"
-- como se fosse estado consultável, e ele não existia em lugar nenhum
-- (lib/orcamento/buscar.ts:11 e o comentário de
-- lib/lista-material/congelar.ts:20-29 registram a lacuna). Esta migration
-- cria só o estado (coluna); leitura/escrita ficam em
-- lib/orcamento/buscar.ts e lib/orcamento/congelar.ts. Consumo na UI é a
-- Task 0.7b (frontend), fora deste escopo.
--
-- NÃO é valor novo do enum `status`: `status` é o eixo COMERCIAL e continua
-- exatamente 'rascunho'|'enviado'|'aprovado'|'recusado' (intocado). Congelar
-- é ortogonal — uma proposta congelada é justamente a que se envia. Também
-- NÃO é derivado de `lista_material` (são dois congelamentos distintos).

alter table public.orcamento
  add column congelado_em timestamptz;   -- null = nunca congelado

comment on column public.orcamento.congelado_em is
  'Modelo 5.4.1: instante do último congelamento da PROPOSTA. null = não congelado. Escrito no MESMO ato que grava linha_proposta.valor_rateado de TODAS as linhas do orçamento ("Gerar proposta"); recongelar sobrescreve os dois. Ortogonal a `status`: congelar não muda status, mudar status não congela. NÃO é escrito por congelarListaMaterial — aquele é outro congelamento, com histórico próprio em lista_material.';

-- RLS: INALTERADA. Coluna nova em tabela que já tem as 4 políticas por org
-- (supabase/migrations/20260727090300_orcamento.sql). Nenhuma política nova,
-- nenhum índice novo (a contagem de "orçamentos não congelados" da org roda
-- sobre orcamento_organizacao_id_idx, que já existe).
