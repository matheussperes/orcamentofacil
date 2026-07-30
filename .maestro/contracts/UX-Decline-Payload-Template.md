# UX Decline Payload

**Gerado por**: UX Auditor  
**Data**: YYYY-MM-DD  
**Versão do Design-System**: [x.y.z]

---

## Informações Críticas

### Target Component
- **Caminho do arquivo**: `src/components/...`
- **Commit/Branch**: [hash ou branch name]

### Rule Violated
- **Seção do Design-System**: [Exemplo: Section 3.2 - Espaçamento]
- **Regra específica**: [Descrição exata]

### Detalhes do Erro

#### Expected (Esperado)
```
[Descrição do comportamento correto]
Exemplo: Gap-4 entre cards em telas desktop (16px)
```

#### Found (Encontrado)
```
[Descrição do comportamento observado]
Exemplo: Elementos sobrepostos na resolução 1440x900
```

#### Evidence
- **Screenshot**: `.maestro/tmp/screenshots/[filename].png`
- **Coordenadas (opcional)**: x: 0, y: 0, width: 1440, height: 900
- **Resolved (sim/não)**: Não

---

## Protocolo de Resposta

### Tentativa 1
- **Status**: ⏳ Aguardando correção
- **Prazo**: 24 horas
- **Responsável**: Frontend Engineer
- **Ação esperada**: Ler payload, ajustar componente, fazer retest

### Tentativa 2
- **Status**: ⏳ Aguardando confirmação
- **Prazo**: 24 horas
- **Ação esperada**: Revalidar após correção

### Resolução
- **Status**: Se passar: ✅ Aprovado | Se falhar: 🔴 Circuit Breaker Ativado
- **Próximo Passo**: [Escalação para Maestro se falhar 2x]

---

## Campos Obrigatórios (Checklist)
- [ ] Caminho do arquivo preenchido
- [ ] Regra do Design-System identificada
- [ ] Expected vs Found claramente diferenciados
- [ ] Screenshot anexado
- [ ] Status da resolução atualizado

## Notas Adicionais
```
[Observações extras que possam ajudar na correção]
```

---

**Formato Markdown obrigatório**. Preencher TODOS os campos acima.  
**Não é permitido** executar sem screenshot de evidência.
