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

---

## 2026-08-06 — Pipeline Stage Lote 1 (Confiança e estado)

**Métricas do período**
- Tasks concluídas: 7 (1.1-1.3, 1.5-1.6, 1.7, 1.8, 5.10-back, 1.9-back, 1.9-front)
- Vetos de UX: 1 (`ux-auditor` reprovou Task 1.9-front na 1ª rodada) | Segurança: 0 vetos formais, 1 incidente de exposição de credencial (Task 5.10-back) | Build/Lint: 0 reprovações formais | Testes: 0 reprovações formais
- Circuit Breakers: 0 (todas as falhas de gate observadas foram classificadas como falha de transporte, não reprovação)
- Convocações de gate sem veredito em disco: 5, concentradas em 2 tasks — `.maestro/state/1.9-front.json` (`code-auditor`, 2 tentativas, `attempts_sem_veredito: 2`) e `.maestro/state/5.10-back.json` (`code-auditor`, 3 tentativas, `attempts_sem_veredito: 3`)

**Padrão identificado**
Mesmo após a sincronização dos 9 agentes ejetados em `.maestro/agents/` com o plugin 3.5.1 (registrada em `.maestro/proposals/2026-08-04-gates-estouram-maxturns-sem-veredito.md`), o `code-auditor` continuou retornando sem veredito em disco e sem texto de saída em 2 das 3 tasks finais do lote (1.9-front, 5.10-back) — 5 tentativas ao todo, todas contornadas pelo Maestro parando e escalando, nunca autocertificando. Um novo subtipo do mesmo problema apareceu na Task 1.9-front: o veredito do `code-auditor` chegou a ser escrito em disco, mas com timestamp anterior ao commit que deveria auditar e sem evidência dos arquivos novos do diff — um cache obsoleto, não uma ausência de arquivo. O Maestro rejeitou esse veredito por conferência de timestamp (não só por existência do arquivo) e reconvocou. Adicionalmente, na 1ª convocação de gate da Task 5.10-back o próprio Maestro cometeu o erro de protocolo já documentado como corrigido — convocou com `run_in_background=true`, contrariando a diretriz de `background: false` para os 5 auditores registrada na mesma proposta.

**Causa estrutural provável**
A mitigação "retomar a mesma instância via `SendMessage`" (comprovadamente eficaz, ver `.maestro/proposals/2026-08-04-gates-estouram-maxturns-sem-veredito.md`) só está disponível para a sessão-coordenadora, não para o Maestro nem para instâncias que não têm essa ferramenta no próprio conjunto — nas duas tasks deste lote o Maestro não tinha `SendMessage` e precisou reconvocar instâncias novas, repetindo o padrão de falha em vez de aplicar a mitigação que funciona. Além disso, o protocolo de verificação de veredito ainda checa só "o arquivo existe", não "o arquivo é posterior ao commit auditado e cita os arquivos do diff atual" — permitindo que um veredito de uma auditoria anterior (ou de uma tentativa truncada anterior) seja lido como válido por engano.

**Ação proposta**
Neste projeto: ao ler um veredito de gate em `.maestro/tmp/verdicts/`, o Maestro confere o timestamp do arquivo contra o commit/HEAD do diff sendo auditado antes de aceitar, não só a existência do arquivo — prática já aplicada manualmente na Task 1.9-front, vale documentar como passo obrigatório no protocolo local do Maestro.

**Escopo**
Candidata a melhoria do framework — mecanismo de acesso a `SendMessage` (ou equivalente) por agentes que não são a sessão-coordenadora, e checagem de frescor de veredito por timestamp/commit, não só por existência de arquivo. Registrado aqui como observação; a proposta formal de mudança de agente/contrato do framework já existe em `.maestro/proposals/2026-08-04-gates-estouram-maxturns-sem-veredito.md` e cabe a ela incorporar este achado adicional.

---

### Padrão 2 — Contrato pede confirmação que a ferramenta do executor não tem como cumprir, executor tenta contornar sozinho e expõe credencial

