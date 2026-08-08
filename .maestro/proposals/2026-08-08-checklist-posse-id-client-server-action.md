# Proposta: checklist obrigatório de posse de ID recebido do client em Server Actions

**Origem**: `docs/Lessons-Learned.md`, entrada 2026-08-08 (Pipeline Stage Lote 2), Padrão 4.

## Evidência

Task 2.3-2.6 deste projeto: `security-auditor` reprovou na 1ª tentativa (`.maestro/tmp/Security-Decline-Payload.md`) porque `salvarEstadoAmbiente` (`lib/ambiente/salvar.ts`) inseria linhas em `ambiente`/`elemento_continuo` referenciando o `orcamentoId` recebido como parâmetro da Server Action sem antes confirmar que esse `orcamentoId` pertence à organização do usuário autenticado — permitindo escrita cross-tenant (IDOR). A mesma checagem já existia em `criarAmbiente`, função irmã do mesmo módulo (`lib/ambiente/acoes.ts`), mas não tinha sido replicada em `salvarEstadoAmbiente`.

## Problema estrutural

A validação de posse de ID recebido do client existe como convenção implícita (imitação de código vizinho), não como item obrigatório de contrato. Isso permite que uma nova Server Action no mesmo módulo omita a checagem sem que nada no processo de execução ou nos gates automatizados (build/lint/typecheck) capture o gap antes da auditoria de segurança manual — que roda tarde, ao final, e depende de leitura atenta linha a linha.

## Mudança proposta

No agente/contrato responsável por gerar o `Task-Execution-Contract` (Maestro) e/ou no agente executor (`backend-engineer`/`frontend-engineer`), adicionar item de checklist obrigatório para qualquer task que crie ou modifique uma Server Action recebendo um ID de entidade do client (`orcamentoId`, `ambienteId`, `paredeId`, ou equivalente em outro projeto):

> "Toda escrita (INSERT/UPDATE/DELETE) que referencia um ID de entidade recebido como parâmetro da Server Action deve ser precedida de uma confirmação explícita de que esse ID pertence ao tenant do usuário autenticado (ex.: `select id from <entidade_pai> where id = <id> and organizacao_id = <organizacao_do_usuario>`), replicando o padrão de qualquer função irmã do mesmo módulo que já faça essa checagem."

Isso pode ser incorporado como item permanente do checklist do `security-auditor` (para auditar) e do contrato de execução (para o executor não deixar implícito).

## Escopo

Regra generalizável de segurança multi-tenant, aplicável a qualquer projeto com Server Actions e isolamento por organização/tenant — não peculiar deste repositório.

Aguardando decisão humana. Nenhum agente ou contrato do plugin foi alterado por este agente.
