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

## 2026-07-31 — Pipeline Stage 13 (Fase C — Experiência; fecha o Épico V2 inteiro)

**Métricas do período**
- Tasks concluídas: 17 (13.0, 13.1, 13.2a, 13.2b, 13.2c, 13.3a, 13.3b, 13.3c, 13.3d, 13.3e, 13.4, 13.5, 13.6a, 13.6b, 13.7a, 13.7b, 13.7c)
- Vetos de UX: 0 formais (nenhum `UX-Decline-Payload.md` gerado nesta Stage) | Segurança: 0 bloqueantes (todos os achados foram observações não-bloqueantes) | Build/Lint: 1 reprovação inicial do Code Auditor (Task 13.5, 3 `console.error`, reclassificada como falso positivo pelo Maestro e não bloqueou) | Testes: 1 reprovação formal do QA Engineer com Decline Payload (Task 13.6a)
- Circuit Breakers: 2 (Task 13.1, Tentativa 1; Task 13.6a, Circuit Breaker 2/QA — `.maestro/tmp/QA-Decline-Payload.md`)
- Tasks que precisaram de ≥1 rodada de correção: 5 de 17 — 13.1, 13.2b, 13.2c, 13.3a, 13.6a (~29%)

### Padrão 1 — Lógica de domínio/UI duplicada entre telas, extraída só depois da 2ª tela consumidora existir
Três casos na mesma Stage, mesma forma: a função é escrita inline na primeira tela, e só vira módulo compartilhado quando a segunda tela precisa da mesma coisa.
- `resolverAlvoElemento`: implementada dentro de `AmbientesLab` (Task 13.2c), extraída para `lib/ambiente/resolverAlvo.ts` só na Task 13.4 quando `CorteMaterialLab` passou a precisar dela.
- `calcularEngineOrcamento`: implementada inline em `CorteMaterialLab.tsx` (Task 13.4), extraída para `lib/ambiente/calcularEngineOrcamento.ts` só na Task 13.5 quando `FinanceiroLab` passou a precisar do mesmo cálculo.
- Seletor de modo de precificação/montagem: implementado dentro de `FinanceiroLab` (Task 13.5), extraído para `components/precificacao/SeletorModoPrecificacao.tsx`/`SeletorModoMontagem.tsx` só na Task 13.7a quando `/perfil` precisou do mesmo controle.

**Causa estrutural provável**: o `Task-Execution-Contract` não pede ao executor para checar, antes de implementar uma função de domínio/cálculo/resolução, se uma equivalente já existe em `lib/` de uma tela irmã do mesmo Épico. A extração acontece de forma reativa (na 2ª ocorrência), nunca antecipada na 1ª.

**Ação proposta**: adicionar ao contrato de execução um item de checklist explícito — "antes de implementar lógica de cálculo/resolução de domínio nova, buscar por função equivalente já existente e reaproveitável em `lib/` antes de escrever inline no componente". Não elimina a duplicação em todos os casos (às vezes a 2ª tela não existe ainda), mas reduz o atraso da extração.

**Escopo**: Candidata a melhoria do framework (item de contrato de execução, reutilizável em qualquer projeto com múltiplas telas consumindo o mesmo domínio).

---

### Padrão 2 — Bugs reais de interação/layout só aparecem na auditoria visual ao vivo, nunca nos 3 gates automatizados
Quatro ocorrências na mesma Stage, mesmo formato: build/lint/typecheck/test (Code Auditor) e a leitura de código do QA Engineer passam limpos, e o bug só é achado quando alguém interage de fato com a tela renderizada.
- Task 13.1: grid blowout no `<svg>` de `PlacaVisual` (19px de overflow em 375px) — achado em auditoria ao vivo, não em teste automatizado (Circuit Breaker Tentativa 1).
- Task 13.2b: corrida de efeitos (`reactStrictMode`) sobrescrevendo `overrides` do `localStorage` com `[]` — achada reproduzindo o cenário ao vivo (adicionar itens, quebrar handle, recarregar de verdade), não pego por nenhum teste automatizado.
- Task 13.2c: overflow horizontal em 375px nas duas novas `<section>` de Elemento Contínuo — mesma causa-raiz de grid sem `min-w-0`, achado em auditoria ao vivo.
- Task 13.7b: Select do shadcn dentro de Dialog travando todos os botões após escolher uma opção (bug real do Radix, `@radix-ui/react-presence` nunca completando a desmontagem) — só encontrado na auditoria visual ao vivo, não pelos gates automatizados (QA Engineer aprovou de primeira só por leitura de código).

**Causa estrutural provável**: a suíte automatizada (`vitest run`, 290 testes ao fim da Stage) cobre quase exclusivamente lógica pura (`lib/engine/*`, cálculos). Não há teste de integração de componente (Testing Library/Playwright) cobrindo interação real de DOM — estado de Dialog/Select, corrida de efeitos, layout/overflow. Isso empurra 100% da detecção desses bugs para a auditoria manual ao vivo do Maestro/UX Auditor, que é necessariamente amostral, não exaustiva.

**Ação proposta**: para tasks que envolvem composição de componentes com estado assíncrono ou interativo (Dialog+Select, drag/handle, persistência local com efeito de carga), exigir no critério de aceitação pelo menos um teste de integração automatizado (não só unitário de função pura) além da auditoria visual — ou, se o pipeline aceitar conscientemente que isso fica só com a auditoria manual, registrar essa decisão explicitamente no contrato do QA Engineer/UX Auditor em vez de deixar implícito.

**Escopo**: Candidata a melhoria do framework (contrato do `qa-engineer`/`ux-auditor` e do pipeline de qualidade `.maestro/pipelines/03-quality.md`).

---

