# 13 — Correções do modelo de caixa (V3) e overrides de instância

Rodada de correções pedidas depois de usar o editor `/modulo` e o card de módulo
na página principal na prática. Todas verificadas com testes unitários e com
Playwright (fluxo real na UI).

## 1. Bug real: travessa do módulo inferior "de pé" em vez de "deitada"

**Diagnóstico** (confirmado com o usuário via pergunta direta, com captura de tela):
a travessa do módulo `inferior` estava sendo tratada como se ficasse **de pé**, como
as laterais — mostrando os 70mm de profundidade como altura visível de frente. O
correto: ela fica **deitada**, como a base, e quem olha de frente vê só a espessura
do MDF (15mm), não os 70mm.

**Impacto real:** o vão útil do módulo `inferior` estava **55mm mais baixo** do que
deveria (`altura - t - 70` em vez de `altura - t - t`). Portas e gavetas ficavam
55mm mais curtas do que o correto — um erro que um marceneiro notaria na hora.

**Fix** (`lib/engine/box/explode.ts`):
- `interiorH = box.altura - 2*t` para **todos** os tipos (`inferior` deixa de ter
  caso especial) — a travessa, como a base/tampo, só consome a espessura da chapa.
- Constante renomeada `TRAVESSA_H` → `TRAVESSA_PROFUNDIDADE`, deixando explícito que
  o valor é uma profundidade (quanto a tira avança para dentro do móvel), não uma
  altura visível.
- Mesmo fix replicado no `BoxCanvas` (o `interiorTop` da vista frontal).

**Verificação:** teste unitário compara a altura da porta em módulos `inferior` e
`aereo` com as mesmas medidas — devem ser idênticas. Confirmado também ao vivo via
Playwright: porta antes de 631mm, depois do fix 686mm (fórmula correta:
`720 − 2×15 − 4`), igual nos dois tipos.

## 2. Prateleiras/fundo independentes da frente (o bug relatado)

**Problema:** não dava para colocar 2 portas numa caixa inteira com prateleiras
internas — `BayContent` era uma union onde `portas`, `gaveta`, `prateleira`, `fundo`
e `tamponamento` eram mutuamente exclusivos no mesmo vão-folha.

**Fix** (`lib/engine/box/types.ts`): `BayContent` virou

```ts
type BayContent =
  | { tipo: "espaco"; frente: FrenteConteudo; prateleiras?: {...}; fundo?: {...} }
  | { tipo: "tamponamento"; lado; material; sarrafo };
```

`frente` (vazio/portas/gaveta) continua mutuamente exclusiva dentro de si — faz
sentido, um vão não tem porta E gaveta na mesma abertura — mas **prateleiras e fundo
agora são atributos independentes e combináveis** com qualquer frente. Um vão pode
ter 2 portas + 2 prateleiras internas + fundo, sem precisar dividir a caixa.

`tamponamento` continua um modo à parte: o vão inteiro vira um painel lateral
estrutural (não tem frente/prateleiras/fundo).

Reescritos em cadeia: `explode.ts` (`aplicarConteudo`/`aplicarFrente` separados),
`tree.ts` (`rotuloConteudo`), `lib/boxPresets.ts` (seeds agora demonstram a
combinação: "Balcão 2 Portas" tem portas + 1 prateleira + fundo no mesmo vão),
`app/modulo/page.tsx` (formulário com "Frente" + checkboxes independentes de
"Prateleiras internas" e "Tem fundo").

**Verificação:** teste unitário dedicado + confirmado ao vivo (Playwright): o vão
mostra "2 porta(s) + 1 prat. + fundo" simultaneamente na lista de peças.

## 3. Tamponamento de instância por lado (antes era uma config só para todos os lados)

**Problema:** `TamponamentoInstancia` tinha um único `sarrafo`/`material` compartilhado
por todos os lados ativos — não dava pra ter o lado direito em sarrafo/Madeirado e o
topo inteiriço/Branco.

**Fix** (`lib/engine/box/types.ts`):

```ts
interface TamponamentoLado { ativo: boolean; sarrafo: boolean; material: BoxMaterial }
interface TamponamentoInstancia {
  esquerdo: TamponamentoLado; direito: TamponamentoLado;
  superior: TamponamentoLado; inferior: TamponamentoLado;
}
```

`gerarTamponamentoInstancia` (explode.ts) e `larguraInstalacaoBox` (types.ts)
atualizados para ler a config de cada lado individualmente. UI (`TamponamentoConfig`
em `app/page.tsx`) virou 4 mini-formulários, um por lado, cada um com seu próprio
cor/espessura/montagem.

## 4. Overrides rápidos de instância no card (sem reabrir o editor)

Adicionados a `BoxModule`: `overridePortas?: BoxMaterial` (troca a cor/espessura de
**todas** as portas do módulo) e `overrideTemFundo?: boolean` (liga/desliga fundo em
**todos** os vãos, ignorando o que foi salvo no gabarito). Ambos aplicados em
`explode.ts`. UI no `BoxModuloCard`: botão "+ Personalizar cor das portas" e select
"Tem fundo: Padrão do gabarito / Sim / Não".

## 5. Preview com feedback visual de cor (Canvas)

`BoxCanvas` ganhou um parâmetro implícito: quando `box.tamponamento` tem lados
ativos, desenha uma tira colorida por fora da carcaça em cada lado ativo, na cor
daquele lado. Confirmado visualmente via screenshot: tira em "Louro Freijó" aparece
nitidamente no lado direito do preview ao ativar o tamponamento com essa cor.

## 6. Card colapsável ("Salvar" / "Editar")

Novo estado `minimizados: Set<string>` em `app/page.tsx`. Botão **Salvar** no rodapé
do card (ao lado de Duplicar/Excluir) colapsa a edição para uma vista-resumo
(`ResumoModulo`): preview + Título+Categoria, Parede, L×H×P, cor do interno, cor do
tamponamento. Botão **Editar** reabre a edição completa. Aplica-se aos dois tipos de
módulo (template e caixa).

## 7. Plano de corte do orçamento completo

`lib/insumos.ts` ganhou `todasAsPecas(engine)`, que achata `porModulo[].pecas` +
converte `globais` (tampo/rodapé contínuos) para o formato `Peca`. Nova seção
"Plano de corte (orçamento completo)" na página principal, usando o mesmo
`planoDeCorte` + `PlanoCorteCanvas` já usados em `/modulo`, agora agregando **todos**
os módulos do orçamento em vez de um só.

## Verificação geral

- 50 testes verdes (20 no `box.test.ts`, +9 novas desta rodada).
- Typecheck e build limpos.
- Fluxo completo testado via Playwright: prateleiras+portas+fundo coexistindo,
  travessa corrigida (medida idêntica entre inferior/aéreo), tamponamento por lado
  com largura de instalação correta (818mm = 800 + 18), overrides de portas/fundo,
  preview mudando de cor, colapsar/expandir, cálculo completo do orçamento e plano
  de corte geral — tudo sem erros de console.
