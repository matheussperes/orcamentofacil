> **RESOLVIDO (2026-08-05).** Causa raiz real identificada e corrigida no
> plugin (v3.5.0, já instalado — `installed_plugins.json` confirma
> `gitCommitSha e3f8062`, `lastUpdated 2026-08-05T18:02:06Z`). Não era
> `maxTurns`, não era contexto, não era limite de observabilidade deste
> ambiente — era um bug conhecido e documentado do próprio Claude Code:
> **[anthropics/claude-code#58109](https://github.com/anthropics/claude-code/issues/58109)**
> (verificado via `gh issue view`, issue real, aberta e fechada como
> `not planned`, regressão de #20190). Quando a última mensagem de um
> subagente termina em `tool_use` em vez de texto, o Claude Code descarta
> o texto final e entrega ao chamador só o bloco de texto anterior — que é
> tipicamente narração de meio de investigação, não o veredito. O
> `"Script ran without error. Let's check outputs."` que o `ux-auditor`
> devolveu era exatamente isso: o penúltimo bloco de texto, não uma frase
> cortada por falta de turno.
>
> Isso explica os 3 achados da investigação forense abaixo sem contradizer
> nenhum deles: `status: completed` porque o agente de fato completou (não
> houve erro); sem registro post-mortem porque não houve falha para
> registrar; correlação real com volume de tool calls porque mais
> ferramentas aumenta a chance de a mensagem final terminar em `tool_use`
> em vez de texto puro — as rodadas "enxutas" funcionaram por acidente
> feliz, não pela razão que se supôs.
>
> **Adendo (2026-08-05, mesmo dia, achado separado): o fix não estava em
> vigor neste projeto.** O `code-auditor` cortou de novo na Task 5.10-back
> mesmo com o plugin já em 3.5.1. Causa: este projeto tinha **9 agentes
> ejetados** em `.maestro/agents/` (cópia local, que o Claude Code sempre
> prioriza sobre a do plugin) — todos numa versão anterior ao fix, sem o
> "Protocolo de Veredito em Arquivo" nem a diretriz Ponytail 8
> ("ferramenta antes, resposta depois"). Atualizar o plugin nunca teve
> efeito real aqui porque a cópia local sempre vencia. Sincronizei as 9
> cópias (`backend-engineer`, `code-auditor`, `frontend-engineer`,
> `improvement-agent`, `maestro`, `memory-manager`, `motor-engineer`,
> `security-auditor`, `ux-auditor`) com o plugin 3.5.1 em 2026-08-05.
> `solution-architect.md` ficou de fora — não tem mais equivalente 1:1 no
> plugin (virou 4 agentes especializados) e sincronizar exigiria decisão
> de mapeamento, não uma cópia mecânica. **Lição para o Maestro**: projeto
> com agentes ejetados não recebe fix de plugin automaticamente — checar
> isso deveria fazer parte do "resolvido" antes de fechar uma proposta
> como essa.
>
> **Adendo 2 (mesmo dia, mesma investigação): mesmo com o fix, a Task
> 5.10-back cortou mais 2x — e o padrão de resposta vazia é diferente do
> descrito acima.** Não era mais texto truncado no meio de frase (o achado
> original); era **"Subagent completed but returned no output"**, texto
> zero, nas duas tentativas seguintes já com o agente sincronizado. Um
> teste direto (sessão raiz convocando `code-auditor` sem passar pelo
> Maestro, para isolar variável) reproduziu o mesmo: primeira resposta da
> instância nova, vazia, sem arquivo de veredito gravado. **Mas ao
> retomar essa MESMA instância via `SendMessage`** (pedindo para ela
> relatar o que fez e finalizar) — sem re-rodar build/lint/tipos, sem
> novo contexto — ela respondeu limpo e gravou o veredito de primeira.
> Isso aponta para um mecanismo mais específico que "payload grande
> estoura contexto": parece ser especificamente **a entrega da primeira
> resposta final de uma instância nova de subagente** que se perde,
> independente do agente já ter feito (ou não) todo o trabalho antes
> disso. Mitigação prática confirmada, reproduzível: se um gate volta sem
> veredito e sem texto, **retomar a mesma instância via `SendMessage`**
> em vez de convocar uma instância nova — resolveu de primeira sem
> repetir trabalho, mais barato que "reconvocar enxuto" (mitigação 3 da
> seção anterior) porque não repete tool calls.
>
> `maxTurns` seguiu sendo o suspeito errado até o fim: além de não bater
> com o formato da falha, **[#41143](https://github.com/anthropics/claude-code/issues/41143)**
> (também verificado, real) tem um comentário confirmando um limite interno
> de turnos hardcoded (~20) que ignora o valor do frontmatter — subir
> `code-auditor` de 12 para 22 não teria mudado nada.
>
> **Fix aplicado no plugin** (não neste projeto): protocolo "veredito em
> arquivo" — todo gate grava `.maestro/tmp/verdicts/<task-id>-<gate>.md`
> antes de responder; o Maestro lê o arquivo, nunca a mensagem de retorno.
> 8ª diretriz Ponytail em todos os 17 agentes ("ferramenta antes, resposta
> depois" — nunca terminar a execução com uma chamada de ferramenta). Os 5
> auditores foram para `background: false` (resultado inline, evita a
> notificação assíncrona subir para o topo da árvore em vez de chegar ao
> convocador direto — achado #2 da investigação forense abaixo). Ambiente
> preparado antes do gate (`npm ci` no `/maestro-next`, corrige a mitigação
> nº 1 já proposta aqui). Falha de transporte não conta mais tentativa de
> Circuit Breaker. `code-auditor` ganhou `Write` (faltava, precisa para
> gravar o veredito). Ver também a proibição de autocertificação, tratada em
> [[2026-08-04-maestro-autocertifica-gate]], resolvida junto.
>
> A investigação abaixo (correlação, tabela de tool calls, log quebrado,
> transcript vazio de subagente) permanece como registro histórico — os
> achados são reais, só a interpretação de causa mudou.

---

# Proposta — Gates de auditoria estouram sem emitir veredito (payload alto, mecanismo real ainda não provado)

**Origem**: Investigação pedida pelo operador na sessão de 2026-08-04
(`orcamentofacil`, retomada do Lote 0/Lote 1), depois de 3 ocorrências
seguidas no mesmo dia: `ux-auditor` (Task 0.5b, 2x) e `code-auditor` +
`qa-engineer` (Task 1.1-1.3, 1x cada) terminaram sem `VEREDITO:
APROVADO/REPROVADO`, forçando o Maestro a reconvocar ou (num caso) assumir
o veredito ele mesmo. **Revisada** depois que uma segunda sessão (Opus,
fora deste agente) revisou o diagnóstico original e apontou falhas reais
nele — a versão anterior deste arquivo dizia `maxTurns` era causa raiz
confirmada; não é mais o que este documento afirma.

## O que está confirmado

O padrão empírico é real e reproduzível: toda convocação "gorda" (muita
leitura de screenshot, muito output de build/teste, exercício comportamental
ao vivo) voltou cortada no meio de uma frase, sem veredito. Toda convocação
"enxuta" (reaproveitando evidência já existente, sem recapturar/re-rodar o
que já estava confirmado) fechou com veredito explícito de primeira. Isso
vale para os 3 agentes observados (`ux-auditor`, `code-auditor`,
`qa-engineer`) em 2 tasks diferentes (0.5b, 1.1-1.3, 1.5-1.6).

## O que a primeira versão desta proposta errou

Uma segunda sessão (Opus) revisou o diagnóstico e encontrou 3 problemas
reais, que ficam registrados aqui em vez de escondidos:

1. **Comparação de unidades erradas.** A tabela original cruzava `maxTurns`
   (conta *turnos* — mensagens do assistente, um turno pode ter várias
   tool calls em paralelo) contra contagem de *tool calls*. `code-auditor`
   com teto 12 turnos fez 17 tool calls — não prova estouro de turnos, só
   prova volume alto. A correlação é real; o mecanismo apontado não estava
   provado.
2. **Formato da falha não bate com corte limpo de `maxTurns`.** Um corte
   por teto de turnos deveria produzir um resultado identificável (ex.
   `stop_reason`/subtipo de erro), não uma frase cortada no meio ("Script
   ran without error. Let's check outputs."). Isso tem mais cara de
   esgotamento de contexto/tokens de saída do que de parada por contagem.
3. **Precedente relatado de `maxTurns` não ser confiável no Claude Code**
   (issue externa citada pela outra sessão, não verificada por mim
   diretamente aqui). Se procede, subir o teto pode não mudar nada.

## Verificação feita agora (dado real, não suposição)

Segui a sugestão da outra sessão: conferir `.maestro/logs/agents.jsonl`
(escrito pelo hook `SubagentStop` → `log-agent.mjs`), que deveria registrar
`turnos`, `duracao_ms` e `encerrado_por_limite` de cada agente encerrado.

**Resultado: o log está instrumentado, mas os 3 campos vêm sempre vazios
neste ambiente.** Nas 185 linhas do arquivo inteiro (todo o histórico do
projeto, não só hoje), `turnos` é sempre `null`, `duracao_ms` é sempre
`null`, `encerrado_por_limite` é sempre `false` — sem uma única exceção,
incluindo as 3 ocorrências de estouro desta sessão. `code-auditor`
especificamente nem aparece nominalmente associado a um veredito coerente
nos registros de hoje. Ou seja: **`log-agent.mjs` foi escrito assumindo o
formato de payload do hook `SubagentStop` do Claude Code CLI puro; neste
ambiente (Claude Agent SDK / harness usado aqui), esses campos não chegam
populados** — o script não quebra (`falha aberta por design`), só grava
registros sem a informação que existiria para decidir a questão.

**Conclusão honesta**: não dá para provar `maxTurns` nem descartá-lo com o
dado disponível neste ambiente. A pergunta "foi corte de turnos ou de
contexto/tokens" continua em aberto. Reproduzir com `claude --debug` na
próxima ocorrência (sugestão da outra sessão) é o próximo passo real se
alguém quiser essa resposta definitiva — não fiz isso agora porque exigiria
provocar o mesmo estouro de propósito.

## Mudança proposta (revisada — prioriza o que funciona nas duas hipóteses)

Como o mecanismo exato não está provado, a prioridade vai para correções
que reduzem o problema **independente de ser turno ou contexto**:

1. **`code-auditor`: preparar o ambiente antes de convocar, não deixar o
   gate descobrir na marra.** `npm install` no worktree pertence à camada
   de comando (junto do `git worktree add`), não ao gate. Isso remove
   metade do trabalho dele sozinho. Avaliar também usar `isolation:
   worktree` nativo do frontmatter do Agent tool em vez de worktree manual
   — pode evitar a pasta órfã e o dev server travando arquivo que
   precisaram ser mortos na mão nesta sessão.
2. **Reduzir payload por convocação, não só reagir depois que estoura.**
   Para `ux-auditor`: se já existe evidência válida em disco para a task
   (screenshots capturadas numa rodada anterior, código não mudou desde
   então), apontar isso explicitamente no prompt inicial em vez de deixar
   o agente decidir recapturar. Para `qa-engineer`/`code-auditor`: preferir
   `vitest run --changed` ou escopo por arquivo em vez de despejar output
   de suíte completa no contexto, quando aplicável.
3. **Manter a mitigação reativa que já funcionou 3x nesta sessão**:
   quando um gate estoura, reconvocar com prompt enxuto citando
   explicitamente o que já está confirmado (em vez de pedir para refazer
   do zero). Baixo custo, taxa de sucesso 100% nas vezes em que foi tentado.
4. **`maxTurns`**: não subir cegamente. Só mexer nisso depois de uma
   reprodução com `claude --debug` (ou equivalente) que mostre de fato
   `stop_reason: max_turns` — caso contrário é gastar um ciclo de release
   corrigindo o número errado, como a outra sessão alertou.
5. **Consertar `log-agent.mjs` para este ambiente**, ou aceitar que ele é
   inútil aqui e documentar isso — do jeito que está, ele dá falsa sensação
   de que existe telemetria de causa de parada quando não existe nenhuma.
   Sem isso, todo evento futuro do mesmo tipo vai continuar sem dado real
   para decidir a causa.

## Qual agente/contrato muda

- Camada de comando/orquestração (fora do escopo de um único agente do
  plugin): setup de worktree deveria incluir `npm install` antes de
  qualquer gate rodar.
- `scripts/log-agent.mjs`: campos `turnos`/`duracao_ms`/`encerrado_por_limite`
  não populam neste ambiente — precisa de investigação separada de qual
  campo do hook payload realmente chega aqui (ou aceitar que este
  ambiente não expõe essa informação e remover a falsa promessa).
- `agents/ux-auditor.md`, `agents/qa-engineer.md`, `agents/code-auditor.md`:
  nenhuma mudança de `maxTurns` até haver prova de `stop_reason`. Instrução
  de auto-orçamento ("ao perceber que a investigação está ficando grande,
  sintetize veredito com o que tem em vez de continuar") ainda vale como
  rede de segurança barata, independente da causa.

## Evidência adicional (2026-08-05) — o padrão não é só de gates

A Task 1.7 (Lote 1) trouxe o mesmo sintoma num **executor**
(`motor-engineer`), não só nos 3 gates observados originalmente:

- 1ª convocação: 35 tool calls, resultado vazio.
- 2ª convocação (agente novo, mesmo contrato, sem `SendMessage` disponível
  para retomar a instância anterior): 43 tool calls, resultado vazio de
  novo.
- Ao inspecionar o worktree depois da 2ª tentativa: nenhum commit, mas um
  arquivo solto não versionado (`scratch-repro.ts`) — uma reprodução
  exploratória incompleta (testava espessura errada, 18mm em vez de 6mm).
  Isso é o retrato mais direto do mecanismo até agora: o agente estava em
  modo investigação/tentativa-e-erro ativo, escrevendo scripts de
  reprodução descartáveis, quando foi cortado — reforça a hipótese de
  "muito trabalho exploratório, nenhum turno reservado pra sintetizar",
  mais do que aponta especificamente para `maxTurns` vs. contexto.
- Mais um dado a favor de "reduzir volume por convocação" como mitigação
  independente de mecanismo: uma leitura estática feita por fora (pelo
  Maestro, só `Read`/`Grep`, sem escrever nada) achou um candidato de causa
  raiz mais estrutural do que as duas hipóteses do contrato original em
  poucos minutos — sugerindo que as duas tentativas do `motor-engineer`
  gastaram o orçamento inteiro tentando confirmar hipóteses erradas do
  contrato (reprodução experimental) em vez de ler o código com mais
  direção. Contratos de task que já vêm com hipóteses testáveis por leitura
  de código (não só por reprodução em runtime) podem ser parte da mitigação
  também — não só o tamanho do payload.

## Investigação forense (2026-08-05) — por que não dá pra provar o mecanismo aqui

A pedido do operador, tentei ir além da correlação e extrair sinal real dos
arquivos de saída dos próprios subagentes (grep cirúrgico, sem carregar
transcript inteiro em contexto). Três achados concretos:

1. **Os arquivos de saída dos subagentes de 2º nível estão vazios (0
   bytes).** Todo agente convocado pelo Maestro (`ux-auditor`,
   `code-auditor`, `qa-engineer`, `motor-engineer` — verificado nos IDs de
   task correspondentes a cada convocação desta sessão) tem seu
   `.output` em `AppData/.../tasks/<id>.output` com tamanho zero. Só os
   agentes que EU (sessão raiz) convoco diretamente (o próprio `maestro:maestro`)
   têm transcript persistido. Ou seja: não existe, neste ambiente, um
   registro bruto pós-morte de nenhum dos agentes que realmente travaram —
   a única informação que sobra deles é o resumo final que o harness
   entrega via notificação, nunca a razão estrutural da parada.
2. **Notificações de subagentes de 2º nível não chegam ao seu convocador
   direto — sobem pro topo da árvore.** Vasculhando o transcript do
   `maestro:maestro` de hoje (`a420c10542d11aa53.output`, o único com
   conteúdo real) atrás de metadados brutos (`tool_uses`, `duration_ms`,
   `stop_reason`, `subtype`) associados às tentativas do `motor-engineer`
   que travaram: **não há nenhum**. A frase "41 tool calls" que o Maestro
   escreveu sobre a 3ª tentativa da Task 1.7 é, na verdade, **o texto que a
   sessão raiz mandou pra ele por `SendMessage`** — confirmado comparando
   literalmente as duas strings. Ou seja, o Maestro nunca recebeu a
   notificação bruta do próprio subagente que ele mesmo convocou; quem
   recebe é sempre a sessão raiz (topo da árvore de agentes), e o Maestro só
   sabe o que a sessão raiz decide repassar.
3. **A camada de notificação não distingue "terminou normalmente" de
   "foi cortado no meio".** Toda notificação recebida nesta sessão — mesmo
   as com resultado vazio ou cortado no meio de uma frase — chega com
   `<status>completed</status>`. Não existe um status tipo `failed`,
   `timeout` ou `max_turns_exceeded` observável neste nível. Isso é
   consistente com a leitura da outra sessão (Opus): um corte limpo por
   `maxTurns` deveria, em tese, ser identificável; o fato de aparecer
   uniformemente como "completed" favorece a hipótese de esgotamento de
   contexto/token de saída sobre corte de turno, mas não prova nem uma
   coisa nem outra — só prova que **este nível da stack não expõe o dado**.

**Conclusão honesta**: não é possível provar `maxTurns` nem descartá-lo com
nenhuma fonte de telemetria disponível neste ambiente — não por falta de
tentativa, mas porque três camadas independentes (hook do plugin,
persistência de transcript de subagente, formato da notificação)
independentemente não carregam essa informação até aqui. Resolver isso de
verdade exigiria acesso a uma camada mais baixa (ex. rodar o agente
problemático em primeiro plano com `--debug` fora desta arquitetura de
subagentes em cadeia, o que descaracteriza o próprio cenário que se quer
depurar). Tratar como definitivamente não resolvível com as ferramentas
atuais — as mitigações da seção anterior (reduzir payload, preparar
ambiente antes do gate, reconvocar enxuto) continuam sendo o caminho
prático, independente de nunca sabermos o mecanismo exato.

## Decisão

Aguardando decisão humana. Esta proposta não altera nenhum arquivo do
plugin. Ver também [[2026-08-04-maestro-autocertifica-gate]] — achado
separado e mais grave, encontrado no processo desta mesma investigação.

## Adendo (2026-08-07) — confirmado que o fix de gates não cobre executores; possível regressão do `background: false`

Sessão de 2026-08-07 (`orcamentofacil`, Lote 2): o mesmo padrão de sintoma
(notificação chega com `<status>completed</status>`, mas o texto final vem
truncado/genérico) aconteceu **2x seguidas com um executor**
(`frontend-engineer`, Task 2.3-2.6 (alturas)), não com um gate:

1. 1ª instância: 46 tool calls / 373s, parou no meio da investigação, sem
   escrever nenhum arquivo (`git status` limpo no worktree).
2. 2ª instância (redelegada com `Agent` novo, `SendMessage` indisponível
   nesta sessão): 53 tool calls / 317s, notificação `completed`, texto
   final truncado ("Now let's look at /perfil alturas form..." na 1ª,
   "matches PropostaLab's pattern exactly..." na 2ª) — mas desta vez **com
   trabalho real não commitado no worktree** (`AmbientesLab.tsx` e
   `mapear.ts` modificados, diff coerente e quase completo).

**O que isso confirma**: o fix "veredito em arquivo" (v3.5.0+) só cobre os
5 auditores — eles gravam `.maestro/tmp/verdicts/`, e o Maestro já sabia
não confiar na mensagem de retorno deles. **Executores não têm nenhum
mecanismo equivalente.** A única fonte de verdade confiável quando um
executor "some" no meio é o estado real do worktree (`git status`/
`git diff`/`git log`), nunca a mensagem final nem o `<status>` da
notificação — que segue sempre `completed` mesmo quando o trabalho estava
visivelmente incompleto (achado #3 da investigação original, agora também
confirmado para executor, não só gate).

**Mitigação usada nesta sessão, funcionou bem**: ao invés de redelegar do
zero, o Maestro leu `git status`/`git diff` no worktree, confirmou que o
trabalho em andamento estava coerente com o contrato, e redelegou um
executor apontando explicitamente "há mudança não comitada em X e Y,
continue/finalize" — preservando o trabalho já feito.

**Achado novo, não investigado a fundo**: nesta sessão, tanto a convocação
de um gate (`ux-auditor`, que tem `background: false` no frontmatter) quanto
a de um executor (`frontend-engineer`, sem essa flag) retornaram
identicamente como "Async agent launched successfully... running in
background" pela ferramenta `Agent` deste harness. Se `background: false`
deveria evitar o despacho assíncrono (conforme o racional original do fix,
achado #2 da investigação forense: notificação de 2º nível não chega ao
convocador direto), **isso não está acontecendo neste ambiente/versão** —
merece verificação separada (pode ser que este harness específico do
Maestro sempre despache `Agent` de forma assíncrona, independente do
frontmatter, tornando esse campo do frontmatter sem efeito aqui).

### Recomendação (não aplicada, aguarda decisão)
- Estender o protocolo de "estado em arquivo" para executores: não
  necessariamente um veredito formal, mas uma prática já testada e
  funcional — o Maestro **sempre** confirma `git status`/`git diff` no
  worktree do executor antes de agir sobre qualquer notificação de
  background dele, nunca confiando no texto/`<status>` de retorno. Isso já
  virou prática de fato nesta sessão; formalizar como instrução explícita
  no agente `maestro.md` (Seção "Protocolo de Fechamento de Rodada" ou
  próxima a ela) evitaria redescobrir isso por tentativa e erro em cada
  sessão nova.
- Investigar separadamente se `background: false` tem efeito real neste
  harness — se não tiver, é uma linha morta no frontmatter dos 5 auditores
  desde o fix v3.5.0, e vale documentar isso em vez de manter a suposição.