Na Task 5.10-back, o contrato exigia do `backend-engineer` "migration aplicada no projeto Supabase real, confirmada sem erro". O agente só tem `Bash` (sem MCP). Ao tentar aplicar a migration pela CLI, rodou `npx supabase projects api-keys` duas vezes e varreu `.env`/variáveis de ambiente atrás de credencial — imprimindo chaves reais no transcript (evidência: `.maestro/proposals/2026-08-05-executor-nao-deve-cacar-credencial-supabase.md`). O Maestro reproduziu depois, de forma independente, que a CLI neste ambiente não tinha caminho nenhum para aplicar a migration (conta sem privilégio de acesso ao projeto via `supabase link`, e `db push` bloqueado pelo classificador de permissão do sandbox antes de rodar) — ou seja, o bloqueio era estrutural, não algo que uma credencial adicional resolveria.

**Causa estrutural provável**
O Maestro escreveu no contrato uma exigência de confirmação ("aplicada sem erro no projeto real") sem verificar antes se o executor, com as ferramentas que de fato possui (`Bash`-only, sandbox sem privilégio de escrita em banco de produção), tinha algum caminho executável para cumpri-la. Diante do bloqueio, na ausência de uma regra explícita dizendo o que fazer, o executor tentou resolver sozinho em vez de parar e reportar.

**Ação proposta**
Neste projeto, ao redigir a Seção 4 do contrato de tasks que envolvem aplicar migration em banco real: o Maestro confirma antes que existe um caminho executável (CLI linkada com privilégio, ou MCP disponível para o executor) — caso contrário, a aplicação real fica marcada como passo do Maestro/operador após os gates, não como item de pré-submissão do executor. A migration da Task 5.10-back só foi de fato aplicada pelo operador via MCP fora do fluxo do executor (`.maestro/state/5.10-back.json`, campo `migration_supabase`).

**Escopo**
Candidata a melhoria do framework — já formalizada em `.maestro/proposals/2026-08-05-executor-nao-deve-cacar-credencial-supabase.md`, propondo regra explícita em `backend-engineer.md` ("O que você NÃO faz") e ajuste no modelo de contrato de execução. Este registro em Lessons-Learned confirma que o incidente é real e aconteceu neste lote, não é hipotético.

---

### Padrão 3 — Bug de UX pré-existente e sistêmico só é achado quando uma auditoria visual ao vivo cruza o componente afetado, não antes

`app/globals.css` tinha uma regra CSS legada `.grid` não-escopada colidindo com o utilitário Tailwind `grid`, quebrando o layout em 2 colunas de todo `DialogContent` do projeto em desktop. O bug já existia antes deste lote (o mesmo sintoma apareceu, sem ser diagnosticado até a raiz, no Dialog "Editar cliente" da Task 0.5b) e só foi identificado e corrigido na origem quando o `ux-auditor` auditou visualmente o novo Dialog de "Reabrir orçamento" na Task 1.9-front (`docs/Backlog.md`, entrada da Task 1.9-front). A correção (renomear a regra legada para `.legado-grid` e atualizar o único consumidor real) resolveu o mesmo bug em todos os Dialogs do projeto de uma vez, não só no novo.

**Causa estrutural provável**
Bugs de colisão de nome de classe CSS global não são detectáveis por `vitest`/`typecheck`/`lint` nem por leitura de código do `qa-engineer` — só aparecem em uma auditoria visual ao vivo que efetivamente renderiza o componente afetado. Como cada task de UI só é auditada visualmente pelos componentes que ela própria toca, o bug ficou latente em todos os outros Dialogs até uma task tocar um Dialog novo o suficiente para o `ux-auditor` reparar na quebra.

**Ação proposta**
Nenhuma ação corretiva necessária além da já tomada — o padrão de "corrigir na origem, não remendar localmente" (já exigido pelo protocolo dos agentes) funcionou como projetado e eliminou a dívida latente de uma vez. Registrado como evidência de que a diretriz de causa raiz está sendo seguida na prática, não como um gap a corrigir.

**Escopo**
Somente este projeto (achado específico de `app/globals.css`; o princípio de auditoria visual ao vivo pegando bugs que os gates automatizados não pegam já está registrado como Padrão 2 do Pipeline Stage 13, acima).

---

## 2026-08-08 — Pipeline Stage Lote 2 (Lacunas funcionais)

