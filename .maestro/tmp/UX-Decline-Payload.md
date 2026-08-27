# UX Decline Payload

**Task**: R.5a
**Branch**: feature/R.5a
**Data**: 2026-08-26
**Veredicto**: REPROVADO

## 1. Valor do card "Resumo financeiro" transborda e é ocultado pelo card vizinho no breakpoint mobile

- **Componente**: `components/orcamento/FinanceiroLab.tsx` — função `CampoResumo` (linhas ~64–83), grade em `grid grid-cols-2 gap-md sm:grid-cols-3` (linha ~187)
- **Regra violada**: Checklist de Responsividade do gate ("Nenhuma sobreposição, corte ou transbordamento horizontal em nenhum breakpoint") — Design-System.md §3 `text-valor-destaque` (24px/bold/tabular-nums) aplicado num card `p-lg` sem margem para o valor completo em duas colunas a 390px
- **Breakpoint**: mobile (390px) — `grid-cols-2` faz cada card medir 140px, com 108px de área útil de conteúdo (padding 16px de cada lado). O valor formatado por `formatarMoeda` (`lib/format.ts`) usa NBSP entre "R$" e o número (`toLocaleString("pt-BR", {style: "currency"})`), então a string inteira é um token não quebrável — ela não tem onde dar wrap e transborda 144px de largura de conteúdo num espaço de 108px
- **Esperado**: valor "R$ 2.761,70" inteiramente legível dentro do card, sem sobreposição
- **Encontrado**: o texto transborda o card `PREÇO FINAL` (fundo `accent-subtle`) e o final do valor ("...70") fica coberto pelo card vizinho `CUSTO MATERIAL` (fundo `cinza-0`, opaco, pintado por cima por ordem de DOM) — o dígito final desaparece visualmente. Mesmo padrão em "Lucro final" (R$ 1.219,85 → "...85" oculto)
- **Confirmado via DOM**: `scrollWidth` do `<p>` = 144px, `clientWidth` = 106px, `overflow: visible` no card (não há truncamento por CSS — é sobreposição real por ordem de pintura)
- **Não ocorre** em tablet (834px, `sm:grid-cols-3` já ativo) nem desktop — apenas no breakpoint mobile puro
- **Evidência**:
  - `.maestro/tmp/screenshots/orcamento-financeiro-mobile-preenchido.png` (tela inteira)
  - `.maestro/tmp/screenshots/zoom-financeiro-viewport.png` (crop mostrando "R$ 2.761,70" cortado por baixo de "CUSTO MATERIAL R$ 1.219,86")
  - `.maestro/tmp/screenshots/zoom-financeiro-precisebox.png` (crop do card isolado)

## Capturas realizadas
- `.maestro/tmp/screenshots/orcamento-ambientes-desktop-preenchido.png`
- `.maestro/tmp/screenshots/orcamento-ambientes-tablet-preenchido.png`
- `.maestro/tmp/screenshots/orcamento-ambientes-mobile-preenchido.png`
- `.maestro/tmp/screenshots/orcamento-corte-material-desktop-preenchido.png`
- `.maestro/tmp/screenshots/orcamento-corte-material-tablet-preenchido.png`
- `.maestro/tmp/screenshots/orcamento-corte-material-mobile-preenchido.png`
- `.maestro/tmp/screenshots/orcamento-corte-material-desktop-vazio.png`
- `.maestro/tmp/screenshots/orcamento-financeiro-desktop-preenchido.png`
- `.maestro/tmp/screenshots/orcamento-financeiro-tablet-preenchido.png`
- `.maestro/tmp/screenshots/orcamento-financeiro-mobile-preenchido.png`
- `.maestro/tmp/screenshots/orcamento-proposta-desktop-vazio.png`
- `.maestro/tmp/screenshots/orcamento-proposta-tablet-vazio.png`
- `.maestro/tmp/screenshots/orcamento-proposta-mobile-vazio.png`
- `.maestro/tmp/screenshots/zoom-titulo-secao-tracocota2.png` (traço de cota, tick marks confirmados)
- `.maestro/tmp/screenshots/zoom-financeiro-viewport.png`
- `.maestro/tmp/screenshots/zoom-financeiro-precisebox.png`

## Nota
Tentativa 1 de 2. Verifique também a mesma classe de valor em outros cards de 2 colunas do projeto que usem `formatarMoeda` + `grid-cols-2` em telas estreitas — o `CampoResumo` local não é reusado em outra tela, então o achado fica restrito a esta.
