# Pipeline 02: Development

**Fase**: 2 — Construção e Implementação Isolada  
**Agentes Convocados**: `.maestro/agents/backend-engineer.md` e/ou `.maestro/agents/frontend-engineer.md`  
**Invocado por**: Maestro

## Propósito

Executar uma única micro-task do `docs/Backlog.md` em isolamento total via branch efêmera, entregando código fonte alterado e compilando localmente — sem nenhuma validação de qualidade, segurança ou UX ainda (isso é escopo de `03-quality.md`).

## Gatilho

Executado pelo Maestro após:
- Aprovação humana do Gate de Saída do `01-discovery.md`, para a primeira task do Backlog, **ou**
- Handoff do `03-quality.md`/`04-retrospective.md` sinalizando que a task anterior foi concluída e há uma próxima task aberta

## Sequência

### 1. Leitura da Próxima Task
O Maestro lê `docs/Backlog.md` e seleciona a próxima micro-task com status `⏱️ Planejado`, respeitando a ordem do Pipeline Stage e dependências óbvias entre tasks (ex: schema antes de UI que consome os dados).

Se não houver task `⏱️ Planejado` disponível, o Maestro não avança este pipeline — reporta ao operador que o Backlog está vazio ou aguardando novo Discovery.

### 2. Criação da Branch Efêmera
```bash
git checkout -b feature/<task-id>
```
Regras (herdadas de `maestro.md`):
- Sempre a partir da branch principal atualizada, nunca a partir de outra branch de feature
- Nome exatamente no padrão `feature/<task-id>`

### 3. Preenchimento do Contrato de Execução
O Maestro preenche `.maestro/contracts/Task-Execution-Contract.md` para a task selecionada, incluindo:
- Metadados (Task ID, título, prioridade, executor designado)
- Descrição funcional e critérios de aceitação
- Arquivos impactados
- Referência ao Design-System (se UI) ou ao schema em `.maestro/tmp/schema.sql` (se dados/API)

Este contrato preenchido é o **único contexto** que o Executor recebe — não o PRD completo, não o histórico da sessão.

### 4. Roteamento por Tipo de Task

```
Task envolve banco/API/RLS/Edge Functions → convocar backend-engineer.md
Task envolve interface/componente visual  → convocar frontend-engineer.md
Task envolve lógica de cálculo/domínio    → convocar motor-engineer.md
  pura (lib/engine, lib/orcamento.ts —
  sem UI, sem banco)
Task envolve mais de um domínio           → ordem: backend-engineer.md →
                                             motor-engineer.md → frontend-engineer.md
                                             (dados antes de cálculo antes de UI),
                                             todos na mesma branch
```

#### Se Backend
```
> @backend-engineer Executar Task-Execution-Contract para task <task-id> (branch feature/<task-id> já criada)
```
O Backend Engineer lê a especificação de referência em `.maestro/tmp/schema.sql` (produzida no Discovery) e gera as migrations SQL reais, sempre com `ENABLE ROW LEVEL SECURITY` e políticas explícitas.

#### Se Frontend
```
> @frontend-engineer Executar Task-Execution-Contract para task <task-id> (branch feature/<task-id> já criada)
```
O Frontend Engineer lê `docs/Design-System.md` obrigatoriamente antes de qualquer código, conforme seu próprio prompt de sistema.

#### Se Motor
```
> @motor-engineer Executar Task-Execution-Contract para task <task-id> (branch feature/<task-id> já criada)
```
O Motor Engineer lê `docs/Modelo-de-Dominio.md` (seção relevante) e reproduz todo exemplo numérico trabalhado da spec como teste antes de reportar pronto, conforme seu próprio prompt de sistema.

### 5. Saída Obrigatória

Este pipeline não é considerado concluído até que:
- O código-fonte da task esteja alterado na branch `feature/<task-id>`
- O projeto compile localmente (o Executor confirma isso antes de reportar "pronto" — não é uma validação formal do Code Auditor, apenas a confirmação básica de que a implementação está minimamente funcional)
- Commits estejam feitos com mensagens claras referenciando o task-id

## O que este pipeline NÃO faz

- Não roda `npm run lint`/`npm run build` como gate formal (isso é `03-quality.md`)
- Não faz push definitivo nem merge — push para a branch efêmera é permitido, merge nunca
- Não valida RLS, secrets ou UX — apenas orienta o Executor a seguir as regras já embutidas no seu próprio prompt de sistema
- Não decide arquitetura nova — se a task revela uma lacuna de especificação, o Maestro escala de volta ao Solution Architect em vez de deixar o Executor inventar

## Handoff

Ao final da execução do(s) Executor(es), o Maestro invoca `.maestro/pipelines/03-quality.md` para a mesma task.
