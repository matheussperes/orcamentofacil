# UX Decline Payload

**Task**: R.5b
**Branch**: feature/R.5b
**Data**: 2026-08-27
**Veredicto**: REPROVADO (tentativa 2 de 2 — próxima falha aciona o Circuit Breaker)

## 1. Coluna esquerda `lg:sticky` não gruda de verdade — DOMINA some da tela ao rolar

- **Componente**: `app/modulo/EditorItemNucleo.tsx` (linha 90, `lg:sticky lg:top-xl lg:self-start`)
- **Causa raiz**: `components/shell/Shell.tsx` linha 39 — `<main className="flex-1 overflow-x-hidden p-xl">`. A classe `overflow-x-hidden` sem um `overflow-y` explícito faz o navegador computar `overflow-y: auto` automaticamente (regra CSS de par overflow-x/overflow-y), transformando o `<main>` num scroll container. Como o conteúdo do `<main>` nunca excede sua própria altura (ele cresce para caber o filho), esse `<main>` nunca rola de verdade — mas por ser a âncora de "nearest scrolling ancestor", ele vira o contexto de referência do `position: sticky` da coluna esquerda. Quem realmente rola é o `<html>`. Resultado: o `sticky` não tem contra o que grudar e a coluna esquerda simplesmente sobe junto com a página, saindo inteira do viewport.
- **Breakpoint**: desktop (1440px) — verificado com scroll real (`mouse.wheel`), não só `window.scrollTo`
- **Esperado**: Screen-Composition.md / contrato R.5b — "o DOMINA (etapa aberta do accordion) acompanha o scroll da coluna direita, sem canto morto"
- **Encontrado**: ao rolar até o fim da coluna direita (Plano de corte / rodapé), a coluna esquerda inteira desaparece do viewport — pior que o canto morto original reportado na tentativa 1 (que ao menos deixava a coluna visível, só com espaço vazio abaixo dela)
- **Evidência**: `.maestro/tmp/screenshots/editoritem-desktop-preenchido-r5b.png` (topo, coluna esquerda visível) vs `.maestro/tmp/screenshots/editoritem-desktop-wheelscroll-r5b.png` (rolado com scroll de mouse real, coluna esquerda ausente)

## 2. KPI "Preço final" transborda e é encoberto pelo card "Custo direto" no mobile

- **Componente**: `app/modulo/EditorItemNucleoResultadoPaineis.tsx` linha 27-29 (card `Preço final`, `text-valor-destaque-lg`)
- **Regra violada**: Responsividade — "Nenhuma sobreposição, corte ou transbordamento horizontal em nenhum breakpoint" (checklist ux-auditor); comportamento correto já existe no mesmo grid em tablet/desktop
- **Breakpoint**: mobile (390px) — não ocorre em tablet (834px) nem desktop
- **Esperado**: valor completo "R$ 1.519,10" legível dentro do card, sem sobreposição com o card vizinho
- **Encontrado**: o texto "R$ 1.519,10" (32px, `text-valor-destaque-lg`) excede a largura do card `grid-cols-2 gap-sm` e é visualmente cortado/encoberto pelo card "Custo direto" ao lado — o dígito final "10" fica ilegível
- **Evidência**: `.maestro/tmp/screenshots/editoritem-mobile-kpi-crop-r5b.png`

## Capturas realizadas
- `.maestro/tmp/screenshots/editoritem-desktop-preenchido-r5b.png`
- `.maestro/tmp/screenshots/editoritem-tablet-preenchido-r5b.png`
- `.maestro/tmp/screenshots/editoritem-mobile-preenchido-r5b.png`
- `.maestro/tmp/screenshots/editoritem-desktop-scrolled-bottom-r5b.png`
- `.maestro/tmp/screenshots/editoritem-desktop-wheelscroll-r5b.png`
- `.maestro/tmp/screenshots/editoritem-mobile-zoom-kpi-r5b.png`
- `.maestro/tmp/screenshots/editoritem-mobile-kpi-crop-r5b.png`
