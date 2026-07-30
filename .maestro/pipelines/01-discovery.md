# Pipeline 01: Discovery & Planning

**Fase**: 1 — Discovery e Planejamento  
**Agente Convocado**: `.maestro/agents/solution-architect.md`  
**Invocado por**: Maestro

## Propósito

Transformar uma ideia bruta ou rascunho do operador em especificação técnica completa e fatiada em tasks executáveis, antes que qualquer Executor escreva uma linha de código.

## Gatilho

Este pipeline é executado pelo Maestro quando:
- Um novo projeto ou épico ainda não possui `docs/PRD.md`, `docs/Design-System.md` ou `docs/Backlog.md` estruturado
- Uma mudança de escopo relevante exige revisão da arquitetura ou do schema de dados já definido

## Entradas

- Ideia bruta ou rascunho do usuário (texto livre, sem formato obrigatório)
- Restrições conhecidas, se houver (prazo, stack obrigatória, integrações externas)

## Sequência

### 1. Convocação
O Maestro convoca o Solution Architect, recomendando ao operador o comando:
```
> @solution-architect Executar Discovery para: <resumo da ideia bruta>
```

### 2. Execução do Solution Architect
Seguindo seu próprio prompt de sistema (`solution-architect.md`), o agente:
1. Coleta problema, escopo do MVP e restrições — pergunta ao operador se a ideia estiver incompleta, nunca inventa requisito
2. Produz `docs/PRD.md`
3. Produz `docs/Design-System.md`
4. Produz o schema inicial do Supabase como **especificação SQL de referência** em `.maestro/tmp/schema.sql` (arquivo de troca de estado — não é uma migration executável do Backend Engineer, apenas o rascunho estrutural que orienta a Task 4.1B/02-development)
5. Fatia o escopo do MVP em micro-tasks e grava em `docs/Backlog.md`

### 3. Saídas Obrigatórias

Este pipeline **não é considerado concluído** até que todos os artefatos abaixo existam:

| Artefato | Caminho | Responsável |
|---|---|---|
| PRD | `docs/PRD.md` | Solution Architect |
| Design System | `docs/Design-System.md` | Solution Architect |
| Schema inicial (referência) | `.maestro/tmp/schema.sql` | Solution Architect |
| Backlog fatiado em micro-tasks | `docs/Backlog.md` | Solution Architect |

### 4. Gate de Saída: Aprovação Humana

O Maestro **não avança para `02-development.md`** sem confirmação explícita do operador. Ao final da execução do Solution Architect, o Maestro apresenta um resumo dos 4 artefatos produzidos e pergunta diretamente:

```
Discovery concluído. Resumo:
- PRD: <1 linha do escopo do MVP>
- Design System: <1 linha, ex: paleta e tipografia definidas>
- Schema inicial: <n> tabelas especificadas em .maestro/tmp/schema.sql
- Backlog: <n> micro-tasks criadas

Aprovar e avançar para a fase de Development? (sim/não)
```

Se o operador solicitar ajustes, o Maestro reconvoca o Solution Architect apenas para os artefatos que precisam de revisão — não refaz o Discovery do zero.

## O que este pipeline NÃO faz

- Não escreve código de aplicação nem migrations executáveis
- Não cria branches Git (isso começa em `02-development.md`, após aprovação)
- Não invoca Executores (Frontend/Backend Engineer) ou Auditores — esses só entram após o gate de aprovação

## Handoff

Após aprovação do operador, o Maestro invoca `.maestro/pipelines/02-development.md` para a primeira micro-task do `docs/Backlog.md`.
