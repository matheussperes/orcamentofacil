# UX Decline Payload

**Gerado por**: UX Auditor
**Data**: 2026-07-22
**Versão do Design-System**: v2 (Tailwind + shadcn/ui)

---

## Informações Críticas

### Target Component
- **Caminho do arquivo**: `app/modulo/SecaoHeader.tsx`
- **Commit/Branch**: `feature/7.1-accordion-shell` (commit `001b6be`)

### Rule Violated
- **Seção do Design-System**: Seção 6.4 — Accordion de seção do editor
- **Regra específica**: "Header — estado 'aberta': texto `titulo-card` (16px/600) `--cinza-900`" e "Header — estado 'colapsada': texto `corpo` (14px/500) `--cinza-600`". No Design-System v2 (Tailwind), o peso da fonte não vem embutido no utilitário `text-titulo-card`/`text-corpo` (que só define tamanho+line-height) — precisa ser adicionado explicitamente via `font-semibold`/`font-medium`.

### Detalhes do Erro

#### Expected (Esperado)
```
Header "aberta" (ex: "Caixa"): text-titulo-card (16px) + font-semibold (600) + text-cinza-900.
Header "colapsada" (ex: "Divisões"): text-corpo (14px) + font-medium (500) + text-cinza-600.
```

#### Found (Encontrado)
```
Header "aberta" ("Caixa", <h2 class="mb-4 flex cursor-default items-center justify-between
border-b border-cinza-200 pb-3 text-titulo-card text-cinza-900">):
  getComputedStyle → fontSize: 16px ✅, fontWeight: 400 ❌ (deveria ser 600/semibold),
  color: rgb(15,23,42) ✅ (#0F172A, cinza-900 correto).
  Falta a classe `font-semibold`.

Header "colapsada" ("Divisões", <span class="text-cinza-600">):
  getComputedStyle → fontSize: 16px ❌ (deveria ser 14px, text-corpo),
  fontWeight: 400 ❌ (deveria ser 500/medium), color: rgb(71,85,105) ✅ (#475569, cinza-600 correto).
  Faltam as classes `text-corpo` e `font-medium` — só `text-cinza-600` foi aplicada.

Cor/borda/cursor: corretos nos dois estados. Badge "editar" (text-accent, text-legenda 12px,
ícone Pencil): correto. Gap entre os 5 cards: 8px (gap-sm), correto.
```

#### Evidence
- **Screenshot**: não disponível — a ferramenta de captura de tela (`computer screenshot`) apresentou timeout persistente neste ambiente de validação (falha de infraestrutura do Browser pane, não do produto). Evidência substituta: valores de `getComputedStyle` extraídos ao vivo via `javascript_exec` no Browser pane, em `http://localhost:3000/modulo`, citados acima com className exato de cada elemento.
- **Coordenadas**: N/A (evidência por computed style, não por screenshot)
- **Resolved (sim/não)**: Não

---

## Protocolo de Resposta

### Tentativa 1
- **Status**: ⏳ Aguardando correção
- **Responsável**: Frontend Engineer
- **Ação esperada**: Adicionar `font-semibold` ao `<h2>` do estado "aberta" em `SecaoHeader.tsx`; adicionar `text-corpo font-medium` ao `<span>` do estado "colapsada" (substituindo/complementando a classe `text-cinza-600` isolada). Verificar se o mesmo padrão de peso/tamanho ausente se repete em outro lugar do componente antes de reportar pronto novamente.

---

## Campos Obrigatórios (Checklist)
- [x] Caminho do arquivo preenchido
- [x] Regra do Design-System identificada
- [x] Expected vs Found claramente diferenciados
- [ ] Screenshot anexado — indisponível nesta rodada (ferramenta com falha), substituído por evidência de computed style
- [x] Status da resolução atualizado

## Notas Adicionais
```
Build/lint/typecheck/test (Code Auditor) já aprovados nesta branch — a divergência é
puramente visual/tipográfica, não afeta compilação nem comportamento. O restante da
Task 7.1 (Stepper reutilizado, gap entre cards, badge "editar", cores/bordas/cursor)
está correto e não precisa ser retrabalhado — escopo da correção é estritamente as
duas classes de peso/tamanho de fonte faltando no cabeçalho da seção.
```