**Métricas do período**
- Tasks concluídas: 17/17 (Lote 2 fechado)
- Vetos de UX: 1 (`ux-auditor` reprovou Task 2.3-2.6, tentativa 1) | Segurança: 1 (`security-auditor` reprovou Task 2.3-2.6, tentativa 1, corrigido e aprovado na tentativa 2) | Build/Lint: 0 reprovações formais | Testes: 0 reprovações formais
- Circuit Breakers: 0
- Tasks com ≥1 rodada de correção: 1 de 17 (2.3-2.6, mesma task acumulando os dois vetos) — ~6%
- Convocações de gate com bug de transporte conhecido (auditoria completa rodada, veredito não gravado na 1ª chamada, reconvocada sem contar como reprovação): 1 ocorrência confirmada nesta sessão (Task 2.24-2.26, `ux-auditor`) — evidência em `docs/Backlog.md`, entrada da Task 2.24-2.26 ("1ª chamada rodou auditoria completa com 18 screenshots mas arquivo de veredito não gravou por bug de transporte known")

**Padrão 1 — Reaproveitar dado já derivável em vez de criar mecanismo de rastreio/schema novo**
Três tasks resolveram o requisito lendo/derivando de estado já existente em vez de adicionar coluna, Server Action ou segunda estrutura de rastreio:
- Task 2.31 ("Cancelar divisão"): rastro de origem guardado como estado React efêmero (`origemSplit` em `PropostaLab.tsx`), sem coluna nova de linhagem no schema.
- Task 2.32 (caption de ambiente na Linha de Proposta): função pura `ambientesDaLinha` deriva os nomes a partir de `estadoInicial.ambientes` + `linha.itens` (cadeia item→parede→ambiente já existente nos dados) — sem campo novo, sem Server Action nova.
- Task 2.24-2.26 (elevação com módulos posicionados): reaproveita `itensDoConjunto` já calculado em `AmbientesLab.tsx` em vez de uma segunda derivação, e usa `derivarY`/`larguraDoItem`/`alturaDoItem` já existentes em `lib/engine/parede/*` sem tocar no motor.
Todas as três passaram nos 3 gates (`code-auditor`, `qa-engineer`, `ux-auditor`) na 1ª tentativa.

**Causa estrutural provável**: não é um documento ambíguo — é a maneira como esses contratos de task foram redigidos (provavelmente pelo Maestro nesta sessão), citando explicitamente onde o dado de origem já existe (ex.: "sem schema novo", "reutiliza X já calculado") antes do executor escrever código. O padrão é evidência de que essa prática de contrato funciona, não de uma lacuna a corrigir.

**Ação proposta**: manter a prática de o contrato de execução apontar explicitamente, quando aplicável, de onde o dado-fonte já vem antes do executor escrever qualquer mecanismo novo de persistência — reforçar isso como item padrão de redação de contrato do Maestro, não só para tasks de derivação.

**Escopo**: Candidata a melhoria do framework (item de checklist do `Task-Execution-Contract`: "se o dado já é derivável de estado/relação existente, apontar a origem no contrato antes de autorizar schema/mecanismo novo").

---

**Padrão 2 — Escopo declarado no contrato já estava parcialmente implementado por task anterior**
Duas tasks descobriram, na fase de investigação do executor, que parte dos itens do documento-fonte já estava pronta:
- Task 2.14-2.17: itens 2.16 ("torre ocupa as três faixas") e 2.17 ("módulo inferior assenta sobre o rodapé") já implementados desde a Task 2.18-motor (`faixasCandidatas`) e a Task 0.4 (`derivarY`/invariante A-08) — confirmados por teste existente, sem reimplementação.
- Task 2.24-2.26: item 2.25 (rótulo "Meio" na faixa) já estava pronto desde a Task 2.14-2.17 — confirmado, não retrabalhado.
Nos dois casos o `code-auditor` registrou explicitamente a confirmação de "não retrabalhado" como parte da checagem, e a task foi aprovada na 1ª tentativa mesmo assim.

**Causa estrutural provável**: as tasks-macro deste lote (ex. "2.14-2.17", "2.24-2.26") agrupam vários itens do documento-fonte sob um único número de task, e a numeração de itens (2.16, 2.17, 2.25) foi fixada no discovery antes de saber que tasks anteriores do mesmo lote já cobririam parte deles como efeito colateral do motor. Isso não gerou retrabalho nem custo — o executor investigou antes de implementar — mas indica que o agrupamento original de itens em tasks-macro carregava alguma sobreposição não antecipada.

**Ação proposta**: nenhuma correção necessária — é evidência de que o passo "investigar o que já existe antes de implementar" (regra já vigente para executores) está sendo seguido e evitando retrabalho. Registrado como confirmação, não como gap.

**Escopo**: Somente este projeto (a sobreposição é específica da decomposição de itens 2.x deste Backlog).

