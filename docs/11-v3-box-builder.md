# 11 — V3: Motor de Caixa Vazia + Subdivisões (CAD paramétrico)

Evolução do motor de módulos: de **templates fixos** (V1/V2) para um **box-builder
geométrico recursivo**. O usuário monta uma caixa vazia e vai inserindo divisórias e
conteúdos em cada vão — como um mini-CAD no navegador.

> Construído **ao lado** do motor de templates, não no lugar dele. Ambos produzem a
> mesma estrutura `EngineOutput`, então todo o pipeline a jusante (custo, insumos,
> proposta, persistência) é reaproveitado sem alteração.

## Modelo de dados (`lib/engine/box/types.ts`)

- **`BoxModule`** — caixa: `tipo` (aéreo/inferior/torre), medidas, `caixa` (cor+espessura
  interna) e a `raiz` da árvore de vãos.
- **`BayNode`** — nó da árvore: `split` (`vertical`/`horizontal`/`none`), `qtdDivisorias`
  e `children` (sub-vãos) ou `content` (folha).
- **`BayContent`** — conteúdo de um vão-folha: `portas`, `gaveta` (interna/externa),
  `prateleira`, `fundo`, `tamponamento`, `vazio`.

## Carcaça por tipo (`explode.ts` → `gerarCarcaca`)

| Tipo | Estrutura |
|---|---|
| **Aéreo** | 2 laterais + base + tampo (inteiriços) |
| **Inferior** | 2 laterais + base + **2 travessas de 70mm** no lugar do tampo |
| **Torre** | 2 laterais + base + tampo + **rodapé** de 100mm |

Laterais, base, tampo, travessas, prateleiras, divisórias e caixotes de gaveta usam a
espessura/cor da **caixa interna**. Fundo é sempre 6mm.

## Explosão recursiva (`explodeVao`)

Divisão de um vão de largura interna `W` por `N` divisórias de espessura `E`:

```
largura_do_vão = (W − N × E) / (N + 1)
```

O mesmo vale para a altura em divisões horizontais. A recursão desce até os vãos-folha,
onde o conteúdo vira peças:

- **Portas** — folga de 3mm lateral / 4mm vertical; dobradiças por altura
  (`max(2, ⌈altura/450⌉)`), **basculante** → pistão + 2 dobradiças, **cava** → sem
  puxador.
- **Gaveta externa** — frente na cor escolhida + caixote (laterais/frente/contrafrente/
  fundo 6mm) + corrediça + puxador.
- **Gaveta interna** (guarda-roupa) — frente na cor da caixa + **montante** (2 laterais =
  profundidade − 100mm, travessas sup/inf, afastadores de 30mm) + caixote + corrediça.
- **Prateleira** — recuo frontal configurável; largura = vão − 2mm.
- **Fundo** — espessura escolhida.
- **Tamponamento** — sempre **+25mm** da profundidade; inteiriça ou quadro de sarrafos.

## Integração com o custo (`index.ts`)

`calcularOrcamentoBox(boxes, perda)` explode cada caixa, monta `ResultadoModulo[]` e
chama a **mesma** `consolidarResultados` do motor de templates → `EngineOutput`. Daí em
diante, `pricing`, `insumos` (BOM unificada) e a proposta funcionam igual.

## Editor visual (`app/modulo`)

- **`BoxCanvas`** desenha a elevação frontal, os vãos-folha e destaca o selecionado;
  clique = seleção (hit-test em mm).
- Painel do vão: dividir vertical/horizontal (com quantidade) ou aplicar conteúdo.
- **Custo ao vivo** a cada edição (reusa `calcularOrcamentoBox` + catálogo + insumos).
- **Presets** (`lib/boxPresets.ts`) — salva a caixa montada no localStorage para
  reaplicar depois (os templates viram pontos de partida; o usuário cria os seus).

## Testes (`box.test.ts`)

7 testes golden: carcaça por tipo, subdivisão horizontal com conteúdos distintos
(basculante + gaveta), matemática da divisão vertical e integração com o custo.

## Próximos incrementos

- Aplicar módulos-caixa no orçamento principal (hoje o editor é standalone).
- Paredes dinâmicas em 90º com obstáculos (porta/janela/pedra/eletro) — o outro grande
  bloco da V3.
- Persistir presets e catálogo nas tabelas Prisma (quando o banco entrar).
