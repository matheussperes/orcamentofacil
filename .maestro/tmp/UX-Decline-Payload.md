# UX Decline Payload

**Task**: R.5e
**Branch**: feature/R.5e
**Data**: 2026-08-28
**Veredicto**: REPROVADO

## 1. Botão "Imprimir / Salvar em PDF" transborda a própria caixa no mobile

- **Componente**: `app/proposta/[id]/pdf/proposta-pdf.css` (`.proposta-pdf__botao-imprimir`)
- **Regra violada**: Responsividade — "nenhuma sobreposição, corte ou
  transbordamento... em nenhum breakpoint"; a régua declarada no próprio
  Screen-Composition.md ("linha imagem+texto lado a lado... fica apertado
  demais... empilha em vez de deixar... ilegível, nunca overflow") mostra
  que o cuidado com overflow no mobile foi intencional em outros blocos,
  mas não neste botão.
- **Breakpoint**: mobile (375px, abaixo de `tablet` 768px)
- **Esperado**: texto do botão em uma única linha (`white-space: nowrap`)
  ou altura do botão (`height: 36px`) capaz de acomodar a quebra real —
  o próprio Design System usa altura fixa de 36px para botões do sistema,
  então a saída correta é impedir a quebra, não deixar o texto vazar.
- **Encontrado**: o texto "Imprimir / Salvar em PDF" quebra em duas
  linhas dentro de uma caixa com `height: 36px` fixo — o texto vaza
  verticalmente para fora do pill laranja, cortando o contorno
  arredondado do botão.
- **Evidência**: `.maestro/tmp/screenshots/proposta-pdf-mobile-botao-zoom.png`
  (e visível no contexto completo em `proposta-pdf-mobile-preenchido.png`)

## 2. Rótulo "Total da proposta" quebra e colide com o valor no mobile

- **Componente**: `app/proposta/[id]/pdf/proposta-pdf.css` (`.proposta-pdf__total`,
  `.proposta-pdf__total-rotulo`) — renderizado por
  `components/proposta-pdf/PropostaPdfResumo.tsx`
- **Regra violada**: Hierarquia "DOMINA" (Screen-Composition.md, "Proposta
  impressa" — Hierarquia, item 1: total final é o único elemento que deve
  ler como decisão fechada) e Responsividade (texto permanece legível sem
  colisão visual). `display: flex; justify-content: space-between` sem
  `white-space: nowrap` no rótulo faz o texto do rótulo quebrar dentro do
  espaço espremido pelo valor, em vez de os dois empilharem como já
  acontece com os outros campos do Resumo (`.proposta-pdf__resumo-campo`
  já empilha rótulo/valor em coluna).
- **Breakpoint**: mobile (375px)
- **Esperado**: no mobile, `.proposta-pdf__total` empilha rótulo acima do
  valor (mesmo padrão já aplicado a `.proposta-pdf__resumo-campo` na regra
  `@media (max-width: 767px)`), ou o rótulo recebe `white-space: nowrap`
  com o valor permitido a encolher — nunca o rótulo quebrando ao meio da
  frase ao lado do número.
- **Encontrado**: "Total da" quebra para a primeira linha, "proposta"
  cai para a segunda linha ao lado esquerdo de "R$ 14.100,00" — o número
  que deveria ser a peça de maior peso da tela (`text-valor-destaque-lg`)
  fica colado visualmente a uma palavra órfã do rótulo, prejudicando a
  leitura do total no exato breakpoint em que o cliente mais provavelmente
  abre o link no celular antes de decidir imprimir.
- **Evidência**: `.maestro/tmp/screenshots/proposta-pdf-mobile-total-zoom.png`
  (e visível no contexto completo em `proposta-pdf-mobile-preenchido.png`)

## Capturas realizadas
- `.maestro/tmp/screenshots/proposta-pdf-desktop-preenchido.png`
- `.maestro/tmp/screenshots/proposta-pdf-desktop-preenchido-dark.png` (produto sem dark mode implementado — captura idêntica à claro, registrado como observação, não achado)
- `.maestro/tmp/screenshots/proposta-pdf-tablet-preenchido.png`
- `.maestro/tmp/screenshots/proposta-pdf-mobile-preenchido.png`
- `.maestro/tmp/screenshots/proposta-pdf-desktop-vazio.png`
- `.maestro/tmp/screenshots/proposta-pdf-print-preview.png`
- `.maestro/tmp/screenshots/proposta-pdf-print-a4.pdf`
- `.maestro/tmp/screenshots/proposta-pdf-desktop-citacao.png`
- `.maestro/tmp/screenshots/proposta-pdf-desktop-total.png`
- `.maestro/tmp/screenshots/proposta-pdf-desktop-traco-cliente.png`
- `.maestro/tmp/screenshots/proposta-pdf-desktop-traco-zoom4x.png`
- `.maestro/tmp/screenshots/proposta-pdf-desktop-traco-zoom-full.png`
- `.maestro/tmp/screenshots/proposta-pdf-mobile-botao-zoom.png`
- `.maestro/tmp/screenshots/proposta-pdf-mobile-total-zoom.png`