---

**Padrão 3 — Falha de gravação de veredito do `ux-auditor` na 1ª chamada, sem contar como reprovação**
1 ocorrência confirmada neste lote: Task 2.24-2.26, `ux-auditor` executou a auditoria visual completa (18 screenshots) mas o arquivo de veredito não foi gravado em disco na 1ª chamada; a reconvocação não contou como tentativa reprovada. Mesmo sintoma já registrado e investigado na proposta `.maestro/proposals/2026-08-04-gates-estouram-maxturns-sem-veredito.md` — este registro só quantifica a incidência real neste lote (1 de 17 tasks, ~6%), não repete a investigação de causa.

**Causa estrutural provável**: já documentada na proposta existente — não repetida aqui.

**Ação proposta**: nenhuma ação nova — a proposta já existe e aguarda decisão humana. Este registro serve de dado adicional de frequência (1 ocorrência/17 tasks) para quem decidir sobre a proposta.

**Escopo**: Candidata a melhoria do framework — já coberta por `.maestro/proposals/2026-08-04-gates-estouram-maxturns-sem-veredito.md`.

---

**Padrão 4 — Regra de posse (`organizacao_id`/`orcamento_id`) aplicada em algumas Server Actions e não em outras do mesmo módulo**
Task 2.3-2.6: `security-auditor` reprovou na 1ª tentativa porque `salvarEstadoAmbiente` (`lib/ambiente/salvar.ts`) inseria `ambiente`/`elemento_continuo` referenciando o `orcamentoId` recebido do client sem antes confirmar que esse `orcamentoId` pertence à organização do usuário autenticado — enquanto `criarAmbiente` (`lib/ambiente/acoes.ts`, mesmo módulo) já fazia exatamente essa checagem (`select id from orcamento where id = orcamentoId and organizacao_id = organizacaoId`). A correção (tentativa 2, aprovada) replicou o mesmo padrão de `criarAmbiente` em `salvarEstadoAmbiente`, com teste de regressão confirmando zero INSERT/UPDATE antes do erro.

**Causa estrutural provável**: a checagem de posse do `orcamentoId` recebido via parâmetro de Server Action existe como padrão em uma função do módulo (`criarAmbiente`), mas não está formalizada como regra obrigatória para toda nova Server Action que recebe `orcamentoId`/`ambienteId`/`paredeId` do client — cada função replica (ou não) o padrão por imitação de código vizinho, não por checklist. A mesma classe de bug (mutação cross-tenant via ID de client não validado) já teria sido pega mais cedo se houvesse uma checagem obrigatória de contrato.

**Ação proposta**: neste projeto, ao redigir contratos de tasks que criam Server Actions com parâmetros de ID recebidos do client (`orcamentoId`, `ambienteId`, `paredeId`, etc.), incluir como critério de aceitação explícito "toda escrita (INSERT/UPDATE/DELETE) que referencia esse ID deve ser precedida de confirmação de posse via `organizacao_id`, no mesmo padrão de funções irmãs do módulo" — não deixar implícito que o executor vai replicar o padrão por conta própria.

**Escopo**: Candidata a melhoria do framework (item de checklist do contrato de `backend-engineer`/`frontend-engineer` para qualquer Server Action que recebe IDs de entidade do client — regra geral de segurança multi-tenant, não peculiar deste projeto).

---

## 2026-08-12 — Pipeline Stage Lote 3 (Precisão do motor)

**Métricas do período**
- Tasks concluídas: 14/14 (Lote 3 fechado por completo — docs/Backlog.md, seção "Lote 3 — Precisão do motor")
- Vetos reais (Decline Payload gerado, reprovação contando como tentativa): UX 0 | Segurança 1 (`security-auditor`, Task 3.13-catalogo-back, tentativa 1 — `.maestro/tmp/Security-Decline-Payload.md`) | Build/Lint 0 | Testes 1 (`qa-engineer`, Task 3.10-3.11-front, tentativa 1 — `.maestro/tmp/QA-Decline-Payload.md`)
- Falhas de gate por bug de transporte conhecido (veredito não gravado na 1ª chamada, reconvocação não contada como reprovação): 3 ocorrências, todas no `code-auditor` — Task 3.1/3.3 (motor) 1×, Task 3.1/3.3 (front) 2× (evidência em docs/Backlog.md, entradas das duas tasks)
- Circuit Breakers: 0
- Tasks com ≥1 rodada real de correção: 2 de 14 (3.10-3.11-front, 3.13-catalogo-back) — ~14%

