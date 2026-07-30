# Lições Aprendidas

Mantido pelo agente `improvement-agent` ao final de cada Pipeline Stage.

Toda entrada é ancorada em evidência verificável: um veto registrado, uma contagem de tentativas, um Circuit Breaker. Padrão recorrente entra; incidente isolado, não.

## Formato

```markdown
## <data> — Pipeline Stage <n>

**Métricas do período**
- Tasks concluídas: <n>
- Vetos de UX: <n> | Segurança: <n> | Build/Lint: <n> | Testes: <n>
- Circuit Breakers: <n>

**Padrão identificado**
<descrição, com as tasks específicas como evidência>

**Causa estrutural provável**
<qual documento, contrato ou regra permitiu o padrão acontecer>

**Ação proposta**
<mudança concreta e verificável>

**Escopo**
Somente este projeto | Candidata a melhoria do framework
```

---

_Nenhuma retrospectiva registrada ainda._
