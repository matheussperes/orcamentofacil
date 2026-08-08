# UX Decline Payload

**Task**: 2.3-2.6
**Branch**: feature/2.3-2.6
**Data**: 2026-08-06
**Veredicto**: REPROVADO

## 1. Seletor de ambiente/parede não renderiza o estilo "Tabs underline" documentado — herda CSS legado global de `<button>`

- **Componente**: `components/ambientes/SeletorLista.tsx` linhas 94-109 (o `<button>` nativo que renderiza cada item do seletor de ambiente/parede)
- **Causa raiz**: `app/globals.css` linhas 147-158 define uma regra genérica `button { background: var(--legacy-panel-2); border: 1px solid var(--legacy-border); border-radius: 8px; padding: 8px 12px; }` e `button:hover { border-color: var(--legacy-accent); }` sem escopo — qualquer `<button>` nativo sem classe própria de override herda esse estilo. O `<button>` de `SeletorLista.tsx` só define `border-b-2 border-accent`/`border-b-2 border-transparent` + cor de texto, e não neutraliza (`bg-transparent`, `border-0`/`p-0`, `rounded-none`) as propriedades do seletor global — então a regra legada vence nas propriedades que o componente não sobrescreve (background, border lateral, radius, padding).
- **Regra violada**: Design-System §7.8 (Tabs underline: "trigger inativo `text-corpo font-medium text-cinza-500 border-b-2 border-transparent`; trigger ativo `text-accent border-b-2 border-accent`"), o próprio padrão que o comentário do arquivo (linhas 33-35) declara estar seguindo. Também viola §15.4 item 12 ("Nenhum componente introduz cor, raio, sombra ou espaçamento fora dos tokens das Seções 2–5") — o CSS legado usa hex hardcoded fora do sistema de tokens Tailwind.
- **Breakpoint**: todos (desktop, tablet 768, mobile 480) — é uma colisão de CSS global, não um problema responsivo
- **Esperado**: item do seletor com apenas `border-b-2` (sublinhado) — transparente quando inativo, `accent` quando ativo; sem fundo, sem borda lateral, sem padding em caixa, sem raio (visual "Tabs", igual às abas do orçamento acima)
- **Encontrado**: cada item ("Ambiente 1", "Cozinha", "Parede 1", "Parede 2") renderiza como uma pílula com borda em todo o contorno, fundo `cinza-50`, `border-radius: 8px`, `padding: 8px 12px`. O hover reforça a borda completa em accent (regra `button:hover` legada), em vez de sublinhar.
- **Evidência**: `.maestro/tmp/screenshots/2.3-2.6-02-multi-ambiente-parede.png` e `.maestro/tmp/screenshots/2.3-2.6-05-hover-cozinha-nao-selecionada.png`
- **Correção sugerida** (não vinculante — decisão do frontend-engineer): adicionar classes que neutralizem a regra `button {}` legada no `<button>` de `SeletorLista.tsx` (ex.: `bg-transparent border-0 border-b-2 rounded-none p-0`), preservando só `border-b-2` + cor de texto conforme §7.8.

## Capturas realizadas
- `.maestro/tmp/screenshots/2.3-2.6-01-inicial.png`
- `.maestro/tmp/screenshots/2.3-2.6-02-multi-ambiente-parede.png`
- `.maestro/tmp/screenshots/2.3-2.6-03-parede2-largura1800.png`
- `.maestro/tmp/screenshots/2.3-2.6-04-volta-parede1.png`
- `.maestro/tmp/screenshots/2.3-2.6-05-hover-cozinha-nao-selecionada.png`
- `.maestro/tmp/screenshots/2.3-2.6-06-tablet-768.png`
- `.maestro/tmp/screenshots/2.3-2.6-07-mobile-480.png`
- `.maestro/tmp/screenshots/2.3-2.6-08-dialog-exclusao.png`