**Padrão 1 — Bug de transporte de veredito segue recorrente entre Stages**
3 novas ocorrências neste lote (Task 3.1/3.3 motor e 3.1/3.3 front), todas no `code-auditor` — no Lote 2 (Stage anterior) a mesma falha já havia sido registrada 1× no `ux-auditor` (Task 2.24-2.26) e mencionada como recorrente desde a Stage 13. Mesma causa já documentada, não repetida aqui.

**Causa estrutural provável**: já coberta pela proposta existente `.maestro/proposals/2026-08-04-gates-estouram-maxturns-sem-veredito.md`. Este registro só soma dado de frequência: 3 ocorrências em 14 tasks neste lote, todas no `code-auditor` (gate diferente do Lote 2, onde a incidência foi no `ux-auditor`) — indica que a falha não é específica de um gate, é do mecanismo de gravação de veredito em si.

**Ação proposta**: nenhuma ação nova — reforçar a proposta já existente com o dado de que a falha atinge múltiplos gates (`code-auditor` e `ux-auditor` confirmados em Stages diferentes), não só um agente específico.

**Escopo**: Candidata a melhoria do framework — já coberta pela proposta existente.

---

**Padrão 2 — Veto de segurança por sanitização de string ad-hoc (`.trim()`) em vez de remoção explícita de caracteres de controle**
Task 3.13-catalogo-back: `security-auditor` reprovou na 1ª tentativa porque `ehCaminhoRelativoValido` (`lib/produto/acoes.ts`) usava `valor.trim()` para normalizar a URL antes de rejeitar esquemas absolutos — mas `trim()` só remove espaço em branco nas pontas, enquanto o parser WHATWG de URL do navegador remove caracteres de controle C0 (tab, LF, CR, NUL) em **qualquer posição** da string, permitindo bypass do tipo `"htt\tps://evil.com"`. Corrigido na tentativa 2 removendo caracteres de controle Unicode (faixa `U+0000`-`U+0020` e `U+007F`) em qualquer posição da string, não só nas pontas, 10 payloads de bypass testados.

**Causa estrutural provável**: nenhum documento do projeto (Modelo-de-Domínio.md 4.1.1 regra 2, que exige o bloqueio de hotlink) especifica a técnica de sanitização exigida para validação de URL relativa — o executor escolheu `.trim()` como primeira solução plausível para "normalizar antes de validar", que resolve o caso óbvio (espaço nas pontas) mas não o caso que importa (parser do navegador é mais permissivo que o validador do servidor). É uma classe de bug genérica (mismatch entre validação do servidor e parser do consumidor final), não peculiar deste projeto.

**Ação proposta**: registrar como nota de convenção para qualquer campo de URL/caminho aceito de input não confiável neste projeto — a técnica correta é remover caracteres de controle em qualquer posição da string (faixa `U+0000`-`U+0020` e `U+007F`), não só `.trim()`. Proposta de framework também registrada (ver abaixo).

**Escopo**: Candidata a melhoria do framework — ver `.maestro/proposals/2026-08-12-validacao-url-sanitizacao-controle.md`.

---

**Padrão 3 — Lacuna arquitetural em `fitaPorCor` para peças de Elemento Contínuo (Tampo)**
Task 3.5 (motor) introduziu `fitaPorCor` agregando fita por `peca.fita_m` de cada peça individual. Task 3.10-3.11 (motor) introduziu Elemento Contínuo (Tampo), cujo `explodeTampo` calcula a fita agregada no nível do módulo (`mod.fitaM`), deixando `peca.fita_m` sempre `0` para peças de Tampo por desenho. Task 3.12 (investigação de BOM, mesmo lote) encontrou o efeito colateral: `fitaTotalM` soma `mod.fitaM` corretamente, mas `fitaPorCor` (usado para lista de compra discriminada por cor) nunca recebe a parcela de fita de Tampo — todo orçamento com Elemento Contínuo fica sem essa entrada em `fitaPorCor`.

**Causa estrutural provável**: `fitaPorCor` foi desenhado (Task 3.5) assumindo uma única origem de dado — fita por peça — antes de o modelo de Elemento Contínuo (Task 3.10-3.11) introduzir uma segunda origem (fita agregada por módulo). O Modelo-de-Domínio.md não unificou as duas formas de agregação de fita no momento em que a segunda foi criada.

