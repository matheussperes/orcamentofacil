# UX Decline Payload

**Task**: 1.9-front
**Branch**: feature/1.9-front-reabrir-orcamento
**Data**: 2026-08-06
**Veredicto**: REPROVADO

## 1. Dialog "Reabrir orçamento?" renderiza em 2 colunas quebradas no desktop — título/rodapé à esquerda, corpo colado no botão de fechar à direita

- **Componente**: `components/orcamento/PropostaLab.tsx` (linhas 444-465, `DialogContent`/`DialogHeader`/`DialogFooter`) — causa raiz em `components/ui/dialog.tsx` (`DialogContent` usa a classe utilitária Tailwind `grid` sem `grid-cols-1`) colidindo com a regra global não-escopada em `app/globals.css:114-118` (`.grid { grid-template-columns: 1.3fr 1fr; }`, resíduo de CSS legado com variáveis `--legacy-*`)
- **Regra violada**: Design-System §7.11 — "Painel: `bg-cinza-0 rounded-xl shadow-lg p-xl`... Título `text-titulo-secao`. Rodapé com ações: `flex justify-end gap-sm`" (implica conteúdo empilhado em coluna única: título → corpo → rodapé, rodapé com os dois botões lado a lado à direita). O painel observado divide o conteúdo em duas colunas (231px + 178px), com o corpo do texto ("Os valores desta proposta voltam a ser recalculados...") espremido numa coluna estreita colada no botão de fechar (X), e os botões "Cancelar"/"Reabrir orçamento" do rodapé empilhados verticalmente e centralizados em vez de lado a lado alinhados à direita
- **Breakpoint**: Desktop (1440px, viewport ≥ 861px — a regra `@media (max-width: 860px) { .grid { grid-template-columns: 1fr } }` em `globals.css:119-123` faz o mesmo bug desaparecer abaixo de 861px, coincidentemente)
- **Esperado**: Diálogo com título "Reabrir orçamento?" no topo, corpo do texto abaixo ocupando a largura toda do painel, rodapé abaixo do corpo com "Cancelar" e "Reabrir orçamento" lado a lado alinhados à direita (`flex justify-end gap-sm`)
- **Encontrado**: `getComputedStyle` do `[role="dialog"]` confirma `display: grid`, `grid-template-columns: 231.734px 178.266px` (2 colunas reais, não 1). Título+rodapé caem na coluna 1; o parágrafo de corpo cai na coluna 2, ao lado do botão de fechar
- **Evidência**: `.maestro/tmp/screenshots/1.9-front-desktop-dialog-reabrir-QUEBRADO.png` e `.maestro/tmp/screenshots/1.9-front-desktop-dialog-reabrir-crop.png` (zoom)

**Nota de root cause (contexto para o fix, não é achado separado)**: este bug é sistêmico e pré-existente — o mesmo padrão de 2 colunas já aparece no Dialog "Editar cliente" da Task 0.5b, já mergeada (`.maestro/tmp/screenshots/0.5b-desktop-dialog-aberto.png`). A causa raiz não foi introduzida pelo diff de 1.9-front (nem `app/globals.css` nem `components/ui/dialog.tsx` aparecem no `git status` da branch), mas o critério de aceitação desta task ("Clicar no botão abre o Dialog com título/corpo/rodapé exatos da especificação") não está satisfeito visualmente enquanto essa colisão de nome de classe (`.grid` legado global vs. utilitário Tailwind `grid`) não for corrigida. A correção correta é em `app/globals.css` (renomear/escopar a regra legada, ex. `.legacy-grid`), não em `PropostaLab.tsx` — mas o Dialog desta task não pode ser aprovado renderizando assim. Se o frontend-engineer entender que o fix sistêmico é escopo maior que esta task, reportar ao Maestro para decidir entre corrigir aqui ou abrir task dedicada — o gate não pode aprovar visualmente enquanto o bug estiver visível no fluxo desta task.

## Capturas realizadas
- `.maestro/tmp/screenshots/1.9-front-desktop-nao-congelado.png` — aba Proposta, `congeladoEm = null`, sem Alert (estado base, papel admin do harness)
- `.maestro/tmp/screenshots/1.9-front-desktop-congelado-alert-admin.png` — `congeladoEm` forçado em runtime (React state via devtools, sem alteração de código-fonte) para validar o Alert: variante `aviso`, ícone `AlertTriangle`, texto W-C1 "Esta proposta está congelada desde 06/08/2026, 11:30. Suas alterações não mudam os valores até você reabrir o orçamento." e botão "Reabrir orçamento" visível — CONFORME
- `.maestro/tmp/screenshots/1.9-front-desktop-dialog-reabrir-QUEBRADO.png` — Dialog aberto ao clicar no botão — achado acima
- `.maestro/tmp/screenshots/1.9-front-desktop-dialog-reabrir-crop.png` — zoom do mesmo Dialog
