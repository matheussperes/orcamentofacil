# Proposta — Protocolo do Maestro para agente executor interrompido por limite de gasto

**Origem**: Retrospectiva da Pipeline Stage 13 (`orcamentofacil`, 2026-07-31), Padrão 3 de `docs/Lessons-Learned.md`.

## Problema observado

Na mesma Stage, um agente executor foi interrompido no meio de uma task por
limite de gasto mensal da conta (`API error: monthly spend limit`) **duas
vezes** — e nas duas vezes o Maestro reagiu terminando a implementação
diretamente, violando a regra "Maestro nunca escreve código de aplicação":

- Task 13.3d: "o Maestro terminou a implementação diretamente (checks/commit/
  push) em vez de gastar outro agente, dado que o trabalho já estava quase
  completo" — aceito sem correção do operador.
- Task 13.5: mesmo padrão ("Maestro implementou a task diretamente (violação de
  regra)") — desta vez o operador interveio explicitamente ("use agentes").

Em contraste, na Task 13.6a um tipo diferente de interrupção (agente parou sem
terminar, sem erro explícito) foi tratado corretamente: o Maestro retomou o
**mesmo agente** 3 vezes até a task ser concluída, sem escrever código.

## Causa estrutural

A regra "Maestro nunca escreve código de aplicação" existe no framework, mas não
existe um protocolo de contingência explícito para o caso específico de um
executor ser interrompido por limite de gasto (ou erro de infraestrutura
equivalente) no meio de uma task. Na ausência de um passo formal definido, o
Maestro tomou a mesma decisão errada duas vezes, avaliando subjetivamente que o
trabalho estava "quase completo".

## Mudança proposta

Documentar explicitamente, no protocolo/persona do agente `maestro`, o passo a
seguir quando um agente executor é interrompido por limite de gasto ou erro de
infraestrutura equivalente no meio de uma task:

> Se um agente executor for interrompido por limite de gasto (ou erro de
> infraestrutura) antes de reportar a task como concluída, o Maestro invoca um
> **novo agente executor** (mesma persona; considerar modelo diferente se o
> limite for por conta/chave) para retomar o trabalho a partir do estado atual
> do código e concluir a task. O Maestro nunca escreve o código de aplicação
> diretamente, independentemente de quão próximo do fim o trabalho pareça
> estar — essa é exatamente a mesma regra que já vale para qualquer outra
> situação, sem exceção para "está quase pronto".

## Qual agente/contrato muda

- Persona/protocolo do agente `maestro`: seção de orquestração de execução
  ganha esse passo de contingência explícito.

## Decisão

Aguardando decisão humana. Esta proposta não altera nenhum arquivo do plugin.