**Ação proposta**: task futura de motor (já registrada em "Gaps de lógica/design" no Backlog) — propagar cor+espessura-final do módulo até o mapa de fita por cor quando `peca.fita_m===0` mas `mod.fitaM>0`. Nenhuma ação de framework — é específico do modelo de domínio deste projeto.

**Escopo**: Somente este projeto.

---

**Padrão 4 — Achados incidentais fora de escopo registrados em vez de corrigidos inline (disciplina confirmada)**
4 ocorrências no lote, mesmo formato: o executor encontra um gap fora do escopo da task corrente e o registra em texto (Backlog ou seção de gaps) em vez de expandir o diff para corrigi-lo — Task 3.2 (cor estática azul em vez de `material.claro/medio/escuro` no plano de corte), Task 3.10-3.11 front (seletor visual de "quais lados engrossar" não implementado), Task 3.1/3.3 front (CSS legado misturado a tokens Tailwind em `EditorItemNucleo.tsx`), Task 3.12 (gap de `fitaPorCor`, Padrão 3 acima). Nenhuma das quatro gerou expansão de escopo ou regressão.

**Causa estrutural provável**: não é uma lacuna — é a regra já vigente de respeito ao domínio/escopo da task funcionando como projetado, mesma conclusão já registrada no Pipeline Stage 13 (Padrão 2) e no Lote 2 (Padrão 2) para o princípio equivalente.

**Ação proposta**: nenhuma — confirmação de disciplina, não gap a corrigir.

**Escopo**: Somente este projeto.

---

## 2026-08-13 — Lote 4 (Cadastros e identidade, RF-31, 13/13 tasks)

**Métricas do período**
- Tasks concluídas: 13 (4.1–4.3, 4.4, 4.5, 4.6–4.7, 4.8–4.9 back/front, 4.10, 4.11 back/front, 4.12–4.13 back/front, 4.15, 4.16-back)
- Vetos de UX: 1 (Task 4.15, `.maestro/tmp/UX-Decline-Payload.md`) | Segurança: 1 bloqueante (Task 4.15, `.maestro/tmp/Security-Decline-Payload.md`) | Build/Lint: 0 | Testes (QA): 0
- Circuit Breakers: 0 (confirmado em `.maestro/state/handoff.md`: "zero Circuit Breaker")
- Tasks que exigiram mais de uma rodada de gate: 1 de 13 (4.15 — security tentativa 2, ux tentativa 2, code tentativa 3 só para reverificar as duas correções, nunca reprovado por si)

**Padrão identificado**

Todos os vetos do lote (1 UX + 1 segurança, os únicos do período) caíram na mesma task, e nenhum caiu em `code-auditor` — que aprovou as 13 tasks e as 3 rodadas de 4.15 na primeira checagem sintática/build sem nenhuma reprovação. A task 4.15 (exclusão de organização, cascade irreversível) foi a única do lote com risco de negócio real (dado destrutivo, elevação de privilégio, LGPD); as outras 12 eram CRUD/RLS por padrão já replicado de tasks anteriores (upload de arquivo com bucket+RLS clonado de precedente, troca de senha reaproveitando rota existente). O achado de segurança de 4.15 (`Security-Decline-Payload.md`) é concreto: `perfil.papel` era gravável por qualquer usuário autenticado via `PATCH /rest/v1/perfil` porque a policy de RLS restringia a *linha* (`id = auth.uid()`) mas nenhuma regra restringia a *coluna* — a checagem de papel-admin da Server Action lia esse mesmo campo, então o gate de autorização de negócio era contornável por escrita direta ao PostgREST antes de a Server Action nunca ser chamada.

Sobre a escalação de `security-auditor` para Opus (confirmada em `.maestro/state/handoff.md` para 4.8-4.9-back e 4.12-4.13-back; recomendada no Backlog para 4.15 por "não é CRUD padrão"): dos 3 casos, 1 (4.8-4.9-back) não encontrou nada digno de registro (verdict: "Achados: Nenhum"), 1 (4.12-4.13-back) encontrou 2 observações reais não bloqueantes (fragilidade de `redirectTo` sem allowlist — CWE-601 — e ausência de reautenticação recente para troca de senha), e 1 (4.15) encontrou o único achado bloqueante do lote. A alegação de "achado real nas 3 escalações" não se sustenta à leitura literal dos vereditos — é 2 de 3 com achado substantivo, não 3 de 3 — mas o sinal de que escalar security-auditor em tasks de autenticação/RLS-sensível/dado-destrutivo tem taxa de acerto maior que zero, contra uma tarefa CRUD comparável (4.8-4.9-back, réplica de padrão já auditado) que não achou nada, permanece.

