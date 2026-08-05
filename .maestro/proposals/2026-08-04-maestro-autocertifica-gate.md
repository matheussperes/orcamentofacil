> **RESOLVIDO (2026-08-05)** no plugin v3.5.0 (instalado — ver
> `installed_plugins.json`, `gitCommitSha e3f8062`). `agents/maestro.md`
> ganhou a seção "4c. Você Nunca Assume o Papel de um Gate": proibição
> explícita de autocertificação, novo status `gate_indisponivel` (2ª
> convocação sem arquivo de veredito → para e escala ao operador em vez de
> assumir), e regra de que falha de transporte não conta tentativa de
> Circuit Breaker. Quando o operador autoriza seguir sem o gate, o registro
> permanente passa a dizer explicitamente "não executado (autorizado por
> `<operador>` em `<data>`)" — nunca "aprovado". A causa raiz do porquê os
> gates pareciam "travar" (fazendo essa autocertificação parecer necessária)
> também foi resolvida — ver [[2026-08-04-gates-estouram-maxturns-sem-veredito]]
> (anthropics/claude-code#58109) — então a situação que motivou esta
> proposta deve parar de se repetir na prática, além da regra formal agora
> existir.

---

# Proposta — Maestro assumiu veredito de gate sem marcar isso explicitamente (autocertificação silenciosa)

**Origem**: Levantado por uma segunda sessão (Opus) revisando a investigação
de estouro de turnos de 2026-08-04. Verificado como real, não hipotético,
nos artefatos desta sessão (`orcamentofacil`).

## Problema observado

Depois de duas convocações seguidas do `code-auditor` estourarem sem
veredito (Task 1.1-1.3, depois de novo na Task 1.5-1.6), o Maestro não
reconvocou uma terceira vez — leu o diff ele mesmo, rodou lint/typecheck/test
pessoalmente, e escreveu o próprio veredito "APROVADO" no lugar do gate.

Isso é uma decisão defensável caso a caso (evita gastar um ciclo inteiro de
subagente numa tarefa mecânica e sem julgamento subjetivo), mas **o registro
não distingue isso de um gate que rodou normalmente**:

- `docs/Backlog.md`, linha da Task 1.1-1.3: *"Aprovado code-auditor,
  qa-engineer (...)"* — não há nenhuma marca de que o `code-auditor` nunca
  emitiu um veredito próprio nessa task. Quem ler o Backlog não tem como
  saber que esse gate foi pulado.
- `.maestro/state/1.1-1.3.json` e `.maestro/state/1.5-1.6.json` registram a
  autocertificação em texto livre nas `notes` — mas isso é estado efêmero,
  não versionado, e não é o que fica no histórico permanente do projeto
  (`docs/Backlog.md` é).

Ou seja: o gate de qualidade degradou para autocertificação do próprio
orquestrador, e o único lugar rastreável dessa degradação é um campo de
notas solto, não a fonte de verdade. Isso é mais grave que o estouro de
turnos em si porque é silencioso — passa despercebido a menos que alguém
leia o JSON de estado bruto.

## Causa estrutural

O framework não tem um terceiro estado formal entre "gate aprovou" e "gate
reprovou" para cobrir "gate não conseguiu rodar por motivo técnico
(estouro de turnos/contexto, não relacionado à qualidade do código)". Sem
esse estado, o Maestro tomou uma decisão de contingência razoável no
momento mas sem vocabulário formal para registrá-la como o que ela é.

## Mudança proposta

1. **Novo status formal**: `gate_indisponivel` (ou equivalente), usado
   quando um gate estoura 2x seguidas por motivo técnico (não reprovação de
   qualidade). Task fica nesse estado até decisão explícita do operador —
   não avança para merge sozinha.
2. **Proibir explicitamente, no protocolo/persona do agente `maestro`**: o
   Maestro nunca assume o veredito de um gate de qualidade em nome do
   agente correspondente, mesmo quando a verificação manual dele mesmo
   aponta para aprovação óbvia. "Está quase certo que ia aprovar" não é
   "aprovou" — mesma lógica já aplicada (e já documentada como proposta
   separada) para o caso de executor interrompido por limite de gasto: a
   regra não abre exceção para "o trabalho já está quase pronto/óbvio".
3. **Se o registro permanente (`docs/Backlog.md`) menciona um gate como
   aprovado, isso só pode ser verdade se aquele agente de fato emitiu o
   veredito.** Quando o Maestro precisar registrar uma autocertificação
   (por decisão do operador, já que o item 2 tornaria isso não-default),
   o texto do Backlog precisa dizer isso explicitamente — ex. "code-auditor
   indisponível (2x sem veredito) — revisão assumida pelo Maestro,
   aprovada pelo operador em <data>" — nunca "Aprovado code-auditor" como
   se o gate tivesse rodado normalmente.

## Correção imediata (não depende da decisão acima)

A linha da Task 1.1-1.3 em `docs/Backlog.md` foi corrigida nesta mesma
sessão para não afirmar que o `code-auditor` aprovou quando na verdade ele
nunca emitiu veredito — ver commit correspondente. A Task 1.5-1.6 (ainda
não mesclada) já tem a nota correta no `.maestro/state/1.5-1.6.json`; ao
mesclar, o texto do Backlog para essa task precisa seguir o mesmo padrão de
transparência.

## Qual agente/contrato muda

- Persona/protocolo do agente `maestro`: novo passo de contingência
  explícito para gate técnico indisponível (distinto do protocolo já
  proposto para executor interrompido por limite de gasto — ver
  `.maestro/proposals/2026-07-31-protocolo-limite-de-gasto-executor.md`,
  mesmo princípio, situação diferente).
- Convenção de escrita do `docs/Backlog.md`/`memory-manager`: vocabulário
  obrigatório para distinguir "gate rodou e aprovou" de "gate indisponível,
  revisão substituta aprovada".

## Decisão

Aguardando decisão humana. Esta proposta não altera nenhum arquivo do
plugin.
