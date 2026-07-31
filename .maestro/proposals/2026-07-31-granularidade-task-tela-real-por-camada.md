# Proposta — Decompor tasks de "tela real conectada a dado" por camada desde o discovery

**Origem**: Retrospectiva da Pipeline Stage 13 (`orcamentofacil`, 2026-07-31), Padrão 4 de `docs/Lessons-Learned.md`.

## Problema observado

4 das 8 tasks-macro planejadas na Stage 13 precisaram ser quebradas em
sub-tasks pelo Maestro depois de já estarem em andamento, por escopo grande
demais para uma branch efêmera só:

- Task 13.2 → 13.2a/b/c
- Task 13.3 → 13.3a/b/c/d/e
- Task 13.6 → 13.6a/b
- Task 13.7 → 13.7a/b/c

Em todos os 4 casos, a justificativa registrada teve a mesma forma: a "tela
real" (conectada a dado real, não protótipo local) cruzava múltiplas camadas —
schema/dado, lógica pura, UI, persistência/wiring — e foi inicialmente
planejada como uma unidade só.

## Causa estrutural

O discovery/planejamento da Stage (feito pelo Maestro) definiu a granularidade
inicial das tasks por "tela do produto" (ex.: "Shell + Dashboard + fluxo de
novo orçamento" como uma task só), não por camada/superfície de mudança. Toda
vez que uma tela real precisou tocar schema + lógica + UI + persistência ao
mesmo tempo, o escopo estourou o que cabe numa branch efêmera de execução,
forçando replanejamento reativo no meio da Stage em vez de ser antecipado no
discovery.

## Mudança proposta

Ao planejar tasks futuras de "tela real conectada a dado" (em oposição a
laboratório/protótipo local sem persistência), decompor desde o discovery
inicial por camada — dado/schema → lógica pura → UI → persistência/wiring —
em vez de uma task única por tela. Isso não impede fatiar diferente quando fizer
sentido (algumas telas realmente cabem numa task só), mas evita a quebra
reativa observada 4 vezes nesta Stage: o discovery já entrega o backlog na
granularidade que a execução vai realmente seguir, em vez do Maestro precisar
requebrar no meio do trabalho.

## Qual agente/contrato muda

- Persona/protocolo do agente `maestro` (etapa de discovery/planejamento de
  backlog): heurística explícita de que "tela real conectada a dado" é
  candidata a decomposição por camada desde o início, não só quando o escopo
  já se provou grande demais durante a execução.
- Possivelmente `solution-architect` (se for quem gera o backlog inicial em
  outros projetos), mesma heurística.

## Decisão

Aguardando decisão humana. Esta proposta não altera nenhum arquivo do plugin.
