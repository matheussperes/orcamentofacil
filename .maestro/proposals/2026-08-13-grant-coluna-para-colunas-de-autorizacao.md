# Proposta — checklist do security-auditor: colunas de autorização exigem grant por coluna, não só RLS de linha

**Origem**: retrospectiva do Lote 4 (orcamentofacil), Task 4.15. Veto real registrado em `.maestro/tmp/Security-Decline-Payload.md` (arquivado nesse projeto): `perfil.papel` era gravável por qualquer usuário autenticado via `PATCH /rest/v1/perfil?id=eq.<uid> {"papel":"admin"}`, porque a RLS da tabela restringia a *linha* (`id = auth.uid()`) mas nenhuma regra restringia a *coluna*. Uma Server Action usava esse mesmo campo como gate de autorização para uma operação destrutiva — o bypass anulava o gate por completo.

## Problema genérico

RLS de linha (Postgres `row level security`, o padrão em qualquer stack Supabase/Postgres) resolve "quem pode tocar esta linha". Não resolve "o que dentro da linha pode ser escrito por quem pode tocá-la". Uma tabela com RLS de linha correta pode ainda expor uma coluna de decisão de autorização (papel, tenant_id, flags de permissão, `is_admin`) à escrita do próprio sujeito que ela deveria restringir — porque os grants padrão de Postgres/Supabase concedem UPDATE em todas as colunas a `authenticated` a menos que um `REVOKE`/`GRANT` por coluna diga o contrário. É uma classe de bug silenciosa: passa despercebida enquanto a coluna não é usada como fonte de decisão de autorização em nenhum lugar do código de aplicação, e vira crítica no exato momento em que passa a ser.

## Mudança proposta

No agente `security-auditor` (ou no contrato/checklist que ele segue), adicionar uma checagem explícita para qualquer tabela protegida por RLS de linha que contenha uma coluna usada em código de aplicação como fonte de decisão de autorização (busca por `.eq("papel", ...)`, `.select("...papel...")` seguido de comparação/gate, nomes de coluna como `papel`, `role`, `is_admin`, `tenant_id`, `organizacao_id` quando lidos para decidir acesso):

1. Confirmar se existe `REVOKE UPDATE ... FROM authenticated` + `GRANT UPDATE (colunas_seguras) ... TO authenticated` restringindo a escrita dessa coluna, OU um trigger que rejeite a mudança.
2. Se não existir, tratar como achado bloqueante (não observação), independente de a RLS de linha estar correta — os dois mecanismos protegem eixos diferentes e um não compensa a ausência do outro.

## Por que é candidata a framework, não só a este projeto

O padrão (RLS de linha != proteção de coluna) é uma propriedade do Postgres/Supabase em geral, não uma peculiaridade do domínio deste projeto. Qualquer projeto do framework que use RLS por linha e leia uma coluna da própria tabela como gate de autorização tem a mesma exposição em potencial.

## Decisão

Aguardando decisão humana. Este agente não altera o framework por conta própria.
