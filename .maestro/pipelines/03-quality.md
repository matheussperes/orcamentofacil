# Pipeline 03: Quality & Audit Gates

**Fase**: 3 — Fiscalização Rigorosa (Circuit Breaker)  
**Agentes Convocados**: `.maestro/agents/code-auditor.md`, `.maestro/agents/security-auditor.md`, `.maestro/agents/ux-auditor.md`  
**Invocado por**: Maestro

## Propósito

Validar a implementação da task em três gates sequenciais, do mais barato/rápido ao mais caro/lento, garantindo que nenhum problema estático, de segurança ou visual chegue ao merge. Qualquer um dos três agentes tem poder de veto.

## Gatilho

Executado pelo Maestro imediatamente após o handoff de `02-development.md`, com a branch `feature/<task-id>` já contendo o código implementado.

## Sequência dos Gates

### Passo 1 (Barato/Rápido): Code Auditor
```
> @code-auditor Validar task <task-id> na branch feature/<task-id>
```
O Code Auditor roda, na ordem, e para no primeiro que falhar:
```bash
npm run build
npm run lint
```
- **Se passar**: avança para o Passo 2
- **Se falhar**: retorna diretamente ao Executor original (Backend, Frontend ou Motor Engineer, conforme quem executou a task) com o erro exato — **não gera decline payload formal**, pois o erro estático já é autoexplicativo (arquivo + linha + mensagem do compilador/linter). Este é o único gate cuja rejeição não passa pelo protocolo de payload em `.maestro/tmp/`.

### Passo 2 (Segurança): Security Auditor
```
> @security-auditor Validar task <task-id> na branch feature/<task-id>
```
O Security Auditor varre:
- Secrets hardcoded
- RLS habilitado + políticas explícitas em toda tabela Supabase afetada
- OWASP Top 10 em rotas/Edge Functions novas ou alteradas

- **Se passar**: avança para o Passo 3
- **Se falhar**: gera `.maestro/tmp/Security-Decline-Payload.md` e retorna ao Executor responsável (Backend Engineer para RLS/secrets de servidor, Frontend Engineer para secrets expostos no client)

### Passo 3 (Visão/UX): UX Auditor
Apenas se a task envolveu mudança de interface. Tasks puramente de backend sem impacto visual pulam este passo — o Maestro decide isso com base no `Task-Execution-Contract` da task.

```bash
.maestro/scripts/seed-qa-user.ts
npm run dev
```
```
> @ux-auditor Validar task <task-id> na branch feature/<task-id>
```
O UX Auditor autentica-se com o usuário QA, navega pela tela alvo, captura screenshots em 3 breakpoints + dark mode, e valida contra `docs/Design-System.md`.

- **Se passar**: task aprovada nos 3 gates
- **Se falhar**: gera `.maestro/tmp/UX-Decline-Payload.md` e retorna ao Frontend Engineer

## Regra de Loop: Circuit Breaker (Máximo 2 Tentativas)

Esta regra se aplica independentemente a **cada gate que gera decline payload** (Security Auditor e UX Auditor — o Code Auditor não conta tentativas formalmente, pois erros de build/lint são corrigidos e re-submetidos sem limite explícito, já que não é uma questão de julgamento subjetivo):

1. **1ª reprovação** (Security ou UX): payload gerado, Executor corrige, re-submete
2. **2ª reprovação da mesma task, no mesmo gate**: payload gerado com aviso de que a próxima falha ativa o Circuit Breaker
3. **3ª submissão ainda com falha no mesmo gate**: o Maestro **pausa a esteira imediatamente** e exibe:
   ```
   ⚠️  CIRCUIT BREAKER ATIVADO — Task <task-id>
   Falhou validação de <Security Auditor|UX Auditor> por 2 tentativas.
   Aguardando orientação do operador humano.
   ```
   Nenhum outro agente é invocado até que o operador decida como proceder (aceitar risco, escalar para Solution Architect, redefinir critérios, etc.)

Se uma task falhar em **gates diferentes** em rodadas diferentes (ex: passou Security na 1ª tentativa, mas falhou UX na 1ª e 2ª tentativas), a contagem de tentativas é **por gate**, não agregada — o Circuit Breaker do UX Auditor não é afetado por uma aprovação prévia no Security Auditor.

## Aprovação Final

Se a task passar nos 3 gates aplicáveis (ou nos 2 aplicáveis, quando UX Auditor é pulado por não haver mudança visual):

```bash
git checkout main
git merge --no-ff feature/<task-id>
git branch -d feature/<task-id>
```

O Maestro executa/recomenda esse merge apenas após confirmação de que **todos os gates aplicáveis retornaram aprovação** — nunca com um gate pendente ou reprovado.

## O que este pipeline NÃO faz

- Não corrige código, migrations ou componentes — cada auditor apenas reporta, a correção é sempre do Executor
- Não pula gates para "economizar tempo" — a única omissão permitida é o UX Auditor quando a task não tem componente visual, e isso é decidido pelo escopo da task, não por conveniência
- Não faz merge com qualquer gate reprovado ou pendente

## Handoff

Após o merge, o Maestro invoca `.maestro/pipelines/04-retrospective.md` para a mesma task.
