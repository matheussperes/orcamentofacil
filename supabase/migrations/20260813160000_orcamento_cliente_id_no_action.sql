-- Task 4.15 (contrato .maestro/state/contracts/4.15.md) — armadilha técnica 1
-- de `docs/Modelo-de-Dominio.md` Seção 7.3: `orcamento.cliente_id references
-- cliente (id) on delete restrict` (20260727090300_orcamento.sql:19) ABORTA a
-- cascata de `delete from organizacao`.
--
-- Por quê: `RESTRICT` é verificado IMEDIATAMENTE, linha a linha, sem esperar o
-- fim do comando. Quando a cascata da organização apaga `cliente` e `orcamento`
-- (dois ramos irmãos da mesma FK `organizacao_id`), a ordem entre os ramos não
-- é garantida — se `cliente` for apagado primeiro, o `RESTRICT` dispara contra
-- linhas de `orcamento` que a MESMA transação ainda vai apagar, e a exclusão
-- da conta falha com violação de FK. Falha só com dado real: uma org vazia
-- passa no teste.
--
-- Correção (opção (a) da Seção 7.3, a preferida): `on delete no action`.
-- `NO ACTION` é a MESMA regra de proteção que `RESTRICT` — continua proibindo
-- apagar um cliente que tem orçamento vivo, e continua devolvendo violação de
-- FK nesse caso. A ÚNICA diferença é o momento da verificação: fim do comando,
-- não linha a linha. Isso dá à cascata a chance de remover os `orcamento`
-- antes da checagem. A proteção de dia a dia contra apagar cliente com
-- orçamento por engano NÃO é afrouxada.
--
-- Retrocompatível: só troca a regra de tempo de verificação da constraint.
-- Nenhum dado é lido, escrito ou movido; nenhuma coluna, índice ou query muda.

alter table public.orcamento
  drop constraint if exists orcamento_cliente_id_fkey;

alter table public.orcamento
  add constraint orcamento_cliente_id_fkey
  foreign key (cliente_id) references public.cliente (id) on delete no action;

comment on constraint orcamento_cliente_id_fkey on public.orcamento is
  'NO ACTION (não RESTRICT): mesma proteção contra apagar cliente com orçamento vivo, mas verificada no fim do comando — condição para a cascata de exclusão da organização (Modelo-de-Dominio.md 7.3, armadilha 1) funcionar com dado real.';