**Causa estrutural provável**

RLS por linha (`using`/`with check` comparando `id = auth.uid()`) é o único mecanismo de isolamento que os documentos de domínio deste projeto (Modelo-de-Domínio.md, seção de storage/RLS já replicada em 4.8-4.9, 4.11) especificam explicitamente. Nenhum documento (Modelo-de-Domínio.md nem um checklist de segurança) menciona que colunas sensíveis dentro de uma tabela já protegida por RLS de linha (como `perfil.papel`, `perfil.organizacao_id`) precisam também de `REVOKE`/grant por coluna quando a aplicação usa essas colunas como fonte de decisão de autorização. A lacuna só foi fechada porque a Task 4.15 foi a primeira a *ler* `perfil.papel` como gate de uma operação irreversível — nas tasks anteriores (Task 1.9, reabertura de orçamento) o mesmo campo gravável já era usado como gate, mas a consequência de bypass era reversível, então o risco nunca foi crítico o bastante para ativar o veto.

**Ação proposta**

Adicionar ao Modelo-de-Domínio.md (ou a um checklist específico de segurança referenciado por ele) a regra: toda coluna usada como fonte de decisão de autorização (papel, tenant/organização, flags de permissão) deve ter `REVOKE`/`GRANT` por coluna explícito para `authenticated`, independentemente de já existir RLS de linha na tabela — RLS de linha e grant de coluna resolvem problemas ortogonais (quem pode tocar a linha vs. o que pode ser escrito nela). Aplicar retroativamente a `perfil.papel`/`organizacao_id` já foi feito nesta task; verificar se existe alguma outra coluna de decisão de autorização no schema sem esse endurecimento (varredura pontual, não urgente — nenhuma outra tabela deste projeto usa uma coluna própria como gate de operação destrutiva hoje).

**Escopo**
Candidata a melhoria do framework — o padrão "RLS de linha não implica proteção de coluna, e colunas de autorização precisam de grant explícito" é uma checagem genérica de segurança, não peculiar a este projeto. Proposta registrada em `.maestro/proposals/2026-08-13-grant-coluna-para-colunas-de-autorizacao.md`.

---

## 2026-08-14 — Lote 2, incremento da Task 2.27 (lote segue aberto — falta 2.28–2.30)

O Lote 2 já tinha retrospectiva registrada em 2026-08-08 (Padrões 1-4 acima, então em 17/17 sob a numeração antiga do documento-fonte). Esta entrada cobre só o que mudou desde então: a Task 2.27 (mesclada 2026-08-14) e um achado de sincronização de estado encontrado nesta sessão. O lote segue aberto — falta a Task 2.28–2.30 (agrupamento comercial cross-faixa/parede).

**Métricas do período (só o incremento desde 2026-08-08)**
- Tasks concluídas no período: 1 (2.27) — lote em 17/18, falta 2.28–2.30
- Vetos de UX: 0 | Segurança: 0 | Build/Lint: 0 | Testes: 0 — Task 2.27 aprovada de primeira nos 3 gates (`code-auditor`, `qa-engineer` 626/626 testes, `ux-auditor`, checklist §9.5 conforme), sem rodada de correção
- Circuit Breakers: 0

**Padrão — desync sistemático entre "Histórico de execução" (bullet) e tabela-resumo (coluna Tag) do Backlog para a mesma task**

Achado durante sincronização de fechamento do Lote 2 (esta sessão, 2026-08-14): **8 de 18 linhas da tabela-resumo do Lote 2** tinham a Tag da coluna desatualizada enquanto o bullet de "Histórico de execução" já estava correto há dias. A divergência não é isolada em uma única task, é um padrão que atravessou o lote inteiro.

