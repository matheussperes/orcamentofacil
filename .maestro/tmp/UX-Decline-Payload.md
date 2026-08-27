# UX Decline Payload

**Task**: R.5a
**Branch**: feature/R.5a (commit f111c78)
**Data**: 2026-08-26
**Veredicto**: REPROVADO

## 1. Regressão mobile: legenda e barra de aproveitamento invisíveis no "Plano de corte"

- **Componente**: `components/orcamento/corte-material/SecaoPlanoDeCorte.tsx:73`
- **Regra violada**: `docs/Screen-Composition.md` — Responsividade: "Nenhuma
  sobreposição, corte ou transbordamento horizontal em nenhum breakpoint" /
  "Conteúdo permanece legível sem zoom". Também
  `components/shell/Shell.tsx:39` (`overflow-x-hidden` no `<main>`) — a
  combinação das duas torna o conteúdo **irrecuperável**, não apenas rolável.
- **Breakpoint**: mobile (390px), reproduz em qualquer largura abaixo de
  ~426px de conteúdo útil
- **Esperado**: a coluna com a legenda "N chapa(s) · X m² consumidos" e o
  `Progress` de aproveitamento permanece inteiramente visível (ou some para
  uma segunda linha) em todos os breakpoints — nenhum pixel de conteúdo
  cortado sem forma de acesso.
- **Encontrado**: a correção do achado 1 do art-director trocou
  `flex flex-wrap` por `grid grid-cols-[auto_1fr]`, sem variante responsiva.
  Em 390px, medido via DOM: a segunda coluna (`auto`, canvas fixo + `1fr`)
  se estende até `x=426.6px`, **36.6px além do viewport** (390px). Como o
  `<main>` do Shell usa `overflow-x-hidden` (não `overflow-x-auto`), esse
  conteúdo não vira scroll — ele é **cortado e permanentemente inacessível**.
  Visualmente: o texto "1 chapa(s) · 1.35 m² consumidos" é truncado em
  "…consu" e a barra de progresso (vermelha/verde) é cortada antes do fim.
  Reproduz nas 3 chapas da aba (MDF Branco TX 6mm, 15mm, Louro Freijó 18mm).
  Em tablet (834px) e desktop (1440px) o layout está correto — a regressão é
  exclusiva de mobile.
- **Evidência**:
  `.maestro/tmp/screenshots/orcamento-corte-material-mobile-preenchido-v3.png`
- **Correção mínima**: dar ao grid uma variante que colapse para 1 coluna
  abaixo do breakpoint em que a coluna `1fr` cabe com conteúdo legível —
  `grid grid-cols-1 gap-md sm:grid-cols-[auto_1fr] sm:gap-lg` (mesmo padrão
  responsivo já usado em `SecaoParedeEAlturasPerfil.tsx`,
  `grid-cols-1 md:grid-cols-2`). Não reverter a correção do achado 1 nos
  breakpoints tablet/desktop, onde ela está correta.

---

## Capturas realizadas

**Novas (Playwright, `/dev/preview/orcamento`, 14 arquivos + evidência):**
`orcamento-{ambientes,corte-material,financeiro,proposta}-{mobile,tablet,desktop}-preenchido-v3.png`,
`orcamento-{ambientes,corte-material}-desktop-preenchido-v3-dark.png` (idêntico
ao claro — confirmado que não há dark mode alternável nesta fase,
`docs/Design-System.md` §2.9).

## Tentativa

**Tentativa 3 de 2** — Circuit Breaker acionado: esta é a terceira
submissão desta tela ainda com reprovação (tentativa 1 do art-director +
esta). Recomendo ao Maestro tratar como escalonamento.
