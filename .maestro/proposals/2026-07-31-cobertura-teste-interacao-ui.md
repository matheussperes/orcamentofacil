# Proposta — Cobertura de teste de integração/interação para componentes com estado assíncrono

**Origem**: Retrospectiva da Pipeline Stage 13 (`orcamentofacil`, 2026-07-31), Padrão 2 de `docs/Lessons-Learned.md`.

## Problema observado

Quatro bugs reais de interação/layout na mesma Stage passaram por build/lint/
typecheck/test (Code Auditor) e pela leitura de código do QA Engineer sem serem
detectados — só foram achados quando alguém interagiu de fato com a tela
renderizada, na auditoria visual ao vivo do Maestro/UX Auditor:

- Task 13.1: grid blowout no `<svg>` de `PlacaVisual` (overflow 19px em 375px).
- Task 13.2b: corrida de efeitos (`reactStrictMode`) sobrescrevendo override
  persistido em `localStorage` com valor vazio — só reproduzida ao interagir e
  recarregar de verdade.
- Task 13.2c: overflow horizontal em novas seções (mesma causa-raiz de grid sem
  `min-w-0`).
- Task 13.7b: Select do shadcn dentro de Dialog travando todos os botões da
  página após escolher uma opção (bug real do Radix, `@radix-ui/react-presence`)
  — QA Engineer aprovou de primeira só por leitura de código; só a interação real
  revelou o travamento.

## Causa estrutural

A suíte automatizada do projeto (`vitest run`) cobre quase exclusivamente lógica
pura (`lib/engine/*`, funções de cálculo). Não existe teste de integração de
componente (Testing Library, Playwright ou equivalente) cobrindo interação real
de DOM — abertura/fechamento de Dialog+Select, corrida de efeitos, layout real em
diferentes larguras. Isso empurra 100% da detecção desse tipo de bug para a
auditoria manual ao vivo, que é necessariamente amostral (o auditor testa os
fluxos que lembra de testar, não todas as combinações possíveis).

## Mudança proposta

Para tasks cujo critério de aceitação envolve composição de componentes com
estado assíncrono/interativo (ex.: Dialog contendo Select, drag/handle,
persistência local com efeito de carga em componentes React com
`reactStrictMode`), exigir explicitamente no contrato de execução e nos
critérios de aceitação pelo menos um teste de integração automatizado (não só
teste unitário de função pura) cobrindo o fluxo de interação, além da auditoria
visual ao vivo.

Alternativa, se o time decidir que cobertura automatizada de interação não vale o
custo para o framework: documentar essa decisão explicitamente no contrato do
`qa-engineer`/`ux-auditor`, deixando claro que bugs desse tipo (estado
assíncrono, interação de componente) ficam sob responsabilidade exclusiva da
auditoria manual — em vez de ficar implícito, como está hoje.

## Qual agente/contrato muda

- `qa-engineer` (persona/contrato): critério explícito sobre quando exigir teste
  de integração vs. quando aceitar cobertura só por leitura de código.
- `ux-auditor` / `.maestro/pipelines/03-quality.md`: documentar o papel da
  auditoria visual ao vivo como a única linha de defesa para esse tipo de bug,
  se a decisão for não investir em testes de integração automatizados.

## Decisão

Aguardando decisão humana. Esta proposta não altera nenhum arquivo do plugin.