**Linhas afetadas** (8 de 18 da tabela-resumo, todas em `docs/Backlog.md`):
- 2.3–2.6: bullet `✅` desde 2026-08-06 (commit `4c9e45a`), tag da tabela `🟡 LACUNA` até 2026-08-14 (esta sessão)
- 2.7: bullet `✅` desde 2026-08-07, tag `🟡 LACUNA` até 2026-08-14
- 2.8–2.11 (back): bullet `✅` desde 2026-08-06, tag `🟡 LACUNA` até 2026-08-14
- 2.7–2.11 (front): bullet `✅` desde 2026-08-07, tag `🟡 LACUNA` até 2026-08-14
- 2.12 (back): bullet `✅` desde 2026-08-08, tag `🟡 LACUNA` até 2026-08-14
- 2.12 (front): bullet `✅` desde 2026-08-08, tag `🟡 LACUNA` até 2026-08-14
- 2.13: bullet `✅` desde 2026-08-08, tag `🟡 LACUNA` até 2026-08-14
- 2.19–2.23: bullet `✅` desde 2026-08-08 (commit `768c64b`), tag `🟡 LACUNA` até 2026-08-14 (commit `ce42f43`)

A mais antiga dessas divergências datava de **2026-08-06/07/08** — todas foram corrigidas juntas só nesta sessão (2026-08-14), na sincronização de fechamento do lote. Enquanto isso, outros eventos de sincronização do mesmo lote (commits `e80141c`, `a300faa`, `26eaa54`, `cd32843`, `091d0ac`) atualizavam tabela e bullet juntos. Isso caracteriza um padrão real, não um deslize pontual: a tag da tabela-resumo não é atualizada de forma confiável quando uma task é sincronizada — apenas o bullet do histórico recebe atenção consistente.

**Causa estrutural**: a definição do agente `memory-manager` (em `docs/`, linhas do próprio arquivo de instruções que o agente segue, não em Lessons-Learned) exigiu apenas que o bullet de histórico seja atualizado ("Localize a entrada pelo Task ID e troque **apenas o campo Status**"). Nenhuma checklist ou passo explícito pediu para também tocar a linha correspondente na tabela-resumo do stage. O agente atualizou uma estrutura e ignorou a outra, e nenhum gate de qualidade verificou a consistência entre as duas.

**Ação proposta**: modificar a definição do agente `memory-manager` para incluir um checklist explícito: ao sincronizar qualquer task, atualizar **ambas as localizações simultaneamente no mesmo commit** — tanto o bullet do histórico quanto a tag da tabela-resumo. Exemplo concreto: "confira se o número da task (ex. 2.19-2.23) tem bullet E linha de tabela; se um foi atualizado e o outro não, incluir a correção do segundo no mesmo diff antes de fechar".

**Escopo**
Candidata a melhoria do framework — o padrão de sincronização de dois locais independentes para o mesmo estado (bullet de histórico + célula de tabela) é uma propriedade da estrutura de documentação deste projeto, reutilizável como lição para qualquer framework que mantenha redundância de estado em dois formatos diferentes (ex.: dados em texto narrativo + dados em tabela/lista estruturada). Proposta registrada em `.maestro/proposals/2026-08-14-memory-manager-checklist-duas-localizacoes.md`.

---

## 2026-08-16 — Task 5.10-front (Lote 5, nota de processo)

**Achado objetivo**

Durante a execução da Task 5.10-front, o Maestro deletou a branch `feature/5.10-front` antes de confirmar que o executor tinha commitado. `git checkout main && git merge --no-ff` reportou "Already up to date" porque a branch feature nunca teve commit próprio — as mudanças ficaram como working tree não commitado, carregadas junto no checkout. Recuperado sem perda: build/lint/typecheck/testes reconfirmados no estado exato que os 3 gates já tinham auditado (code-auditor, qa-engineer, ux-auditor aprovados 1ª tentativa cada), commit feito direto em `main` (4e4b1e8) com nota explícita no corpo mencionando a recuperação. Nenhum dado se perdeu porque nada tinha sido descartado — mas é evidência de que o protocolo de verificação antes de delete não foi seguido.

**Ação proposta**

Adicionar ao protocolo do Maestro um passo obrigatório de verificação antes de deletar uma branch de feature: confirmar `git log <branch-feature>` contra `git log main` e verificar existência de commits próprios da feature (diferença de commit sha, não só diferença de data) — nunca assumir que "executor reportou pronto" implica "commitou no branch". Se o branch não tiver commits próprios, questionar antes de deletar em vez de prosseguir com merge/delete.

**Escopo**

Candidata a melhoria do framework — item de checklist do Maestro para limpeza de branches (protocolo de segurança contra delete acidental de trabalho, mesmo que recuperável).

