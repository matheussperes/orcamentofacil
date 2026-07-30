# Task Execution Contract

**Propósito**: Contrato de entrada entre Maestro e Executor (Frontend/Backend Engineer).  
Garante que o executor recebe contexto suficiente sem poluir a sessão.

---

## Seção 1: Identificação da Task

### Metadados
- **Task ID**: [Ex: 1.2.3-ui-dashboard]
- **Título**: [Título claro e conciso]
- **Pipeline**: [Stage 1, Stage 2, Stage 3]
- **Status**: Nova / Em Progresso / Revisão / Bloqueada
- **Prioridade**: 🔴 Crítica / 🟡 Alta / 🟢 Normal / 🔵 Baixa

### Datas
- **Data de Criação**: YYYY-MM-DD
- **Data de Vencimento**: YYYY-MM-DD
- **Executor**: [Agent Name: Frontend Engineer | Backend Engineer | Motor Engineer]
- **Revisor**: [Code Auditor | UX Auditor]

---

## Seção 2: Requisitos Funcionais

### Descrição da Task
```
[Descrição narrativa concisa do que precisa ser feito]
Máximo 3-5 frases. Ser específico.

Exemplo:
"Criar componente DashboardCard que exibe métricas de vendas.
Deve incluir ícone, título, valor e tendência (up/down).
Aplicar Design-System.md Section 5."
```

### Critérios de Aceitação
- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

### Arquivos Impactados
```
src/components/DashboardCard.tsx          [novo/modificado]
src/styles/components.css                 [modificado]
tests/components/DashboardCard.test.ts    [novo]
```

---

## Seção 3: Contexto Mínimo

### Padrões Aplicáveis
- **Design-System Reference**: [Link ou seção, ex: Design-System.md#5]
- **Dependências Externas**: [Ex: Shadcn/UI Button v2.0, Supabase v2.41]
- **Restrições Técnicas**: [Ex: Sem CSS-in-JS, apenas Tailwind]

### Payload de Referência
```json
{
  "component_name": "DashboardCard",
  "variant": "metric",
  "props": {
    "icon": "TrendingUp",
    "title": "Total Sales",
    "value": "1.2K",
    "trend": "up",
    "trendValue": "12%"
  },
  "responsive": ["sm", "md", "lg"],
  "dark_mode": true
}
```

### Branch Efêmera
```bash
# Executor deve criar/usar branch:
git checkout -b feature/1.2.3-ui-dashboard

# Ao final:
git push -u origin feature/1.2.3-ui-dashboard
```

---

## Seção 4: Gated Quality Checks

### Pre-Submission (Executor)
- [ ] `npm run lint` passa sem erros
- [ ] `npm run type-check` passa (tsc --noEmit)
- [ ] Componente renderiza em 3 breakpoints (mobile/tablet/desktop)
- [ ] Dark mode funciona
- [ ] Nenhum console.error

### Code Review (Code Auditor)
- [ ] ESLint + Prettier OK
- [ ] TypeScript strict mode OK
- [ ] Testes cobrem happy path
- [ ] Sem console.log ou debug artifacts

### Visual Review (UX Auditor)
- [ ] Design-System.md compliance OK
- [ ] Espaçamento correto em todos os breakpoints
- [ ] Contraste WCAG AA
- [ ] Hover/focus states funcionam
- [ ] Modo escuro renderiza corretamente

---

## Seção 5: Protocolo de Veto e Retry

### Se UX Auditor rejeita:
1. UX Auditor cria `.maestro/tmp/UX-Decline-Payload.md`
2. Executor lê payload e corrige na tentativa 1
3. Se falhar tentativa 2: Circuit Breaker ativado → Maestro notificado

### Se Code Auditor rejeita:
1. Code Auditor lista erros em formato estruturado
2. Executor corrige e re-submete
3. Sem limite de tentativas, mas documenta aprendizados

---

## Seção 6: Checklist Final (Executor)

Antes de fazer push, verificar:
- [ ] Branch name segue padrão `feature/[task-id]`
- [ ] Todos os commits têm messages claras
- [ ] PRD/Design-System foram consultados
- [ ] Testado localmente em 3 breakpoints
- [ ] Dark mode verificado
- [ ] Sem secrets/credentials nos arquivos
- [ ] CHANGELOG.md atualizado (se aplicável)
- [ ] Documentação inline atualizada (se aplicável)

---

## Seção 7: Handoff e Status

### Transição entre Agentes
```
Executor → (push) → Code Auditor → UX Auditor → Maestro
```

### Arquivo de Status
Atualizar `.maestro/tmp/[task-id]-status.json`:
```json
{
  "task_id": "1.2.3-ui-dashboard",
  "status": "code_review",
  "current_assignee": "code-auditor",
  "progress": 75,
  "blockers": [],
  "last_update": "2026-07-20T15:30:00Z"
}
```

---

## Notas Importantes

1. **Contexto Limpo**: Executor recebe APENAS esta seção. Nenhum PRD completo.
2. **Modelo Recomendado**: Indicado no metadados (Haiku/Sonnet/Opus)
3. **Escalação**: Se bloqueado > 6 horas, Maestro intervém automaticamente
4. **Documentação**: Qualquer mudança no Design-System precisa aprovação separada

---

**Versão do Contrato**: 1.0  
**Última Atualização**: 2026-07-20
