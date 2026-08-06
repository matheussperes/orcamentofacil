# Proposta — `maestro` (orquestrador) precisa de `SendMessage` no frontmatter oficial do plugin

**Origem**: sessão de 2026-08-06 (`orcamentofacil`, Lote 1). Ver
[[2026-08-04-gates-estouram-maxturns-sem-veredito]] para o histórico completo
do problema que motivou isto.

## Contexto

Mesmo depois do fix "veredito em arquivo" (protocolo 3.5.0/3.5.1), gates
ainda voltam ocasionalmente com resposta **100% vazia** (não truncada — vazia)
na primeira entrega de uma instância nova de subagente. A mitigação que
funcionou sempre que testada nesta sessão: retomar a **mesma instância** via
`SendMessage` (pedindo o resultado de novo, sem repetir nenhum tool call) em
vez de convocar uma instância nova.

O problema: `SendMessage` não fazia parte do `tools:` do agente `maestro` no
plugin. Só a sessão raiz (operador) tinha acesso a essa ferramenta. Toda vez
que um gate travava vazio, o Maestro tinha que parar, escalar ao operador, e
esperar a sessão raiz retomar a instância manualmente — cada ocorrência virava
uma parada completa da esteira, não uma autorrecuperação.

## Mudança aplicada localmente (2026-08-06)

No arquivo ejetado deste projeto (`.maestro/agents/maestro.md`, agora
removido — ver decisão abaixo):

1. Adicionado `SendMessage` a `tools:` no frontmatter.
2. Nova seção "Retomar antes de reconvocar do zero", instruindo: quando um
   gate voltar sem arquivo de veredito, tentar `SendMessage` para a mesma
   instância antes de tratar como falha — só escalar como `gate_indisponivel`
   se a retomada também vier vazia.

Isso resolveu a autorrecuperação nesta sessão sem precisar de intervenção da
sessão raiz.

## Decisão do operador (2026-08-06)

O operador pediu para apagar `.maestro/agents/` inteira (os 10 arquivos
ejetados), incluindo este `maestro.md` customizado — decisão consciente,
avisada antes da execução. A partir de agora o projeto usa o `maestro.md` do
plugin diretamente (sem `SendMessage`, sem a seção de autorrecuperação), até
que o plugin oficial incorpore esta mudança ou o operador decida reejetar.

## Mudança proposta pro plugin oficial

- Adicionar `SendMessage` ao `tools:` do agente `maestro` em
  `plugincode/maestro/agents/maestro.md`.
- Incorporar a seção "Retomar antes de reconvocar do zero" na Parte 4b (gates
  sem veredito), como passo obrigatório antes de `gate_indisponivel`.

Sem isso, todo projeto que usa o `maestro` puro do plugin (sem ejetar) segue
dependendo da sessão raiz pra destravar gates que voltam vazios — o mesmo
gargalo que esta proposta resolveu localmente e que se perde ao apagar o
ejetado.

## Status

Aguardando decisão humana sobre incorporar no plugin. Não é urgente re-ejetar
localmente — a esteira funciona sem isso, só volta a depender da sessão raiz
como intermediária nos casos raros de resposta vazia.