### Padrão 3 — Maestro escreveu código de aplicação diretamente após agente executor cair por limite de gasto (2 ocorrências, mesma causa)
- Task 13.3d: "o agente que implementou foi interrompido no meio por limite de gasto da conta (`API error: monthly spend limit`) — o Maestro terminou a implementação diretamente (checks/commit/push)."
- Task 13.5: "Frontend Engineer original caiu por limite de gasto mensal; Maestro implementou a task diretamente (violação de regra), operador corrigiu (\"use agentes\")."
Mesma causa externa (limite de gasto mensal da conta) levou à mesma decisão errada duas vezes seguidas dentro da mesma Stage — a primeira vez (13.3d) não foi corrigida pelo operador (o código foi aceito), e a segunda (13.5) só foi corrigida depois de o operador intervir explicitamente.

**Causa estrutural provável**: a regra "Maestro nunca escreve código de aplicação" existe, mas não existe um protocolo de contingência para quando um agente executor é interrompido por limite de gasto no meio da task — na ausência de um passo formal definido, o Maestro decidiu terminar o trabalho ele mesmo por considerar "quase completo", duas vezes.

**Ação proposta**: documentar explicitamente, no protocolo do Maestro, o passo a seguir quando um agente executor é interrompido por limite de gasto (ou erro equivalente de infraestrutura) no meio de uma task: invocar um novo agente executor (mesma persona, possivelmente outro modelo) para retomar e concluir o trabalho a partir do estado atual — nunca o Maestro escrever o código diretamente, independentemente de quão próximo do fim o trabalho pareça estar. Contraste direto com a Task 13.6a, onde o mesmo tipo de interrupção (agente parou sem terminar) foi tratado corretamente retomando o mesmo agente 3 vezes em vez de o Maestro implementar.

**Escopo**: Candidata a melhoria do framework (protocolo do agente `maestro` para interrupção de executor por limite de gasto/infra).

---

### Padrão 4 — Mais da metade das tasks-macro da Stage precisou ser quebrada em sub-tasks depois de já estar em andamento
4 das 8 tasks-macro planejadas (13.2, 13.3, 13.6, 13.7) foram quebradas em sub-tasks pelo Maestro após avaliar que o escopo era grande demais para uma branch efêmera só: 13.2→13.2a/b/c, 13.3→13.3a/b/c/d/e, 13.6→13.6a/b, 13.7→13.7a/b/c. Em todos os 4 casos a justificativa registrada foi a mesma forma: "tela real" que na prática cruza múltiplas camadas (schema/dado, lógica pura, UI, persistência) tratada inicialmente como uma unidade só.

**Causa estrutural provável**: o discovery/planejamento da Stage 13 (feito pelo Maestro em 2026-07-27) definiu a granularidade inicial das tasks por "tela do produto" (ex.: "Task 13.3 — Shell + Dashboard + fluxo de novo orçamento"), não por camada/superfície de mudança. Toda vez que uma tela real (conectada a dado real, não protótipo local) precisou tocar schema + lógica + UI + persistência ao mesmo tempo, o escopo estourou o que cabe numa branch efêmera, forçando replanejamento reativo no meio da execução em vez de ser antecipado no discovery.

**Ação proposta**: ao planejar tasks futuras de "tela real conectada a dado" (não laboratório local), decompor desde o discovery inicial por camada (dado/schema → lógica pura → UI → persistência/wiring) em vez de uma task única por tela, evitando a quebra reativa observada 4 vezes nesta Stage.

**Escopo**: Candidata a melhoria do framework (heurística de granularidade de task no discovery/planejamento do `maestro`, reutilizável em qualquer projeto com telas que cruzam múltiplas camadas).

---

### Padrão 5 — Gap de dado/schema adiado explicitamente em Stage anterior só é achado durante a execução da tela que finalmente o consome
Duas ocorrências com a mesma forma: uma decisão de arquitetura em Stage 11/12 (motor/dados) adiou explicitamente um dado/seed "para quando a tela existir", sem virar item rastreável na task futura — e a lacuna reaparece como achado de auditoria, não como algo já previsto.
- Biblioteca global de gabaritos: Task 11.4 (2026-07-27) documentou na própria migration "sem seed de gabaritos globais... fica para quando o operador definir" — reapareceu na Task 13.7c como "achado importante durante investigação" (regressão real: organização nova abriria Biblioteca zerada), exigindo uma migration nova de correção (`20260731090000_seed_gabaritos_padrao.sql`) fora do planejamento original da task.
- Coluna de cor de `elemento_continuo`: gap de schema descoberto durante a Task 13.3d ("cor não sobrevive a reload, cai em fallback"), documentado como dívida mas não virou migration — permanece pendente sem task própria no backlog.

**Causa estrutural provável**: quando uma decisão de arquitetura adia um dado/seed dizendo "fica para quando a tela existir" (linguagem usada nas duas Tasks 11.4 e implicitamente em Stage 12), esse adiamento fica só como nota de texto no Backlog, sem virar um critério de aceitação explícito da task futura que efetivamente vai consumir aquele dado — a lacuna só é percebida quando o executor da tela chega lá.

**Ação proposta**: quando o Solution Architect/Maestro decide adiar um dado/seed/coluna explicitamente "para quando a tela X existir", registrar esse adiamento como um critério de aceitação explícito da task X no Backlog (não só como nota de rodapé da task que adiou), para que apareça no contrato do executor desde o início em vez de aparecer como achado de auditoria.

**Escopo**: Somente este projeto (é uma prática de como o Backlog deste projeto específico registra dívidas adiadas entre Stages; o princípio é generalizável, mas a evidência aqui é sobre a estrutura do `docs/Backlog.md` deste repositório).
