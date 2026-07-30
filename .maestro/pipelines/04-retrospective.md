# Pipeline 04: Retrospective & Sync

**Fase**: 4 — Sincronização de Memória e Atualização de Estado  
**Agentes Convocados**: `.maestro/agents/memory-manager.md`, `.maestro/agents/improvement-agent.md`  
**Invocado por**: Maestro

## Propósito

Manter `docs/Backlog.md` e `docs/Status.md` sincronizados com a realidade após cada task concluída, e capturar aprendizados objetivos ao final de cada sprint/pipeline stage — sem exigir que o operador peça essas atualizações manualmente.

## Gatilho

Executado pelo Maestro em dois momentos distintos:
1. **Após cada task individual**: imediatamente após o merge bem-sucedido em `03-quality.md`, ou após um Circuit Breaker ser resolvido pelo operador
2. **Ao final de uma Sprint/Pipeline Stage**: quando todas as tasks planejadas para o stage atual foram concluídas (ou explicitamente abandonadas pelo operador)

## Sequência

### 1. Atualização de Estado (toda task)
```
> @memory-manager Atualizar estado da task <task-id>: <merged|blocked>
```
O Memory Manager:
- Troca o campo `Status` da task em `docs/Backlog.md` (`⏳ Em Progresso` → `✅ Completo`, ou `🔴 Bloqueado` se Circuit Breaker foi ativado)
- Move a task entre as seções correspondentes em `docs/Status.md`
- Atualiza `**Data Última Atualização**` e, se necessário, `**Estado Geral**`
- Remove bloqueadores resolvidos ou adiciona novos, conforme aplicável

Este passo roda **sempre**, para toda task — não é opcional e não espera o fim da sprint.

### 2. Retrospectiva (apenas ao final de Sprint/Stage)
```
> @improvement-agent Rodar retrospectiva do Pipeline Stage <n>
```
O Improvement Agent:
- Coleta dados objetivos do período: quantidade de vetos de UX, vetos de Security, reprovações de Code Auditor, Circuit Breakers ativados
- Identifica padrões de recorrência (não reprovações isoladas)
- Grava uma entrada estruturada em `docs/Lessons-Learned.md`, seguindo o template já existente no arquivo — nunca especula causa sem evidência

Este passo **não roda após cada task individual** — apenas ao encerrar um stage completo, para evitar poluir `Lessons-Learned.md` com entradas triviais.

### 3. Sincronização com o Repositório Template
```bash
.maestro/scripts/sync-lessons.sh
```
Executado apenas quando o Passo 2 gerou uma alteração real em `docs/Lessons-Learned.md`. O script:
- Verifica se há diff pendente no arquivo — se não houver, sai sem fazer nada (não gera commit vazio)
- Se houver diff, commita e faz push de volta ao repositório template

## Ordem de Execução

```
Task concluída (merge ou bloqueio)
        │
        ▼
  memory-manager.md  ← sempre roda
        │
        ▼
Fim da Sprint/Stage? ──não──► fim do pipeline para esta task
        │
       sim
        │
        ▼
 improvement-agent.md
        │
        ▼
 sync-lessons.sh (apenas se houve alteração em Lessons-Learned.md)
```

## O que este pipeline NÃO faz

- Não decide se uma task foi aprovada ou rejeitada — essa decisão já veio de `03-quality.md`
- Não roda a retrospectiva do Improvement Agent após toda task individual — apenas ao final de stage
- Não força um commit em `sync-lessons.sh` quando não há alteração pendente
- Não escreve em `docs/PRD.md` ou `docs/Design-System.md` — fora do escopo destes dois agentes

## Handoff

Se houver próxima task `⏱️ Planejado` no Backlog, o Maestro reinicia o ciclo em `.maestro/pipelines/02-development.md`. Se o Backlog do stage atual estiver vazio, o Maestro aguarda novo Discovery (`01-discovery.md`) ou instrução do operador.
