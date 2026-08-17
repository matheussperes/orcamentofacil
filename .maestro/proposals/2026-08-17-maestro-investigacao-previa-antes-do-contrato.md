# Proposta: investigação de estado real antes de escrever o contrato da task

**Origem**: `docs/Lessons-Learned.md`, entrada 2026-08-17 (retrospectiva de fase, Épico V2.1/Fase D, Lotes 0–5).

**Agente afetado**: `maestro:maestro`, etapa de delegação (preenchimento do contrato de task).

## Evidência

Em pelo menos 4 tasks de uma mesma fase de 63 tasks, o escopo descrito no
Backlog (derivado do documento-fonte PRD/Modelo-de-Domínio) incluía itens que
já estavam implementados por código de tasks anteriores:

- Task 2.14–2.17: 2 de 4 itens do documento-fonte já implementados
- Task 2.24–2.26: 1 de 3 itens já pronto desde task anterior do mesmo lote
- Task 2.28–2.30: 3 de 3 sub-itens do escopo original já cobertos por código
  pré-existente — gap real era só uma peça visual
- Task 5.1–5.4: metade do escopo (`/biblioteca`) já 100% migrada desde uma
  task de 2 lotes atrás — escopo real era só a outra metade (`/modulo`)

Em todos os 4 casos a investigação (ad hoc, feita ou pelo Maestro antes do
contrato, ou pelo executor+gates logo no início da execução) evitou trabalho
duplicado, sem custar uma segunda rodada de gate.

## Proposta

Formalizar, na definição do agente `maestro:maestro`, um passo obrigatório
antes de preencher o contrato de qualquer task cujo escopo no Backlog tenha
mais de um item: grep pelos símbolos/telas/funções citadas no documento-fonte
e confirmar quais já existem no código atual, antes de escrever "o que falta"
no contrato do executor. O contrato deve then declarar explicitamente quais
sub-itens já estão cobertos (sem re-trabalho) e qual é o gap real.

Isso já é prática ad hoc bem-sucedida nesta esteira — a proposta é torná-la
passo obrigatório do fluxo de delegação, não uma decisão de julgamento
deixada a critério de cada rodada.

## Por que é candidata a melhoria do framework

Investigação de estado real antes de escrever contrato é uma prática
genérica de qualquer esteira que deriva Backlog de um documento de
especificação estático (PRD) — o código evolui mais rápido que o documento é
re-lido, e esse gap tende a se repetir em qualquer projeto usando o mesmo
padrão de Backlog derivado de PRD com granularidade de sub-itens por task.

## Decisão

Aguardando decisão humana. Este agente não altera o diretório do plugin.
