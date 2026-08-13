# Modelo de Domínio — orcamentofacil V2

> **Fase A (Discovery) — artefato 1 de 4.** Fonte: `docs/00-briefing-v2-reorientacao_1.md`.
> Este é o documento fundacional: PRD (`docs/PRD.md`), mapa de telas
> (`docs/Mapa-de-Telas.md`) e o backlog de execução (`docs/Backlog.md`)
> derivam **deste** modelo, nunca o contrário. Regra do briefing (Seção 7.5):
> "o mapa de telas não pode ser fechado antes do modelo de dados".
>
> Notação: os tipos abaixo são **especificação de referência** (não código de
> produção). O Backend Engineer traduz para os tipos TypeScript reais e para
> as migrations SQL do Supabase. Onde um tipo já existe hoje, está anotado.
>
> **Extensão pré-lançamento (2026-07-31).** Fonte adicional:
> `docs/01-backlog-pre-lancamento.md` (4 walkthroughs do produto em produção
> com um marceneiro real) + decisões do operador sobre Q-1, Q-2, Q-5, D-10 e
> modelos de tampo. As Seções 0–10 permanecem válidas; o que mudou está
> marcado com **[V2.1]** e consolidado na **Seção 11**. Nada foi removido.
>
> **Revisão da mesma rodada (2026-07-31):** a direção "**Google OR-Tools** em
> arquitetura assíncrona" (worker Python externo, fila, entidade de job de
> plano de corte) foi **descartada pelo operador** e **removida deste
> documento** — não existe Seção 12, não existe entidade de job, e as quatro
> perguntas que aquela direção havia aberto (onde roda o worker externo ·
> mecanismo de fila · limiar de disparo assíncrono · corte guilhotinado
> obrigatório) **deixam de existir** (não são pendências: o assunto foi
> encerrado, e guilhotina virou **invariante** — Seção 8.1).
>
> Em seu lugar, decisão do operador: **melhorar o bin-packing atual em
> TypeScript puro, executado num Web Worker do navegador** — guilhotina como
> invariante explícita, **kerf** (espessura de serra) como parâmetro, e busca
> por permutação de ordem de inserção. Modelado nas **Seções 8.1 a 8.5**;
> resolve juntos os itens **3.1** e **3.3** de `docs/01-backlog-pre-lancamento.md`.
> Nenhuma entidade nova, nenhuma tabela nova, nenhuma infraestrutura nova.
>
> Na mesma revisão entrou a nota do **`ModuleViewer`** (visualização 3D
> estática e não-interativa, exceção pontual e estreita) — **Seção 4.1**.

---

## 0. Princípios estruturantes (não reabrir)

1. **`ItemOrcamento` é union, não tipo único.** Ao remover o motor V1, o
   plano antigo cogitava colapsar `ModuloOrcamento` em tipo único. O briefing
   (Seção 7.2) e a verificação de código (`lib/orcamento.ts` já é union
   discriminada por `origem`) confirmam: **o union permanece**, só troca o
   branch `"template"` por `"placa"`.
2. **Configuração dirigida por capacidade** (briefing Seção 3). Cada tipo de
   item declara quais seções de configuração se aplicam. A UI lê o schema de
   capacidades; não há `if (tipo === "placa") esconder gaveta` espalhado por
   componentes. Modelado no domínio (Seção 4 deste doc).
3. **Dimensão derivada, não digitada.** Elementos contínuos, tamponamento e o
   Y de posicionamento derivam da geometria/perfil — nunca são input livre
   (briefing 6.1, 6.5). Permitir digitar é abrir fonte de erro sem ganho.
4. **Dois agrupamentos distintos, donos distintos** (briefing 6.3): Conjunto
   (físico, derivado da adjacência) ≠ Linha de Proposta (comercial, criada
   pelo usuário). Nunca colapsar.
5. **Multi-tenant no banco** (briefing 4.1, D-14): isolamento por
   `auth.uid()`/RLS do Supabase, não por filtro na aplicação. Toda tabela de
   tenant nasce com RLS + política **na mesma migration**.

---

## 1. Item de orçamento — o union

```ts
type ItemOrcamento =
  | { origem: "custom_box"; box: BoxModule }   // PRESERVADO do V3 atual
  | { origem: "placa";      placa: Placa }     // NOVO (briefing 7.2)
// (o branch { origem: "template" } do V1 é REMOVIDO)
```

- `BoxModule` — tipo já existente (`lib/engine/box/types.ts`), preservado.
  Carcaça + vãos recursivos + portas/gavetas. **Muda**: `tamponamento` sai do
  `BayContent` (Seção 3.3).
- `Placa` — novo (Seção 2).
- Acessores puros (`idDoItem`, `larguraDoItem`, `alturaDoItem`, etc.) já
  existem em `lib/orcamento.ts` — passam a estreitar sobre `"placa"` em vez de
  `"template"`.

---

## 2. Primitiva Placa (nova — briefing 7.2)

Uma `Placa` **não é** um `BoxModule`: não tem carcaça, não tem vãos. É uma
peça plana única com modificadores. Uso funcional: prateleira, fechamento de
vão, painel de parede, ripado.

```ts
type Placa = {
  id: string
  nome: string
  // dimensões
  largura: number
  altura: number
  espessura: number
  // material e acabamento
  material: MaterialRef
  orientacao: "horizontal" | "vertical" | "alinhada_parede"
  bordaPorLado: {                    // acabamento de fita por lado
    superior?: AcabamentoBorda
    inferior?: AcabamentoBorda
    esquerda?: AcabamentoBorda
    direita?: AcabamentoBorda
  }
  // modificadores (opcionais, mutuamente relevantes por uso)
  engrossamento?: Engrossamento      // engrossada OU dobrada — BOMs distintos
  ripado?: Ripado                    // gerador de peças
  usoFuncional?: "prateleira" | "fechamento_vao" | "painel_parede"
}
```

### 2.1 Engrossamento / dobra — DUAS técnicas, BOMs distintos

> **Corrigido em 2026-07-24 pela auditoria de domínio do operador.** A versão
> anterior descrevia "dobrada" como chapa usinada e dobrada a 45° — está
> errado. As regras abaixo derivam dos 6 exemplos trabalhados fornecidos pelo
> operador e são a especificação canônica.

Em ambas as técnicas a placa **mantém as dimensões de face** (uma placa
1000×500 continua 1000×500) — o que muda é a espessura e o conjunto de peças.

**O parâmetro real é o NÍVEL (1/2/3), não a espessura.** "30/45/60 mm" é o
rótulo do caso comum (placa-base de 15 mm); com base de 18 mm o nível é o
mesmo e a espessura final é outra:

```
espessuraFinal = espessuraBase × (1 + nivel)
```

| Nível | Base 15 mm | Base 18 mm |
|---|---|---|
| 1 | 30 mm | 36 mm |
| 2 | 45 mm | 54 mm |
| 3 | 60 mm | **indisponível** (72 mm excede a fita; ver nota abaixo) |

> **Decisão do operador (2026-07-27)**: para base 18 mm, o **nível máximo é 2**
> (54 mm). Nível 3 não é oferecido para base 18 mm — não é uma pendência em
> aberto, é regra de negócio fechada. Válido para as duas técnicas
> (engrossada e dobrada). Base 15 mm continua com os 3 níveis normalmente.

```ts
type Engrossamento =
  | { tecnica: "engrossada"
      nivel: 1 | 2 | 3
      lados: LadoPlaca[]              // quais bordas engrossar (ver 2.1.1)
      larguraSarrafo?: number }       // default 70 mm, EDITÁVEL
  | { tecnica: "dobrada"
      nivel: 1 | 2 | 3 }

type LadoPlaca = "superior" | "inferior" | "esquerda" | "direita"
```

#### Engrossada — placa + sarrafos nas bordas (peça OCA no meio)

Sarrafos colados por trás, nas bordas. A peça **não** vira maciça: só as
bordas ganham espessura. O marceneiro **escolhe quais lados engrossar**
(pode querer só os dois maiores) — ver 2.1.1.

Regras de derivação (sarrafo: largura **70 mm** por padrão, editável):

```
camadas de sarrafo por lado selecionado = nivel   (1, 2 ou 3)
```
> Cada camada soma uma espessura de placa: base 15mm + 1 sarrafo = 30mm;
> + 2 = 45mm; + 3 = 60mm.

- **Só os lados selecionados geram sarrafo.** Lado não selecionado não produz
  peça alguma naquela borda.
- Sarrafos do **eixo maior** correm o comprimento inteiro da placa.
- Sarrafos do **eixo menor** encaixam **entre** eles: comprimento = dimensão
  menor − (larguraSarrafo × nº de lados perpendiculares **selecionados**).
  Se nenhum lado perpendicular estiver selecionado, o sarrafo menor sai na
  medida cheia.

**Exemplo de engrossamento parcial** (placa 1000×500, nível 1, só os dois
lados de 1000): peças = 1× 1000×500 + 2× 1000×70. **Nenhum sarrafo de 360.**

**Conferência com os exemplos do operador** (placa 1000×500):

| Exemplo | Config | Peças geradas |
|---|---|---|
| 1 | Engrossada 30mm (4 lados) | 1× 1000×500 · 2× 1000×70 · 2× 360×70 |
| 3 | Engrossada 45mm (4 lados) | 1× 1000×500 · 4× 1000×70 · 4× 360×70 |
| 5 | Engrossada 60mm (4 lados) | 1× 1000×500 · 6× 1000×70 · 6× 360×70 |

`360 = 500 − 2×70` (os dois sarrafos de 1000 ocupam 70mm de cada ponta).

#### Dobrada — placas inteiras laminadas (peça MACIÇA)

Sem sarrafo: empilham-se placas inteiras.

```
nº de placas = nivel + 1        // nível 1 → 2 placas · 2 → 3 · 3 → 4
```

| Exemplo | Config | Peças geradas |
|---|---|---|
| 2 | Dobrada 30mm | 2× 1000×500 |
| 4 | Dobrada 45mm | 3× 1000×500 |
| 6 | Dobrada 60mm | 4× 1000×500 |

#### Fita de borda por espessura final — regra de catálogo

A técnica (engrossada vs dobrada) **não** muda a fita; quem manda é a
**espessura final**. Regra geral: **a menor fita disponível ≥ espessura
final**. Fitas de larguras diferentes são produtos distintos no catálogo.

| Espessura final | Fita |
|---|---|
| 15 mm · 18 mm | **22 mm** |
| 25 mm · 30 mm | **35 mm** |
| 36 mm · 45 mm · 54 mm · 60 mm | **65 mm** |

> **[V2.1]** A linha de 25 mm existe por causa do **tampo simples** (Seção
> 3.4.1), única configuração do domínio que produz espessura final 25 mm. Ela
> sai da mesma regra geral ("menor fita disponível ≥ espessura final"), não é
> exceção.
>
> **[V2.1] Base de engrossamento/dobra é só 15 mm ou 18 mm.** 6 mm e 25 mm
> nunca são base — 6 mm não é oferecido em nenhum modelo de tampo, e 25 mm só
> existe no modelo `simples`, que por definição não tem engrossamento.

> ✅ **Borda do domínio resolvida (2026-07-27)**: base 18 mm no nível 3 daria
> **72 mm**, que excede a maior fita da tabela (65 mm). Decisão do operador:
> **nível máximo para base 18 mm é 2** (54 mm) — nível 3 simplesmente não é
> oferecido para essa base, em nenhuma das duas técnicas. Regra fechada, não
> pendência — a Task 12.1 implementa a validação (rejeitar ou não oferecer
> nível 3 quando `espessuraBase === 18`), não decide o valor.

#### 2.1.1 Seleção de lados a engrossar (requisito de UX)

O marceneiro precisa escolher **quais bordas** engrossar — caso comum: só os
dois lados maiores. Interação sugerida (operador aberto a alternativas):
referência visual da placa com os 4 lados clicáveis; escolhida a espessura
(30/45/60), cada clique num lado adiciona/remove o engrossamento daquele lado,
com confirmação. O BOM recalcula ao vivo (o comprimento dos sarrafos do eixo
menor depende de quantos lados perpendiculares estão selecionados).

> ✅ **Resolvido pelo operador (2026-07-24)**: engrossar/dobrar vale também
> para base de 18 mm — a espessura final passa a ser `base × (1 + nivel)` e a
> fita segue a espessura real. Por isso o parâmetro do domínio é o **nível**,
> não a espessura.

### 2.2 Ripado (briefing 7.2, D-06) — gerador de peças

```ts
type Ripado = {
  larguraRipa: number
  quantidade: number      // INPUT (D-06: quantidade → espaçamento derivado)
  // espacamento DERIVADO da largura da placa, largura da ripa e quantidade
}
```

Deriva N peças da placa, calcula o espaçamento e representa visualmente. D-06
resolvido: **usuário informa quantidade, sistema deriva o espaçamento.**

---

## 3. Parede, Ambiente e posicionamento (novo — briefing Seção 6)

### 3.1 Posicionamento 1D com faixas (D-20 — briefing 6.5)

**Não há posicionamento 2D livre.** Cada item posicionado tem:

```ts
type ItemPosicionado = {
  itemId: string                                       // ref ao ItemOrcamento
  paredeId: string                                     // [V2.1] dono (item 0.3) — implícito quando
                                                       //   a lista está aninhada na própria Parede
  x: number                                            // ABSOLUTO: offset da borda esquerda da parede
  faixa: "inferior" | "bancada" | "aereo" | "torre"
  refEntrada?: "esquerda" | "direita"                  // [V2.1] só preferência de exibição (3.1.1)
  // Y é DERIVADO: faixa + alturas EFETIVAS da parede (Seção 3.2.1)
}
```

Torna validação e detecção de adjacência quase triviais e casa com como a
marcenaria funciona (módulos no chão em fila, ou pendurados a altura fixa).

> **[V2.1] Nomenclatura de faixa na UI** (item 2.15): `bancada` passa a ser
> rotulada **"meio"** na interface. O identificador do domínio continua
> `"bancada"` — é rename de rótulo, não de tipo. `inferior`, `aereo` e `torre`
> mantêm nome e rótulo.

### 3.1.1 [V2.1] Entrada em VÃO, armazenamento em X absoluto (Q-2)

> **Decisão fechada do operador.** Não é mudança de schema: `x` continua
> **absoluto**. O que muda é a camada de entrada/exibição. Esta nota existe
> para que ninguém volte a perguntar se `x` deveria virar relativo — **não
> deveria**.

O marceneiro não pensa em "afastamento da parede"; ele pensa em "quanto sobra
entre este módulo e o de antes". Então:

- **Entrada**: o usuário digita o **vão** até o vizinho de um dos lados.
- **Armazenamento**: o sistema converte para `x` absoluto e guarda só isso.
- **Exibição**: o sistema reconverte `x` absoluto para o vão dos dois lados.
- **Consequência obrigatória**: apagar um módulo do meio **não move ninguém**.
  Os `x` dos demais são imutáveis; o que muda é o vão exibido, que cresce.

**Definição de vizinho** (na mesma parede):

```
borda(i)          = [ x_i , x_i + largura_i ]
candidatos(F)     = itens da faixa F  ∪  itens da faixa "torre"      (F ≠ torre)
candidatos(torre) = itens de inferior ∪ bancada ∪ aereo ∪ torre
vizinhoEsquerdo   = candidato com a MAIOR borda direita ≤ x         (senão: parede, borda 0)
vizinhoDireito    = candidato com a MENOR borda esquerda ≥ x+largura (senão: parede, borda = parede.largura)
```

> A torre entra como vizinha das três faixas porque ocupa as três (item 2.16).

**Conversão de entrada** (vão → X):

```
ref "esquerda":  x = bordaDireitaDoVizinhoEsquerdo + vao
ref "direita":   x = bordaEsquerdaDoVizinhoDireito − vao − largura(item)
```

**Conversão de exibição** (X → vão):

```
vaoEsquerda = x − bordaDireitaDoVizinhoEsquerdo
vaoDireita  = bordaEsquerdaDoVizinhoDireito − (x + largura)
```

`refEntrada` é gravado apenas para reabrir o campo com o mesmo número que o
usuário digitou. Ignorá-lo nunca muda a geometria.

**Exemplo trabalhado — inserção** (parede de 3000 mm, faixa inferior):

```
Entrada: M1 largura 800, encostado na parede esquerda (ref esquerda, vão 0)
Passo 1 — vizinho esquerdo de M1: parede, borda 0
Passo 2 — x(M1) = 0 + 0 = 0            → M1 ocupa [0, 800]

Entrada: M2 largura 600, ref esquerda, vão 0
Passo 3 — vizinho esquerdo: M1, borda direita 800
Passo 4 — x(M2) = 800 + 0 = 800        → M2 ocupa [800, 1400]

Entrada: M3 largura 400, ref esquerda, vão 50
Passo 5 — vizinho esquerdo: M2, borda direita 1400
Saída:    x(M3) = 1400 + 50 = 1450     → M3 ocupa [1450, 1850]
```

**Exemplo trabalhado — deleção do módulo do meio** (a pergunta da Q-2):

```
Entrada: apagar M2 do estado acima
Passo 1 — x(M1) = 0 e x(M3) = 1450 permanecem INALTERADOS (nada desliza)
Passo 2 — novo vizinho esquerdo de M3: M1, borda direita 800
Saída:    vão exibido de M3 = 1450 − 800 = 650
          (antes exibia 50; o módulo não andou, o vão é que cresceu)
```

**Exemplo trabalhado — entrada pela direita**:

```
Entrada: M4 largura 500, ref direita, vão 100, sem nada à direita de M3
Passo 1 — vizinho direito: parede, borda esquerda = 3000
Passo 2 — x(M4) = 3000 − 100 − 500 = 2400
Saída:    M4 ocupa [2400, 2900]; vão exibido à esquerda = 2400 − 1850 = 550
```

**Validações da conversão** (erro, não aviso):

| Situação | Código | Comportamento |
|---|---|---|
| `vao < 0` | `VAO_NEGATIVO` | rejeita a entrada (vão negativo é sobreposição disfarçada) |
| `x < 0` após conversão | `FORA_DA_PAREDE` | rejeita |
| `x + largura > parede.largura` | `PAREDE_LARGURA_EXCEDIDA` | já existe em Tier 1 |
| item redimensionado (item 2.19) | — | `x` **não muda**; os vãos exibidos recalculam |

### 3.2 Parede e Ambiente

> **[V2.1] A hierarquia deixa de ter limite de cardinalidade.** O "primeiro
> corte: 1 parede por ambiente" do briefing era limite de UI, não de modelo, e
> **cai** (itens 0.1–0.3, 2.3, 2.4). A cadeia canônica é:
>
> ```
> Orçamento 1—N Ambiente 1—N Parede 1—N ItemPosicionado
> ```
>
> Todo `ItemPosicionado` pertence a exatamente uma `Parede`, que pertence a
> exatamente um `Ambiente`, que pertence a exatamente um `Orçamento`. Deleção
> cascateia de cima para baixo. Um item nunca é órfão de parede.

```ts
type Orcamento = {
  id: string
  // ...demais campos (Seção 7)
  ambientes: Ambiente[]            // [V2.1] N ambientes: cozinha, quarto 1, banheiro...
}

type Ambiente = {
  id: string
  orcamentoId: string              // [V2.1]
  nome: string                     // "Cozinha", "Quarto" — default do título da Linha de Proposta
  ordem: number                    // [V2.1] ordenação estável na UI e na proposta
  paredes: Parede[]                // [V2.1] N (era "primeiro corte: 1")
}

type Parede = {
  id: string
  ambienteId: string               // [V2.1] dono explícito (item 0.2)
  nome: string                     // [V2.1] nome livre: "parede da pia", "parede do box" (item 0.6)
  ordem: number                    // [V2.1] ordenação estável
  altura: number                   // altura FÍSICA da parede (chão → teto)
  largura: number
  alturasOverride?: Partial<AlturasFaixas>   // [V2.1] Q-1 — ver 3.2.1
  elementos: ElementoParede[]      // janela, porta, tomada, ponto hidráulico, pedra
  itens: ItemPosicionado[]
}
```

**Invariantes de nome** (viram `CHECK`/validação):

- `Ambiente.nome` não vazio; default sugerido `"Ambiente 1"`, `"Ambiente 2"`…
  Não precisa ser único dentro do orçamento (dois "Quarto" são legítimos), mas
  a UI avisa sobre duplicata.
- `Parede.nome` não vazio; default sugerido `"Parede 1"`, `"Parede 2"`… dentro
  do ambiente. O nome é **rótulo humano**, nunca identificador — referências
  são sempre por `id`.

### 3.2.1 [V2.1] Alturas de faixa: perfil dá o default, parede sobrescreve (Q-1)

> **Decisão fechada do operador.** O perfil da organização define o default; a
> parede sobrescreve **quando precisa**, com indicação visual de "herdado" vs
> "customizado". Um orçamento de 4 ambientes × 3 paredes não pode exigir 12
> configurações repetidas.

```ts
type AlturasFaixas = {
  alturaRodape: number
  alturaBancada: number
  alturaInstalacaoAereo: number    // início da faixa aérea
  peDireito: number                // LIMITE SUPERIOR DE INSTALAÇÃO do aéreo — ver nota
}

// Organização (perfil): alturasPadrao: AlturasFaixas          — sempre completo
// Parede:               alturasOverride?: Partial<AlturasFaixas> — campo a campo
```

**Regra de resolução (a única fonte de Y):**

```
alturasEfetivas(parede, organizacao) = { ...organizacao.alturasPadrao, ...parede.alturasOverride }
```

- O override é **campo a campo**, não tudo-ou-nada: uma parede pode
  customizar só o rodapé e continuar herdando as outras três.
- Campo **ausente** (ou `null`) no override = herdado. "Voltar ao herdado" é
  apagar a chave, não copiar o valor do perfil — copiar congelaria o valor e
  quebraria a propagação futura.
- Mudar o perfil da organização **muda retroativamente** toda parede que não
  sobrescreveu aquele campo. Isso é o comportamento desejado, e a UI precisa
  dizê-lo antes de salvar o perfil.
- **Estado "herdado" vs "customizado" é derivado**, nunca um flag persistido:
  `customizado(campo) = parede.alturasOverride?.[campo] !== undefined`.

> **[V2.1] Invariante de escrita (corrige comportamento atual).** Salvar uma
> parede **nunca** escreve em `organizacao.alturas_padrao`. Hoje o fluxo de
> Ambientes salva as 4 alturas no nível da organização
> (`lib/ambiente/salvar.ts`), o que significa que ajustar uma parede reescreve
> o perfil da marcenaria inteira. Com o override por parede isso vira erro de
> domínio: perfil só muda em `/perfil`.

> **Semântica de `peDireito` (esclarecimento, item 5.2).** `Parede.altura` é a
> altura física da parede. `peDireito` **não** é a altura da parede — é o
> **limite superior de instalação dos módulos aéreos**. Os dois coexistem sem
> redundância desde que o rótulo de UI diga isso. Limite efetivo de instalação:
> `min(alturasEfetivas.peDireito, parede.altura)`.

**Derivação de Y a partir da faixa** (substitui a fórmula anterior):

| Faixa | Y (borda inferior do módulo) |
|---|---|
| `inferior` | `alturaRodape` — o módulo **assenta sobre o rodapé** (item 2.17) |
| `torre` | `alturaRodape` — a torre integra a mesma fileira e compartilha o rodapé |
| `bancada` ("meio") | `alturaBancada` |
| `aereo` | `alturaInstalacaoAereo` |

> ⚠️ **Mudança de comportamento em relação ao implementado.** Hoje
> `derivarY("inferior") = 0` e o `alturaRodape` não participa
> (`lib/engine/parede/validar.ts`). O item 2.17 ("módulo inferior cola
> automaticamente respeitando o rodapé") exige `Y = alturaRodape`. Registrado
> como **A-08** na Seção 11 — mexe em teste existente do motor.

**Exemplo trabalhado — herança pura:**

```
Entrada: perfil da org = { rodape 100, bancada 900, aereo 1400, peDireito 2700 }
         parede "Parede 1" sem override; módulo inferior de altura 800
Passo 1 — alturasEfetivas = { 100, 900, 1400, 2700 }  (nada sobrescrito)
Passo 2 — Y do módulo = alturaRodape = 100
Passo 3 — topo do módulo = 100 + 800 = 900
Saída:    topo (900) == início da faixa bancada (900) → encaixa exato, sem aviso
          (a regra Tier 2a rejeita apenas topo > início da faixa seguinte)
```

**Exemplo trabalhado — override parcial que gera aviso:**

```
Entrada: mesmo perfil; parede "Parede da pia" com alturasOverride = { alturaRodape: 150 }
         mesmo módulo inferior de altura 800
Passo 1 — alturasEfetivas = { 150, 900, 1400, 2700 }
          rodapé = CUSTOMIZADO; bancada/aereo/peDireito = HERDADOS
Passo 2 — Y = 150
Passo 3 — topo = 150 + 800 = 950
Saída:    950 > 900 → aviso FAIXA_COLIDE (o módulo invade a faixa do meio)
```

**Exemplo trabalhado — override coerente (o caminho feliz do mesmo caso):**

```
Entrada: parede "Parede da pia" com alturasOverride = { alturaRodape: 150, alturaBancada: 950 }
Passo 1 — alturasEfetivas = { 150, 950, 1400, 2700 }
Passo 2 — Y = 150; topo = 150 + 800 = 950
Passo 3 — 950 == 950 → sem aviso
Saída:    espaço livre até o aéreo = 1400 − 950 = 450 mm
```

### 3.2.2 [V2.1] Elemento de parede — tipos, referência de medida e edição

```ts
type ElementoParede = {
  id: string                       // [V2.1] obrigatório: sem id não há como editar (item 2.8)
  tipo: "janela" | "porta" | "tomada" | "ponto_hidraulico" | "pedra"   // [V2.1] +pedra
  nome?: string                    // [V2.1] livre, ou herdado de um preset (3.2.3)
  presetId?: string                // [V2.1] ref a ElementoParedePreset — só prefill, sem vínculo vivo
  // CANÔNICO — sempre absoluto, sempre em mm:
  x: number                        // borda ESQUERDA do elemento, medida da borda esquerda da parede
  y: number                        // borda INFERIOR do elemento, medida do CHÃO
  largura: number
  altura: number
  // REFERÊNCIA DE MEDIDA — [V2.1] itens 2.9/2.10. Só entrada e exibição:
  refX: "esquerda" | "direita"     // default "esquerda"
  refY: "chao" | "teto"            // default "chao"
}
```

Mesma disciplina da Seção 3.1.1: **o dado guardado é absoluto; a referência é
preferência de leitura.** Trocar `refX`/`refY` reescreve o número exibido e
**nunca** move o elemento.

**Conversões** (parede `L` de largura, `H` de altura):

```
entrada  refX "esquerda": x = valor              | exibição: valor = x
entrada  refX "direita":  x = L − valor − largura| exibição: valor = L − (x + largura)
entrada  refY "chao":     y = valor              | exibição: valor = y
entrada  refY "teto":     y = H − valor − altura | exibição: valor = H − (y + altura)
```

`refY "teto"` mede do teto até a borda **superior** do elemento — é assim que
se cota uma janela na obra.

**Rótulos de UI** (item 2.11 — nada de "X" e "Y"):

| Campo | Rótulo |
|---|---|
| `refX: "esquerda"` | "Distância da parede esquerda" |
| `refX: "direita"` | "Distância da parede direita" |
| `refY: "chao"` | "Altura do chão" |
| `refY: "teto"` | "Distância do teto" |

**Exemplo trabalhado — janela cotada pela direita e pelo teto:**

```
Entrada: parede 3000 × 2700; janela 1200 × 1000
         refX "direita" com 600; refY "teto" com 1100
Passo 1 — x = 3000 − 600 − 1200 = 1200
Passo 2 — y = 2700 − 1100 − 1000 = 600
Saída:    elemento canônico { x: 1200, y: 600, largura: 1200, altura: 1000 }
Conferência (reexibição com as mesmas refs):
          3000 − (1200 + 1200) = 600 ✓      2700 − (600 + 1000) = 1100 ✓
Conferência (mesmo elemento lido em esquerda/chão):
          600 vira 1200 · 1100 vira 600 — mesmo retângulo, outra leitura
```

**Exemplo trabalhado — "pedra" (bancada de terceiros):**

```
Entrada: parede 3000 × 2700; laje de pedra 2400 de largura × 30 de espessura,
         topo acabado da bancada a 900 do chão; refX "esquerda" 0; refY "chao" 870
Passo 1 — x = 0; y = 870
Passo 2 — topo da pedra = 870 + 30 = 900 (o topo acabado da bancada)
Saída:    elemento { tipo: "pedra", x: 0, y: 870, largura: 2400, altura: 30 }
Efeito 1: a pedra ocupa a faixa 870–900, então o módulo inferior tem de caber
          ABAIXO dela: com rodapé 100, altura máxima = 870 − 100 = 770
          módulo de 770 → ocupa 100–870 → encosta sem sobrepor (sem aviso)
          módulo de 800 → ocupa 100–900 → sobrepõe 870–900
                       → erro ITEM_SOBRE_ELEMENTO_PAREDE (regra Tier 2b já existente)
Efeito 2: um tampo de MDF derivado para o mesmo trecho → aviso TAMPO_SOBRE_PEDRA
          (a bancada já é de pedra; um tampo ali é material pago duas vezes)
```

**Bloqueio de conjunto por tipo** (esclarece a regra da Seção 3.3):

| Tipo | Quebra bloco físico? |
|---|---|
| `porta` | **Sim**, quando o retângulo intersecta a faixa vertical do bloco |
| `janela` | **Sim**, mesma condição geométrica |
| `pedra` | **Não** — é limite de acabamento, não obstáculo de marcenaria |
| `tomada` | **Não** — fica atrás do módulo |
| `ponto_hidraulico` | **Não** — mesma razão |

Ou seja: uma porta do chão aos 2100 quebra o bloco inferior; uma janela acima
da bancada não quebra o bloco inferior (só o aéreo, se intersectar). Isto é o
enunciado geométrico da regra que a Seção 3.3 já descrevia em prosa.

**Avisos de domínio novos:**

| Código | Situação | Severidade |
|---|---|---|
| `TAMPO_SOBRE_PEDRA` | tampo derivado cobre trecho ocupado por elemento `pedra` | aviso |
| `ELEMENTO_FORA_DA_PAREDE` | `x < 0`, `y < 0`, `x+largura > L` ou `y+altura > H` | erro |
| `ELEMENTO_SEM_NOME` | preset sem `nome` | erro (o nome é o único campo obrigatório do preset) |

### 3.2.3 [V2.1] Preset de elemento de parede — fora do catálogo (Q-5)

> **Decisão do operador — diverge da recomendação do backlog-fonte.** O
> backlog sugeriu uma 6ª categoria de catálogo com preço/status desabilitados.
> **Rejeitado.** Elemento de parede é **só nome** e fica **fora do catálogo de
> produtos por completo**.

```ts
type ElementoParedePreset = {
  id: string
  organizacaoId: string
  nome: string                     // ÚNICO campo obrigatório
  larguraPadrao?: number           // prefill opcional do formulário
  alturaPadrao?: number            // prefill opcional do formulário
}
```

O que este tipo **não tem**, por decisão explícita:

- ❌ preço — não entra em custo, não entra em BOM, não entra no rateio
- ❌ status/ativo — não tem ciclo de vida de insumo
- ❌ tipo/categoria — não é insumo, não aparece em `/catalogo`
- ❌ vínculo vivo com o `ElementoParede` criado a partir dele: aplicar o preset
  **copia** nome e dimensões para o elemento. Editar o preset depois **não**
  altera elementos já colocados, e apagar o preset não invalida nada
  (`presetId` vira referência morta, tolerada).

Um `ElementoParedePreset` é um atalho de digitação por organização, nada mais.
Ele nunca aparece na proposta, na lista de material ou no plano de corte.

### 3.3 Conjunto (físico) — derivado por adjacência, ajustável (briefing 6.2/6.3)

**Modelo híbrido.** O sistema detecta blocos automaticamente; o usuário pode
quebrar/unir manualmente (override persistido).

```ts
type Conjunto = {
  id: string
  paredeId: string
  faixa: ItemPosicionado["faixa"]
  itensIds: string[]               // itens adjacentes, mesma faixa, bordas encostadas
  // override do usuário (handle de junção na elevação — briefing 6.2)
}
```

> **[V2.1] Reafirmação (itens 2.29/2.30, Q-3 — não reabrir).** O **Conjunto
> continua físico**: mesma parede, mesma faixa, adjacência automática — é ele
> que serve de base para tampo, rodapé e tamponamento. O agrupamento
> **comercial** que cruza faixas e paredes é a `LinhaProposta` (Seção 6), outro
> dono, outro botão, outra afordância visual. Colapsar os dois faria
> tamponamento aparecer em módulo aéreo, ou prenderia a linha de proposta
> dentro de uma faixa. Quais tipos de elemento de parede quebram o bloco: ver
> a tabela de bloqueio na Seção 3.2.2.

Regra de detecção (briefing 6.2): itens na mesma parede, mesma faixa, bordas
encostadas dentro de tolerância, **sem elemento de parede bloqueante entre
eles** (uma porta na parede quebra o bloco; uma janela acima da bancada não
quebra o bloco inferior). O usuário quebra/une via handle de junção na
elevação; a quebra é override, a detecção automática só vale onde não há
override.

### 3.4 Elementos contínuos unificados (briefing 6.1) — a maior simplificação

> **Corrigido em 2026-07-24 pela auditoria do operador**: são **quatro** tipos
> (entrou o **Fechamento**), as posições do tamponamento são 4 (não 2), e as
> dimensões de tampo/rodapé estavam erradas.

Tampo, rodapé, tamponamento e fechamento são **o mesmo mecanismo**: elemento
aplicado a um conjunto (ou módulo individual), com dimensão **derivada da
geometria**. Isto elimina o "elemento contínuo do V1" como caso especial — não
é feature portada, é consequência do modelo novo.

```ts
type ElementoContinuo = {
  id: string
  tipo: "tampo" | "rodape" | "tamponamento" | "fechamento"
  alvo: { conjuntoId: string } | { moduloId: string }   // bloco ou módulo isolado
  posicao: PosicaoElemento                              // válida por tipo, ver tabela
  material: MaterialRef
  espessura: number
  // dimensões derivadas por regra (tabela abaixo); alguns tipos aceitam override
  override?: Partial<{ largura: number; profundidade: number; altura: number }>
  engrossamento?: Engrossamento                          // só tampo (ver 2.1)
}

type PosicaoElemento = "superior" | "base" | "esquerda" | "direita" | "topo"
```

#### Posições válidas por tipo

| Elemento | Posições possíveis |
|---|---|
| **Tampo** | `superior` (única) |
| **Rodapé** | `base` (única) |
| **Tamponamento** | `esquerda` · `direita` · `base` · `topo` (4) |
| **Fechamento** | `superior` · `esquerda` · `direita` (3) |

#### Regras de derivação de dimensão

| Elemento | Deriva de | Largura | Profundidade | Altura / Espessura |
|---|---|---|---|---|
| **Tampo** | Bloco (ou módulo isolado) | Largura total dos módulos | Profundidade **+ 30 mm** | **[V2.1]** depende do **modelo** — simples, engrossado ou dobrado (Seção 3.4.1) |
| **Rodapé** | Bloco inteiro | Largura total **− 30 mm** | Profundidade do módulo **− 130 mm** | **150 mm** (padrão) |
| **Tamponamento** | **Módulo da extremidade** (não o bloco) | — | Ver 3.5 | Ver 3.5 |
| **Fechamento** | Bloco (ou módulo) | 1 sarrafo na medida total: **largura total** (posição `superior`) ou **altura total** (posições laterais) | — | **50 mm** de largura do sarrafo (padrão) |

> **Derivado ≠ imutável.** Rodapé e Fechamento derivam os valores acima como
> **default no momento de adicionar, e todos os campos são editáveis** (o
> operador pode alterar altura do rodapé, largura do sarrafo do fechamento
> etc.). Já no **tamponamento** as dimensões continuam estritamente derivadas
> e não digitáveis (Seção 3.5) — é a exceção, porque ali digitar é fonte de
> erro sem ganho.

### 3.4.1 [V2.1] Tampo tem TRÊS modelos — modelo antes da espessura

> **Decisão do operador** (itens 3.10/3.11). O briefing V2 só conhecia
> engrossado e dobrado. **"Simples" é um terceiro modelo de primeira classe**,
> não "ausência de engrossamento". A ordem de escolha na UI é **modelo →
> espessura**, nunca o contrário: a lista de espessuras válidas depende do
> modelo.

```ts
type ModeloTampo = "simples" | "engrossado" | "dobrado"

type ConfigTampo =
  | { modelo: "simples";    espessura: 15 | 18 | 25 }
  | { modelo: "engrossado"; espessuraBase: 15 | 18; nivel: 1|2|3
      lados: LadoPlaca[]; larguraSarrafo?: number }
  | { modelo: "dobrado";    espessuraBase: 15 | 18; nivel: 1|2|3 }
```

**Invariante de compatibilidade com o tipo já implementado**
(`ElementoContinuo.engrossamento?: Engrossamento`):

```
modelo === "simples"     ⟺  engrossamento === undefined
modelo === "engrossado"  ⟺  engrossamento.tecnica === "engrossada"
modelo === "dobrado"     ⟺  engrossamento.tecnica === "dobrada"
```

O campo `modelo` é **explícito e persistido** mesmo sendo derivável — é ele que
dirige a UI e as mensagens de erro. Estado "sem modelo escolhido" não existe:
o default ao adicionar um tampo é `simples`.

#### Espessuras válidas por modelo (constraint, não sugestão)

| Modelo | Espessuras finais válidas | Como se obtém |
|---|---|---|
| **simples** | **15 · 18 · 25 mm** | peça única na espessura escolhida |
| **engrossado** ou **dobrado**, base 15 mm | **30 · 45 · 60 mm** | `15 × (1 + nivel)`, níveis 1·2·3 |
| **engrossado** ou **dobrado**, base 18 mm | **36 · 54 mm** | `18 × (1 + nivel)`, níveis 1·2 (nível 3 não existe — Seção 2.1) |

Regras absolutas:

1. **6 mm nunca é oferecido para tampo**, em nenhum modelo. Não é escolha de
   catálogo — é constraint de domínio.
2. **25 mm só existe no modelo simples.** Não é base de engrossamento.
3. **30/36/45/54/60 mm nunca aparecem no modelo simples** — nessas espessuras
   o marceneiro está descrevendo um resultado que só se obtém empilhando.
4. Trocar o modelo com uma espessura já escolhida: se a espessura não for
   válida no modelo novo, o sistema **limpa** o campo e força nova escolha, em
   vez de coagir para o valor mais próximo (coagir esconde erro de custo).

| Código de erro | Situação |
|---|---|
| `ESPESSURA_INVALIDA_PARA_MODELO` | espessura fora da tabela acima |
| `ESPESSURA_6MM_EM_TAMPO` | qualquer tentativa de 6 mm em tampo |
| `NIVEL_3_BASE_18` | nível 3 com base 18 mm (Seção 2.1) |

#### BOM do modelo simples (Q-4, linha que faltava)

Peça única, sem peças auxiliares, sem cola, sem usinagem:

```
1 peça de  larguraTotalDoBloco × (profundidadeDoModuloMaior + 30)  na espessura escolhida
fita de borda: bordas APARENTES apenas — frente + duas laterais
               (a borda de trás encosta na parede e não recebe fita)
fita usada: a menor fita ≥ espessura (Seção 2.1) → 15/18 mm ⇒ 22 mm · 25 mm ⇒ 35 mm
```

Os BOMs de engrossado e dobrado **não mudam** — continuam exatamente como
fechados na Seção 2.1, com os 6 exemplos do operador.

**Exemplo trabalhado — tampo simples de 25 mm:**

```
Entrada: bloco de 3 módulos inferiores: 600 + 800 + 400 de largura;
         profundidade do maior = 580; modelo simples, espessura 25 mm
Passo 1 — largura do tampo   = 600 + 800 + 400 = 1800
Passo 2 — profundidade       = 580 + 30 = 610
Passo 3 — peças              = 1 × (1800 × 610 × 25 mm)
Passo 4 — fita (3 bordas)    = 1800 + 610 + 610 = 3020 mm = 3,02 m
Saída:    1 peça 1800×610 em 25 mm · 3,02 m de fita de 35 mm · 0 sarrafo · 0 cola
```

**Exemplo trabalhado — o MESMO tampo engrossado nível 1 (base 15), 4 lados:**

```
Entrada: mesmo bloco (tampo 1800 × 610), modelo engrossado, base 15, nível 1,
         4 lados, sarrafo de 70 mm
Passo 1 — espessura final    = 15 × (1 + 1) = 30 mm
Passo 2 — peça principal     = 1 × (1800 × 610 × 15 mm)
Passo 3 — sarrafos do eixo maior (1800) = 2 × (1800 × 70)
Passo 4 — sarrafos do eixo menor        = 610 − (2 × 70) = 470 → 2 × (470 × 70)
Passo 5 — fita: espessura final 30 mm ⇒ fita de 35 mm; 3 bordas aparentes
                = 1800 + 610 + 610 = 3020 mm = 3,02 m
Saída:    1× 1800×610 · 2× 1800×70 · 2× 470×70 · 3,02 m de fita de 35 mm
Comparação: mesmo tampo, mesma face, 4 peças a mais e outra fita — é por isso
            que o modelo tem de ser escolhido ANTES da espessura
```

**Exemplo trabalhado — o MESMO tampo dobrado nível 1 (base 15):**

```
Entrada: mesmo bloco (tampo 1800 × 610), modelo dobrado, base 15, nível 1
Passo 1 — espessura final = 15 × (1 + 1) = 30 mm
Passo 2 — nº de placas    = nivel + 1 = 2
Saída:    2 × (1800 × 610 × 15 mm) · 3,02 m de fita de 35 mm · 0 sarrafo
```

**Exemplos de rejeição** (o motor precisa reproduzir os três):

```
modelo simples + espessura 30  → ESPESSURA_INVALIDA_PARA_MODELO
modelo engrossado + espessura 25 → ESPESSURA_INVALIDA_PARA_MODELO
qualquer modelo + espessura 6  → ESPESSURA_6MM_EM_TAMPO
```

### 3.5 Tamponamento (briefing 6.1) — deriva do módulo da extremidade

Encosta na face lateral de **um único módulo** (o da ponta exposta). Se o
bloco tem módulos de profundidades diferentes, a profundidade do tamponamento
vem do módulo da extremidade **daquele lado**, não do maior nem da média.

```ts
type Tamponamento = {
  tipo: "inteiro" | "sarrafo"
  posicao: "esquerda" | "direita" | "base" | "topo"   // 4 posições (corrigido 2026-07-24)
  material: MaterialRef            // cor — INPUT
  espessura: number                // INPUT
  // DERIVADOS — nunca digitáveis:
  //   altura       = altura do módulo da extremidade
  //   profundidade = "inteiro"  → profundidade do módulo da extremidade + 25mm
  //                  "sarrafo"  → 70mm (fixo)
}
```

**Inputs do usuário: tipo, posição, cor, espessura. Nada mais.**

> Nas posições `base` e `topo` o elemento corre na horizontal — a dimensão
> derivada da "altura do módulo da extremidade" passa a ser a **largura** do
> módulo da extremidade. A regra é a mesma (deriva do módulo da ponta exposta
> daquele lado), só muda o eixo.

### 3.6 O que quebra no `BoxModule` atual (briefing 6.4)

```ts
// ANTES (lib/engine/box/types.ts) — BayContent é union:
type BayContent =
  | { tipo: "espaco"; frente; prateleiras?; fundo? }
  | { tipo: "tamponamento"; lado; material; sarrafo }
// DEPOIS — tamponamento sai; BayContent deixa de ser union:
type BayContent = { frente; prateleiras?; fundo? }
```

- Parte do `docs/archive/13-correcoes-box-v3.md` ("tamponamento por lado")
  fica **obsoleta** — resolvia um problema que o modelo novo elimina.
- **Presets em localStorage migram** via `lib/engine/box/migrate.ts` (já
  idempotente, já passou por 2 rodadas). Como é pré-lançamento e localStorage,
  descarte com aviso é aceitável para presets com bay de tamponamento.

---

## 4. Schema de capacidades (novo — briefing Seção 3)

Cada tipo de item declara quais seções de configuração se aplicam. A UI lê
isto; não há condicional de tipo espalhada nos componentes.

```ts
type Capacidade =
  | "dimensoes" | "material" | "vaos" | "portas" | "gavetas"
  | "puxador" | "prateleiras" | "engrossamento" | "ripado"
  | "orientacao" | "bordaPorLado"

const CAPACIDADES: Record<ItemOrcamento["origem"], Capacidade[]> = {
  custom_box: ["dimensoes","material","vaos","portas","gavetas","puxador","prateleiras"],
  placa:      ["dimensoes","material","orientacao","bordaPorLado","engrossamento","ripado"],
}
```

Exemplo do princípio (briefing 3): não se oferece porta ou gaveta numa
prateleira ou painel ripado. O editor de item renderiza só as seções cujas
capacidades o item declara.

### 4.1 [V2.1] `ModuleViewer` (3D estático) — consome dado existente, não pede campo novo

> **Escopo estreito, decidido pelo operador (2026-07-31).** O `ModuleViewer` é
> um visualizador **adicional e não-interativo** do módulo já modelado: câmera
> ortográfica fixa (`'isometric' | 'front' | 'top' | 'side'`, programática, sem
> órbita), `@react-three/fiber` + `@react-three/drei` + `three`, carregado via
> `next/dynamic({ ssr: false })`. **Não reabre a decisão "sem 3D" do canvas
> técnico**: `BoxCanvas`, `ElevacaoParede` e `PlanoCorteCanvas` continuam 2D
> para sempre (Design System, Seção 9). Esta nota existe só para registrar a
> **origem do dado** — a decisão de UI é do ux-designer, não daqui.

Props e origem de cada uma — **nenhuma exige campo novo no domínio central**:

| Prop | Origem | Situação |
|---|---|---|
| `width`, `height`, `depth` (mm) | `BoxModule.largura` · `.altura` · `.profundidade` (`lib/engine/box/types.ts`) | ✅ já existe |
| `view` | estado de UI (botão de vista), não é dado de domínio | ✅ não é domínio |
| `color?` (hex) | **derivado** de `BoxModule.material.cor` pela função `corParaHex()` já existente (`app/components/ModulePreview.tsx`) | ✅ já existe, com ressalva abaixo |
| `textureUrl?` | **[2026-08-02] `especificacao.texturaUrl` do Produto tipo `chapa`** — Q-14 respondida, ver 4.1.1 | ✅ origem definida (imagens são pré-requisito de conteúdo) |

**Fonte única de verdade.** O `ModuleViewer` recebe as **mesmas dimensões e a
mesma geometria derivadas do `BoxModule`** que o canvas 2D já consome. É
proibido: (a) um segundo caminho de derivação de geometria só para o 3D;
(b) persistir qualquer coisa "de visualização" no item. Se o 3D e o 2D
divergirem, é bug de derivação, não diferença legítima de fonte.

**Ressalva sobre `color` — real, mas não bloqueante.** O domínio guarda
`material.cor` como **nome de padrão** (`"Branco TX"`, `"Carvalho Mel"`), nunca
como hex — nem em `MaterialRef`/`BoxMaterial`, nem na `especificacao` do
Produto (`{ cor: string; espessura: number }`). O hex de exibição hoje sai de
uma heurística por substring do nome (`corParaHex`), que acerta em meia dúzia
de famílias e devolve branco-claro para o resto. Com os ~380 padrões reais de
MDF (`docs/STATUS.md` Seção 5) ela vai errar na maioria.

> **Recomendação técnica (não é decisão de produto, é barata e reversível):**
> um campo **opcional** `corHex?: string` na `especificacao` do Produto tipo
> `chapa`, com fallback na heurística atual quando ausente. Fica no
> **catálogo** (uma linha por padrão), **nunca** em `MaterialRef`/`BoxMaterial`
> — este último é cópia denormalizada que viaja em cada peça, e replicar um hex
> ali congelaria a cor em orçamentos antigos e multiplicaria a mesma string por
> milhares de linhas. O `ModuleViewer` continua recebendo `color` já resolvido.

**`textureUrl` — pendência do operador, não decisão minha.** A modelagem é
trivial e a mesma da recomendação acima (`especificacao.texturaUrl` no Produto
tipo `chapa`, resolvido na renderização, nunca persistido no item). O que **não**
é trivial e **não** é decisão técnica: curar, recortar, converter para WebP e
hospedar ~380 texturas de padrões reais, e mantê-las quando o fornecedor troca
a linha. Isso é custo de produto e conteúdo. Registrado como **Q-14** (Seção
11.3). **Recomendação registrada: lançar com cor sólida.** Enquanto Q-14 não
for respondida, `textureUrl` permanece prop opcional sem origem no domínio — a
prop existe no componente, mas nada no catálogo a alimenta.

#### 4.1.1 [V2.1] Textura real — Q-14 respondida (2026-08-02)

> **Decisão do operador (2026-08-02)**: **textura real**, mapeando os ~380
> padrões de madeira do catálogo. A recomendação de lançar só com cor sólida foi
> **rejeitada**. `textureUrl` deixa de ser prop órfã e ganha origem no domínio.

**Onde vive**: campo opcional dentro do jsonb `especificacao` do `Produto` tipo
`chapa` — exatamente onde `cor` e `espessura` já moram.

```ts
interface EspecificacaoChapa {   // lib/produto/tipos.ts
  cor: string
  espessura: number
  corHex?: string      // recomendação da 4.1, permanece opcional
  texturaUrl?: string  // [Q-14] caminho da imagem de textura; ausente ⇒ cor sólida
}
```

**Por que campo, e não tabela própria** (a alternativa foi considerada):

| Critério | Veredicto |
|---|---|
| Cardinalidade | **1–1** com a linha de `produto` (um padrão de chapa, uma textura). Tabela 1–1 é join sem ganho |
| Atributos próprios | Nenhum. É uma string de caminho — sem dimensão física, sem escala, sem repetição, sem metadados que alguém consulte |
| Consulta por textura | Não existe nenhuma. Ninguém pergunta "quais produtos usam esta textura" |
| Compartilhamento entre orgs | O **arquivo** é compartilhado (bucket público curado pelo operador); a **referência** não precisa ser — `produto` já é cópia por org (D-15) e a cópia do signup leva `especificacao` inteira junto, textura incluída, sem trabalho extra |
| Custo de errar | Baixo nos dois sentidos: promover a tabela depois é migration de leitura simples |

Conclusão: **campo simples basta**. Uma tabela `textura` só se justificaria se a
imagem ganhasse atributos próprios (escala em mm, orientação do veio na imagem,
autoria/licença) — nenhum deles foi pedido.

**Regras**:

1. `texturaUrl` é **opcional**. Ausente ⇒ o `ModuleViewer` cai em `color`
   (`corParaHex`, A-19). O fallback continua sendo **um** e é o já existente —
   não nasce um terceiro caminho de cor.
2. É **caminho relativo dentro do bucket de texturas**, nunca URL externa. Uma
   URL arbitrária vinda do formulário de catálogo viraria hotlink para domínio
   de terceiro dentro do canvas do usuário. Validação na escrita, no catálogo.
3. As imagens são **conteúdo do operador**, em bucket **read-only** para
   `authenticated`: uma cópia só, compartilhada por todas as orgs — não 380
   imagens por tenant.
4. Nada de textura é persistido no **item** (`BoxModule`/`MaterialRef`). A
   resolução é na renderização, igual à cor (4.1). O motivo é o mesmo: cópia
   denormalizada congelaria a textura em orçamento antigo e multiplicaria a
   string por milhares de peças.
5. O plano de corte e a precificação **não** enxergam textura. É dado de
   exibição, não entra em BOM, custo nem rateio.

> **Pré-requisito de conteúdo, não de código**: as ~380 imagens precisam ser
> fornecidas, curadas e hospedadas pelo operador. Sem elas o campo existe e fica
> vazio, e o produto se comporta exatamente como o cenário "cor sólida". Isso é
> pré-requisito explícito da task — nota para o `backlog-planner`, não para o
> modelo.

---

## 5. Precificação e rateio (briefing 5.2, 7.4)

### 5.1 Modos de precificação (briefing 7.4, D-04)

Quatro modos; **um só no primeiro corte** (D-04). Configurado no perfil, com
override por orçamento (D-24 usa o mesmo padrão).

```ts
type ModoPrecificacao =
  | { modo: "multiplicador"; fator: number }       // × N sobre custo de material
  | { modo: "percentual";    percentual: number }  // + N% sobre custo de material
  | { modo: "por_chapa";     valorChapa: number }  // valor por chapa de MDF consumida
  | { modo: "fixo";          valor: number }        // valor fixo
```

> Verificação de código: `lib/engine/pricing.ts` hoje aplica um markup divisor
> sobre custo direto total (um divisor só). Os 4 modos exigem **estender** esse
> pipeline, não só parametrizar.

### 5.2 Rateio por custo alocado (briefing 5.2) — regra crítica

O custo **não é aditivo** (chapa compartilhada pelo aninhamento + quantizada
pela compra por chapa inteira). Rateia-se o **consumo real**, não custos
hipotéticos isolados. Fórmula (fechada no briefing, com exemplo numérico
verificado):

```
para cada material M:
  N(M) = nº inteiro de chapas de M no plano de corte (saída do bin-packing)
  chapasAlocadas(item, M) = N(M) × ( áreaPeças(item, M) ÷ Σ áreaPeças(M) )
  chapaAlocada(item, M)   = custoChapasCompradas(M) × ( áreaPeças(item, M) ÷ Σ áreaPeças(M) )

custoAtribuído(item) = Σ_M chapaAlocada(item, M)
                     + fitaDeBorda(item) + ferragens(item) + acessórios(item)   // atribuição direta, aditivos

preçoLinha = preçoFinal × ( Σ custoAtribuído(itens da linha) ÷ Σ custoAtribuído(todos os itens) )
```

Invariantes obrigatórios (viram teste — briefing 8 "Verificação"):
- **Base do rateio = área de peças do BOM**, NÃO ocupação no plano de corte
  (ocupação depende da ordem de inserção do bin-packing → mesmo móvel, preço
  diferente → indefensável e não-auditável).
- **Segregado por material** (branco não paga pela chapa amadeirada).
- **Rateia-se o preço FINAL** usando custo alocado como base de proporção — não
  se aplica markup ambiente a ambiente (coincidem em multiplicador/percentual,
  divergem em fixo/por_chapa; ratear o final fecha por construção nos 4 modos).
- **Arredondamento**: rateia todas as linhas menos a última; a última absorve o
  resíduo (soma das linhas == total, exato).
- **Inteiro para compra, fracionário para custo**: pré-pedido ao fornecedor usa
  `N` inteiro; rateio por ambiente usa fracionário.

### 5.3 Frete e montagem (D-23, D-24, D-25)

- **Frete (D-23)**: rateado proporcional ao custo alocado (não em partes iguais).
- **Montagem (D-24)**: um modo exclusivo por orçamento — `% do material` /
  `por chapa de MDF` / `manual`. **A base do rateio acompanha a base do
  cálculo** (montagem por chapa ⇒ rateio por chapas rateadas; não ratear por
  custo). Configurado no perfil (default), override por orçamento.
- **Visibilidade (D-25)**: frete e montagem **diluídos** nos valores por
  ambiente — o cliente vê só linhas de ambiente + total, nenhuma linha
  separada.
- **m² sai do produto por completo** (D-26) — eliminava ambiguidade de
  definição (frontal? de chapa? desenvolvida?), fonte garantida de bug.

### 5.4 Congelamento (briefing 5.2 "detalhes que mordem")

Como o rateio depende do aninhamento do orçamento inteiro, **adicionar um item
altera o valor de todos os outros**. `valorRateado` é persistido no
fechamento da proposta, não recalculado na renderização — proposta enviada é
imutável. Alerta de UI obrigatório: remover um ambiente **aumenta** o preço
dos demais; proposta se regenera, nunca se edita por subtração de linha.

### 5.4.1 [V2.1] Estado congelado do orçamento — `congeladoEm`, e a reabertura (Q-16)

> **Origem**: achado bloqueante 1 da reauditoria de 2026-08-01
> (`.maestro/tmp/Spec-Decline-Payload.md`). PRD, Modelo, Design-System e código
> usavam "no fechamento" e "orçamento não congelado" como se fossem estado
> consultável — e ele **não existia**
> (`lib/orcamento/buscar.ts:11` tem só `rascunho|enviado|aprovado|recusado`;
> `lib/lista-material/congelar.ts:20-29` registra a lacuna por escrito e manda
> parar). Esta seção define o estado. A parte de **reabertura** é a resposta do
> operador à **Q-16** (2026-08-02).

**O estado é um carimbo de tempo, não um status.**

```ts
// campo novo em Orçamento
congeladoEm: string | null   // ISO 8601; null = nunca congelado / reaberto
```

`estáCongelado(orc) === orc.congeladoEm !== null`. É a **única** forma de
responder a pergunta.

**Três eixos ortogonais, nunca colapsados** — mesmo princípio da Seção 7.2
(etapa de esteira):

| Eixo | Campo | Pergunta que responde | Quem escreve |
|---|---|---|---|
| Comercial | `status` | O cliente aceitou? | ação comercial |
| Operacional | `etapaEsteira` (7.2) | Em que ponto do processo está? | esteira |
| **Financeiro** | **`congeladoEm`** | **Os valores exibidos ainda podem mudar?** | congelar / reabrir |

Congelar **não** muda `status` (uma proposta congelada é justamente a que se
envia) e mudar `status` **não** congela. Congelar a **proposta** também não é o
mesmo ato que congelar a **lista de material** (`lista_material`, INSERT-only,
histórico próprio) — são dois congelamentos distintos, com dois artefatos
distintos.

#### Duas leituras, escolhidas pelo campo

| Leitura | Quando | De onde vem o valor exibido |
|---|---|---|
| **R1 — ao vivo** | `congeladoEm === null` | recalcula tudo (rateio da 5.2, plano de corte da 8.3) a cada render |
| **R2 — congelada** | `congeladoEm !== null` | `linhaProposta.valorRateado` persistido + `lista_material.snapshot` mais recente. **Nada é recalculado** |

Este é o defeito que o marceneiro relatou (backlog 0.7/1.4/2.2): hoje
`PropostaLab.tsx:77` recalcula a cada render e `:141` deriva o valor exibido do
snapshot em memória, não da linha persistida — ou seja, a aplicação está
permanentemente em R1.

#### Invariantes (viram teste)

- **I1 — fonte única.** `congeladoEm` é o único predicado de congelamento.
  Proibido inferir congelamento de `status`, de `etapaEsteira`, da existência de
  linha em `lista_material` ou da presença de `valorRateado`.
- **I2 — congelar é atômico com o rateio.** `congeladoEm !== null` ⇔ **toda**
  `linhaProposta` do orçamento tem `valorRateado !== null`. Um congelamento que
  falhe no meio não deixa o orçamento congelado. (CHECK do banco não alcança
  duas tabelas — a garantia é da Server Action, em transação.)
- **I3 — recongelar é permitido e sobrescreve sem histórico.**
  `linhaProposta` **não versiona**: o `valorRateado` anterior é perdido. A
  assimetria é deliberada e declarada: `lista_material` é INSERT-only e **guarda**
  histórico; `linha_proposta` não.
- **I4 — congelado não retroage.** Mudança de kerf (8.2), de preço de catálogo
  ou de algoritmo de corte (8.3) **não** altera valor de orçamento congelado.
  Só orçamento em R1 sente a mudança. É o aceite do RF-22 e do RF-34.
- **I5 — paridade no instante do congelamento.** Σ `valorRateado` das linhas ==
  preço final, exato, com a última linha absorvendo o resíduo (5.2).
- **I6 — reabrir zera o carimbo e preserva os valores.** `Reabrir` faz
  `congeladoEm ← null`, o que devolve a leitura R1. `valorRateado` das linhas
  **NÃO é apagado nem zerado** — permanece exatamente como estava até que um
  novo congelamento o sobrescreva (I3). Reabrir também move a etapa de esteira
  `fechado → aguardando_aprovacao` (7.2, T2); nas demais etapas não mexe na
  etapa.
- **I6a — reabrir é ação de `admin`.** *(Q-18, respondida pelo operador em
  2026-08-03: **só o papel `admin`/dono**.)* A ação `Reabrir` só executa se o
  usuário autenticado que a chama tiver `perfil.papel === 'admin'` na
  organização dona do orçamento. A checagem é **de aplicação**, dentro da
  própria Server Action / RPC, **antes** de qualquer escrita — mesmo padrão e
  mesma justificativa da exclusão de organização (7.3): `perfil.papel` não é
  usado por nenhuma política de RLS, então a autorização não é do banco, é da
  porta de entrada. Não-admin é **rejeitado explicitamente** com o erro
  **E-C3**; nada é escrito (`congeladoEm`, `valorRateado` e `etapaEsteira`
  permanecem intactos) e a ação **não** degrada para no-op silencioso.

**Por que I6 preserva `valorRateado` em vez de zerar** — dois motivos, o segundo
é o que decide:

1. Zerar destruiria o único registro em banco do que foi rateado por linha.
2. `linha_proposta.valor_rateado` é a **mesma coluna** do override manual do
   usuário (`PropostaLab.handleOverrideValor`, 5.2/Seção 6). Zerar na reabertura
   apagaria trabalho manual que o usuário fez e que nada tem a ver com
   congelamento. Zerar não é neutro — é destrutivo.

Consequência aceita e declarada: enquanto o orçamento está reaberto (R1), o
`valorRateado` persistido existe mas **não é lido** — é dado dormente, não
contradição. A tela mostra o valor recalculado.

#### Exemplo trabalhado — congelar (I2 e I5)

```
Entrada: 3 linhas de proposta
         custoAtribuído: L1 = 1.200,00 · L2 = 800,00 · L3 = 400,00  (Σ = 2.400,00)
         modo multiplicador, fator 1,91  ⇒  preço final = 2.400,00 × 1,91 = 4.584,00
Passo 1 — L1: 4.584,00 × (1.200,00 ÷ 2.400,00) = 4.584,00 × 0,5        = 2.292,00
Passo 2 — L2: 4.584,00 × (800,00 ÷ 2.400,00)   = 4.584,00 × 0,333333…  = 1.528,00
Passo 3 — L3 (última, absorve o resíduo): 4.584,00 − 2.292,00 − 1.528,00 =   764,00
Passo 4 — grava os 3 valorRateado E congeladoEm = 2026-08-02T14:10:00Z, na mesma transação
Saída:   2.292,00 + 1.528,00 + 764,00 = 4.584,00 == preço final ✓ (I5)
         F5, trocar de aba ou reabrir a tela em outro dia exibe 4.584,00 (R2)
```

#### Exemplo trabalhado — I4 (a mudança que não retroage)

```
Entrada: o orçamento acima, congelado por 4.584,00.
         O operador troca o kerf de 3 mm para 4 mm em /perfil (8.2), o plano de
         corte passa a exigir 1 chapa a mais e o custo de material sobe de
         2.400,00 para 2.520,00
Passo 1 — orçamento CONGELADO: nada é recalculado (R2) → continua 4.584,00
Passo 2 — outro orçamento, NÃO congelado, com o mesmo custo:
          2.520,00 × 1,91 = 4.813,20
Saída:   4.584,00 (congelado)  ≠  4.813,20 (ao vivo). Os dois estão certos.
```

#### Exemplo trabalhado — I6 (reabrir e recongelar)

> **Exemplo hipotético/prospectivo.** Ele parte de `etapaEsteira = fechado`, que
> é **deliberadamente inalcançável neste lançamento** — a única porta de entrada
> em `fechado` é o gatilho de aprovação, que só existe a partir do Lote 6 (7.2,
> nota 2). O exemplo ilustra a mecânica completa de I6 para quando `fechado` for
> alcançável; a aritmética vale como está. No lançamento, reabrir só ocorre em
> orçamento cuja etapa **não** é `fechado` — aí os passos 1, 2, 4 e 5 são
> idênticos e só o passo 3 não acontece (a etapa não muda).

```
Entrada: orçamento congelado em 2026-08-02T14:10:00Z (usuário chamador: admin — I6a)
         linhas: 2.292,00 / 1.528,00 / 764,00 · etapaEsteira = fechado
         kerf já mudou para 4 mm (custo atual 2.520,00)
Passo 1 — "Reabrir": congeladoEm ← null
Passo 2 — valorRateado das 3 linhas: INALTERADO (2.292,00 / 1.528,00 / 764,00) — I6
Passo 3 — etapaEsteira: fechado → aguardando_aprovacao (7.2, T2)
Passo 4 — leitura volta a R1: a tela recalcula → 2.520,00 × 1,91 = 4.813,20
Passo 5 — "Gerar proposta" de novo:
          L1: 4.813,20 × 0,5        = 2.406,60
          L2: 4.813,20 × 0,333333…  = 1.604,40
          L3: 4.813,20 − 2.406,60 − 1.604,40 = 802,20
Saída:   soma = 4.813,20 ✓ · congeladoEm = novo instante ·
         os valores antigos (2.292,00 / 1.528,00 / 764,00) deixam de existir em
         linha_proposta (I3). O que o cliente recebeu está no PDF já emitido, não
         no banco — ver A-21
```

#### Casos de borda

| Situação | Comportamento |
|---|---|
| Congelar sem nenhuma linha de proposta | **Erro E-C1**, não congela (I2 seria vacuamente verdadeira e o orçamento ficaria "congelado" sem nada congelado) |
| Congelar com Σ `custoAtribuído` = 0 (todas as linhas sem item ou sem custo) | **Erro E-C2**, não congela — divisão por zero na proporção da 5.2 |
| Uma linha com `custoAtribuído` = 0, outras não | Congela; a linha recebe `valorRateado` = 0,00. Zero é resultado legítimo |
| Congelar orçamento **já congelado** | Permitido — recongela e sobrescreve (I3). Não é erro |
| Reabrir orçamento **não congelado** (`congeladoEm` já null) | **No-op idempotente**, `ok: true`, não mexe em etapa nem em valor. A UI não oferece o botão, mas a ação tolera a chamada repetida. Vale **só para admin** — a checagem de papel (I6a) vem antes e não é tolerante |
| **Não-admin** chama "Reabrir" (por qualquer caminho: UI, chamada direta da ação) | **Rejeitado**, erro **E-C3**. Nada é escrito. A checagem de papel é a **primeira** do fluxo — vem antes até da checagem de idempotência, para que um `vendedor` não descubra por resposta `ok: true` que o orçamento já estava reaberto |
| Usuário edita itens/ambientes com o orçamento congelado | **Permitido, com aviso** (decisão do operador na Q-16: avisa, não bloqueia em silêncio). A edição entra; os valores da proposta **não mudam** enquanto R2 valer. Texto do aviso: **W-C1** |
| Orçamento congelado com `status = aprovado`, usuário reabre | Permitido — `status` e `congeladoEm` são ortogonais (I1). Ver **A-22** |
| Relógio | `congeladoEm` é sempre `now()` do **servidor**, nunca instante vindo do client |

#### Erros e avisos de domínio

| # | Situação | Mensagem |
|---|---|---|
| **E-C1** | Congelar sem linha de proposta | "Crie ao menos uma linha de proposta antes de gerar a proposta." |
| **E-C2** | Congelar com base de rateio zero | "Nenhuma linha tem custo — não há como ratear o valor da proposta." |
| **W-C1** | Editar orçamento congelado | "Esta proposta está congelada desde `<data>`. Suas alterações não mudam os valores até você reabrir o orçamento." |
| **E-C3** | Não-admin tenta reabrir (I6a) | "Só o administrador da organização pode reabrir um orçamento congelado." — código de erro `NAO_AUTORIZADO_REABRIR`; HTTP 403 quando a ação for exposta por rota |

> **Quem pode reabrir — Q-18, respondida em 2026-08-03: só o papel
> `admin`/dono.** A regra vive na invariante **I6a** acima (checagem de
> `perfil.papel === 'admin'` dentro da Server Action, antes de qualquer
> escrita) e no erro **E-C3**. Nenhuma política de RLS muda por causa disso.
>
> *Nota de robustez, não é pendência:* hoje toda organização tem exatamente um
> usuário, criado como `admin` pela trigger `handle_new_user` — na prática o
> dono é o único que consegue reabrir. A regra foi escrita **por papel**, não
> por "único usuário existente", então no dia em que houver convite e mais de um
> membro (ou mais de um `admin`) ela continua valendo sem alteração. Nada a
> modelar além disso.

### 5.5 Resumo financeiro — 6 campos (briefing 7.4)

| Campo | Definição |
|---|---|
| Preço final | Soma de tudo |
| Custo de material | Chapas + acabamentos + ferragens + acessórios |
| Montagem | Mão de obra (inclusive a própria) |
| Frete | Editável |
| Lucro final | Preço final − material − montagem − frete |
| Margem de lucro | Lucro final ÷ preço final |

D-07: "lucro final" exclui a remuneração do trabalho do próprio marceneiro —
montagem é custo mesmo quando ele mesmo executa. Escolha explícita.

---

## 6. Linha de Proposta (comercial — briefing 5.1)

Agrupamento **comercial**, criado pelo usuário, distinto do Conjunto físico.
Pode cruzar paredes e faixas (caso "Cozinha em L", duas paredes → uma linha).

```ts
type LinhaProposta = {
  id: string
  titulo: string              // default: nome do ambiente (D-17)
  itens: string[]             // 1..N itemIds (módulos e/ou placas)
  imagem: RenderRef           // render automático DO CONJUNTO de itens
  descricao: string           // pré-preenchida a partir dos dados dos itens
  valorRateado: number        // congelado no fechamento; sobrescrevível (override manual)
}
```

- **Default** (D-17): linha de proposta = ambiente. Zero trabalho no caso
  comum; usuário só intervém para dividir ou mesclar.
- **Restrição de canvas crítica** (briefing 5.1): o render recebe **lista de
  itens posicionados**, não um item. Verificação de código confirmou que
  `BoxCanvas.geometria(box)` renderiza **um por vez** — a mudança de assinatura
  para lista tem que vir **antes** de qualquer tela que dependa do render de
  conjunto.
- **Override manual com rebalanceamento** é primeiro corte, não extensão
  futura (briefing 5.2): edita uma linha, rebalanceia as demais preservando a
  soma. `valorRateado` é campo persistido e sobrescrevível.

---

## 7. Entidades de persistência (briefing 7.5) — multi-tenant

Hoje: gabaritos em localStorage, lista de módulos em `useState` — nada
sobrevive a reload. A V2 persiste tudo, com tenant.

| Entidade | Escopo | Conteúdo | Estratégia |
|---|---|---|---|
| **Organização** | — | Tenant raiz (D-13). **Dados do emitente que saem na proposta**: marca/logo, **CNPJ**, **endereço**, **telefone** | RLS root |
| **Usuário / Perfil** | Org | Nome, e-mail, telefone, unidade (mm/cm, D-05 global), alturas padrão das faixas, modo de precificação padrão, modo de montagem padrão, **[V2.1] espessura de serra padrão (kerf — Seção 8.2)** | RLS por org |
| **Cliente** | Org | **Nome, telefone, endereço** — capturados ao criar o orçamento; alimentam a proposta | RLS por org |
| **Produto** | Org | Chapas, ferragens, LEDs, acessórios | **Cópia no signup** (D-15) — preço é local |
| **Módulo / Gabarito** | Global + Org | Por categoria | **[V2.1]** base global read-only + **fork** + **criação do zero** + **promoção só do operador** (7.1) |
| **[V2.1] Preset de elemento de parede** | Org | Só `nome` (+ largura/altura de prefill) | RLS por org. **Não é Produto**, não tem preço nem status (Seção 3.2.3) |
| **Orçamento** | Org | Ref. ao Cliente, status, itens, **prazo de entrega**, **[V2.1] `congeladoEm` (5.4.1)**, **[V2.1] `etapaEsteira` (7.2)** | RLS por org |
| **Ambiente** | Orçamento | Nome, ordem | **[V2.1] N por orçamento**; `on delete cascade` do orçamento |
| **Parede** | Ambiente | Nome livre, altura, largura, `alturasOverride`, elementos, itens posicionados | **[V2.1] N por ambiente**; `on delete cascade` do ambiente |
| **Elemento contínuo** | Parede/Conjunto | Tampo, rodapé, tamponamento | — |
| **Linha de Proposta** | Orçamento | Agrupamento, render, descrição, `valorRateado` congelado | — |
| **Lista de material fechada** | Orçamento | Snapshot congelado, extraível (D-08: texto/CSV) | — |

> **[V2.1] O plano de corte não é entidade persistida.** Ele é **derivado**:
> calculado a partir das peças, dos parâmetros de chapa e do kerf, de forma
> determinística (Seção 8.3). Não há tabela de job, fila, payload nem worker
> externo — a proposta anterior nesse sentido foi descartada pelo operador. O
> que persiste do plano é apenas o **resultado congelado** dentro do snapshot
> de lista de material (`versao: 1`, inalterado).

**Cuidados de RLS (briefing 4.1)** — critério de aceitação, não follow-up:
- Cliente Supabase de servidor e de browser estritamente separados; `service_role`
  jamais no cliente.
- Toda tabela multi-tenant nasce com RLS + política **na mesma migration**.
- **Um teste de isolamento por tabela**: tenant A não lê dados do tenant B.

### 7.1 [V2.1] Ciclo de vida do Módulo/Gabarito (D-10 estendido)

> **Decisão do operador.** A Seção 7 já dizia "base global read-only + fork na
> edição". Falta**va** dizer que criar do zero também é caminho válido para o
> marceneiro, e que existe promoção org → global — **exclusiva do operador**.

**Três caminhos de criação, um de promoção:**

| # | Caminho | Quem | `organizacaoId` | `origemGabaritoId` |
|---|---|---|---|---|
| 1 | **Semente global** | Operador (seed/admin) | `null` | `null` |
| 2 | **Fork de um global** | Usuário da org, ao editar um global | org do usuário | id do global |
| 3 | **[V2.1] Criação do zero** | Usuário da org | org do usuário | `null` |
| 4 | **[V2.1] Promoção org → global** | **Só o operador** | `null` (linha NOVA) | id do gabarito de org promovido |

Regras que sustentam isso:

1. `organizacaoId === null` significa **global read-only para todas as orgs**.
   Nenhum usuário autenticado cria, edita ou apaga linha global — a RLS de
   `insert`/`update`/`delete` já exige `organizacao_id = org do usuário`.
2. **Criar do zero é escrita normal de org.** Não exige gabarito de origem;
   `origemGabaritoId` fica `null` e isso não o confunde com um global, porque
   o discriminante é `organizacaoId`, nunca a linhagem.
3. **Promoção é CÓPIA, nunca reparent.** Promover cria uma **linha global
   nova** com a mesma `definicao`; a linha da org **permanece intacta e
   editável pelo dono**. Reparent (`organizacao_id := null`) é proibido:
   tiraria do marceneiro o direito de editar o próprio módulo e o publicaria
   para concorrentes sem que ele perdesse a autoria — efeito colateral
   inaceitável de uma operação administrativa.
4. **Promoção não é automática e não é decisão do marceneiro.** Não existe
   botão "promover" na aplicação do usuário. É operação de operador, via
   `service_role` / painel administrativo, fora do alcance da RLS de
   `authenticated`.
5. **Linhagem preservada**: o global promovido guarda `origemGabaritoId`
   apontando para o gabarito de org que o originou. Serve para auditoria e
   para a regra 6.
6. **Deduplicação na listagem** (derivada, não persistida): a biblioteca de
   uma organização **esconde o gabarito global cuja origem é um gabarito da
   própria organização** — senão o marceneiro que teve o módulo promovido
   passa a ver o próprio módulo duas vezes.

**Exemplo trabalhado — promoção:**

```
Entrada: org "Marcenaria Silva" tem o gabarito G7 (organizacaoId = silva,
         origemGabaritoId = null, criado do zero pelo marceneiro)
Passo 1 — operador promove G7
Passo 2 — nasce G7' { organizacaoId: null, origemGabaritoId: G7 }
Passo 3 — G7 continua existindo, ainda editável pela Marcenaria Silva
Saída:    outras orgs veem G7' e podem forkar (fork de G7' → origemGabaritoId = G7')
          a Marcenaria Silva vê só G7 (G7' é escondido pela regra 6)
```

**Efeito no fork existente:** forkar um global continua sendo cópia com
`origemGabaritoId` = id do global. Nada muda no caminho 2.

### 7.2 [V2.1] Etapa de esteira do orçamento (Q-6 e Q-15 — resolvidas em 2026-08-02)

> **Decisão do operador (2026-08-02)**: a esteira é **workflow real**, não campo
> select manual. O sistema **transiciona sozinho** conforme ações do usuário.
> Isso revogou o "campo manual" como opção. Nota histórica: o `docs/PRD.md`
> dizia "workflow automático é projeto próprio e fica fora em qualquer cenário"
> (Seção "Fora do escopo" e 7.4) — **texto já corrigido pelo
> `product-strategist`** (PRD, Seção 6). Não há mais contradição entre os dois
> documentos.

#### O enum

```ts
type EtapaEsteira =
  | "novo"                  // [proposta técnica] inicial — nasce com o orçamento
  | "visita_agendada"       // operador
  | "projeto_3d"            // operador
  | "aguardando_aprovacao"  // operador
  | "fechado"               // [proposta técnica] terminal — o ciclo acabou
```

| Etapa | Origem | Terminal? | Rótulo no card (Q-15) |
|---|---|---|---|
| `novo` | **proposta técnica** — o operador não citou; sem ele o campo nasceria nulo e a máquina não teria entrada | não | *nenhum de esteira* — o card mostra o status comercial ("Rascunho") |
| `visita_agendada` | operador | não | **Em andamento** |
| `projeto_3d` | operador | não | **Em andamento** |
| `aguardando_aprovacao` | operador | não | **Em andamento** |
| `fechado` | **proposta técnica** — o operador não citou; sem terminal, todo orçamento fica "Em andamento" para sempre | **sim** | **Fechado** (só a partir do Lote 6 — ver nota 2 abaixo da tabela de gatilhos) |

Duas notas sobre as propostas técnicas (as duas são baratas de trocar de nome;
nenhuma regra depende do rótulo, só da posição):

- **`fechado` significa *encerrado*, não *ganho***. Ganhou ou perdeu é pergunta
  do eixo comercial (`status = aprovado | recusado`), que já existe. Por isso
  **não** existe um estado `perdido` na esteira: seria informação derivável, e o
  modelo não persiste derivado (Seção 0). Bate com a Design-System §2.5, que já
  descreve "Fechado" como *"arquivado/finalizado — distinto de aprovado"*.
- **Não** entraram etapas de produção/instalação/medição: o operador não as
  citou e nenhuma tela as pede. Acrescentar depois é aditivo (a máquina é por
  posição, não por contagem).

#### Onde vive, e por que não é `status`

Campo novo em `Orçamento`, **ortogonal** ao `status` comercial — o mesmo
princípio já aplicado a `congeladoEm` na 5.4.1:

```ts
etapaEsteira: EtapaEsteira   // default "novo"
status: "rascunho" | "enviado" | "aprovado" | "recusado"   // INTOCADO
```

`status` responde *"o cliente aceitou?"*; `etapaEsteira` responde *"em que ponto
do processo estamos?"*. Um orçamento pode estar em `projeto_3d` (esteira) e
`rascunho` (comercial) — as duas afirmações são verdadeiras ao mesmo tempo.
Colapsar os eixos num enum só produziria o produto cartesiano deles e tornaria
impossível responder qualquer uma das duas perguntas.

#### Transições válidas

- **T1 — entre não-terminais, movimento livre (frente e trás).** De qualquer
  etapa não-terminal o usuário pode ir a qualquer outra não-terminal. Pular é
  normal (marcenaria que não faz 3D vai de `visita_agendada` direto para
  `aguardando_aprovacao`) e voltar é correção de erro de digitação, que não
  merece custo nenhum.
- **T2 — o terminal tem porta única, nos dois sentidos.**
  - **Entra** em `fechado` **somente** pelo gatilho de aprovação (tabela
    abaixo). **Não** há avanço manual para `fechado`: o seletor de etapa da UI
    oferece apenas as etapas não-terminais. Como o fluxo de aprovação está fora
    do corte de lançamento, `fechado` é **deliberadamente inalcançável nesta
    fase** — ver a nota logo após a tabela de gatilhos.
  - **Sai** de `fechado` **somente** pela ação **Reabrir**, que é a mesma ação
    da 5.4.1/I6 — reabrir descongela **e** volta a etapa para
    `aguardando_aprovacao`. Não existe "editar a etapa" de um orçamento fechado.
- **T3 — nenhuma transição é implícita.** Toda mudança de etapa vem de um
  gatilho da tabela abaixo ou de uma escolha explícita do usuário. Nada muda de
  etapa "por consequência" de recalcular, abrir tela ou salvar item.

#### Gatilhos — qual ação dispara qual transição

Cruzado com as ações que **existem de fato** no produto hoje:

| Ação do usuário | Onde está no código | Transição | Automática? |
|---|---|---|---|
| Criar orçamento | `lib/orcamento/criar.ts:108` (já grava `status: "rascunho"`) | ∅ → `novo` | sim (default da coluna) |
| **Gerar proposta** | `PropostaLab.handleGerarProposta` (`components/orcamento/PropostaLab.tsx:248`) | etapa ← `aguardando_aprovacao`, **se** a etapa atual for anterior a ela. Se já for `fechado`, **não muda** (só recongela — I3) | sim, no **mesmo ato** que congela (5.4.1) |
| **Reabrir** | ação **nova** (Q-16) | `fechado` → `aguardando_aprovacao`; nas demais etapas não mexe | sim, junto com `congeladoEm ← null` (I6) |
| **Aprovar orçamento** | **não existe no produto hoje** — o fluxo de aprovação está fora do corte de lançamento (`docs/PRD.md`, "Fora do escopo") | `aguardando_aprovacao` → `fechado` **e** `status ← aprovado` | sim, **quando a ação existir** |
| Agendar visita / marcar projeto 3D | **não existe ação correspondente** no produto (o `ModuleViewer` é visualizador, não marco de processo — 4.1) | `novo`/qualquer não-terminal → `visita_agendada` / `projeto_3d` | **não — manual**, por T1 |

Duas leituras honestas desta tabela, que valem como especificação:

1. **Duas das cinco etapas não têm gatilho automático** porque não existe ação
   no produto que as signifique. Elas são movidas à mão (T1). Inventar um
   gatilho para elas seria inventar produto.
2. **`fechado` é inalcançável nesta fase de lançamento — de propósito.** Sua
   única porta de entrada é o gatilho de aprovação, e o fluxo de aprovação está
   fora do corte de lançamento (decisão já tomada). `fechado` passa a ser
   alcançável **quando o fluxo de aprovação for construído** (Lote 6,
   pós-lançamento) e fornecer o gatilho real. Isto é **esperado e correto**, não
   defeito do modelo: a alternativa — expor `fechado` no seletor manual — criaria
   um beco sem saída, porque sair de `fechado` depende da ação **Reabrir**, que
   é restrita ao papel `admin` (**I6a**, 5.4.1 — Q-18 respondida em 2026-08-03).
   Consequências práticas no
   lançamento: o badge **"Fechado"** (Q-15) fica especificado mas nunca renderiza;
   a transição de saída T2 e o erro **E-E1** ficam especificados mas não
   exercitados. Nenhum dos três é removido — todos ganham dono quando o Lote 6
   chegar.

#### Q-15 — os badges "Em andamento" e "Fechado" (resolvida)

> **Decisão do operador (2026-08-02)**: *não criar um segundo campo de status*.
> Os dois badges que a Design-System §2.5 reservou são **rótulos visuais de
> etapas da esteira**, não valores novos do enum `status`.

A regra é determinística e total — um badge por card, sem ambiguidade:

```
rotuloDoCard(status, etapaEsteira):
  se etapaEsteira === "fechado"                → "Fechado"
  se etapaEsteira ∈ {visita_agendada,
                     projeto_3d,
                     aguardando_aprovacao}     → "Em andamento"
  senão (etapaEsteira === "novo")              → rótulo do status comercial
                                                 ("Rascunho" | "Enviado" |
                                                  "Aprovado" | "Recusado")
```

Com isso os 5 badges da Design-System §2.5 passam a ter origem: **Rascunho,
Enviado, Aprovado** vêm de `status`; **Em andamento** e **Fechado** vêm de
`etapaEsteira`. (O badge de **Recusado**, que hoje não tem token de cor, é
lacuna do `product-designer` — observação 1 da reauditoria —, não de domínio.)
A escolha visual de exibir **um** badge com esta precedência é confirmável pelo
`product-designer`; o que este documento fixa é a **origem** de cada rótulo.

#### Exemplo trabalhado — o ciclo completo

> Os passos 4 e 5 **só ocorrem a partir do Lote 6** (pós-lançamento), quando o
> fluxo de aprovação existir: é ele que fornece a única entrada em `fechado`. No
> lançamento o ciclo termina no passo 3.

```
Entrada: marceneiro cria orçamento para o cliente "Ana" em 02/08
Passo 1 — criar            → etapaEsteira = novo          · status = rascunho   · badge "Rascunho"
Passo 2 — marca visita     → etapaEsteira = visita_agendada (manual, T1)        · badge "Em andamento"
Passo 3 — pula o 3D e clica "Gerar proposta"
                           → etapaEsteira = aguardando_aprovacao (gatilho)
                             congeladoEm  = 2026-08-02T14:10:00Z (5.4.1)
                             status       = rascunho (INALTERADO — ver A-20)    · badge "Em andamento"
Passo 4 — cliente aprova; marceneiro marca aprovado
                           → etapaEsteira = fechado · status = aprovado         · badge "Fechado"
Passo 5 — cliente pede mais um armário; marceneiro clica "Reabrir"
                           → etapaEsteira = aguardando_aprovacao (T2)
                             congeladoEm  = null (I6)                           · badge "Em andamento"
Saída:   4 etapas percorridas, 2 delas por gatilho automático (passos 3 e 5),
         `status` mexido uma única vez, por ação comercial explícita (passo 4)
```

#### Casos de borda

| Situação | Comportamento |
|---|---|
| Orçamentos criados **antes** desta coluna existir | Recebem `novo` no backfill da migration (`default` + `not null`). É a leitura correta: nunca entraram na esteira |
| Usuário tenta sair de `fechado` mudando a etapa na UI | **Bloqueado** (T2). A única saída é **Reabrir**, que também descongela. Erro **E-E1** |
| Usuário tenta mover para uma etapa que não existe no enum | Rejeitado no banco (`check`) e na Server Action. Erro **E-E2** |
| "Gerar proposta" num orçamento já em `fechado` | Recongela (I3) e **mantém** `fechado`. Gerar proposta nunca retrocede etapa |
| Reabrir um orçamento que não está em `fechado` | A etapa não muda; só o descongelamento acontece (I6). Não é erro |
| Excluir o orçamento | A etapa some junto — não há histórico de esteira (**A-23**) |

#### Erros de domínio

| # | Situação | Mensagem |
|---|---|---|
| **E-E1** | Tentativa de sair de `fechado` sem reabrir | "Este orçamento está fechado. Para voltar a editá-lo, use Reabrir." |
| **E-E2** | Etapa fora do enum | "Etapa de esteira inválida." |

### 7.3 [V2.1] Excluir conta = excluir a organização (Q-13 — decidida em 2026-08-02)

> **Decisão do operador (2026-08-02)**: excluir conta apaga a **organização
> inteira**, não só o usuário. Escolha entre as três da Q-13 original
> (cascata · anonimização · retenção por prazo): **cascata**. Não existe coluna
> de exclusão lógica, não existe rotina de expurgo por prazo, não existe
> anonimização. É destruição imediata e irreversível.

> **Complemento do operador (2026-08-03 — Q-17)**: **quem** pode disparar é
> **só o papel `admin`/dono**. Especificado abaixo, em "Quem pode disparar".
> O cascade já estava completo e não muda por causa disso.

#### Ponto de partida real (verificado no schema)

| Fato de hoje | Consequência |
|---|---|
| `perfil.id references auth.users(id) on delete cascade` | Apagar o usuário do Auth apaga o `perfil`… e **só** |
| `organizacao` **não tem** política de `delete` para `authenticated` (só `select`/`update` — `20260724181915_fundacao_multitenant.sql:88-103`) | A org **não pode** ser apagada por DML de app hoje. Isso é acerto e **permanece assim**: a única porta é a Server Action / RPC, onde a checagem de papel cabe (ver "Quem pode disparar") |
| `perfil.papel` existe (`admin`/`vendedor`/`projetista`), mas **nenhuma política de RLS nem regra de produto o usa** | A autorização por papel **não** é do banco. Tem que ser checada **na aplicação**, dentro da própria ação |
| Todas as tabelas de tenant têm `organizacao_id ... on delete cascade` | Apagar a linha de `organizacao` **é** o mecanismo de cascata. Não é preciso inventar nada |

Ou seja: hoje "excluir conta" pelo caminho óbvio (apagar o usuário do Auth)
deixaria a organização **órfã com todos os dados** — exatamente o oposto da
decisão. O ato correto é apagar a linha de `organizacao`.

#### Cascade documentado — o que morre quando `organizacao` é apagada

| Tabela | FK | Efeito |
|---|---|---|
| `perfil` | `organizacao_id` cascade | apagado (todos os usuários da org) |
| `cliente` | `organizacao_id` cascade | apagado |
| `produto` | `organizacao_id` cascade | apagado (catálogo é cópia por org — D-15) |
| `gabarito` | `organizacao_id` cascade, **nullable** | apagados **só os da org**. Os globais (`organizacao_id is null`) **sobrevivem** — corretíssimo, são de todo mundo |
| `orcamento` | `organizacao_id` cascade | apagado → e com ele, por FK própria: |
| ↳ `ambiente` | `orcamento_id` cascade | apagado |
| ↳ `parede` | `ambiente_id` cascade | apagado (com `elementos`/`itens` no jsonb) |
| ↳ `linha_proposta` | `orcamento_id` cascade | apagado (inclui `valor_rateado` congelado) |
| ↳ `lista_material` | `orcamento_id` cascade | apagado (inclui todo o histórico de snapshots) |
| ↳ `elemento_continuo` | `orcamento_id` cascade | apagado |
| `elemento_parede_preset` | `organizacao_id` cascade (tabela nova, Q-5 — delta §5) | apagado |
| **Toda tabela futura com `organizacao_id`** | **obrigatoriamente** `on delete cascade` | regra permanente: sem isso, a exclusão quebra ou deixa resíduo |

#### Quatro armadilhas técnicas (nenhuma é opinião — todas saem do schema atual)

1. **`orcamento.cliente_id references cliente (id) on delete restrict`
   (`20260727090300_orcamento.sql:19`) aborta a cascata.** `RESTRICT` é
   verificado **imediatamente**, e não espera o fim do comando — mesmo que a
   linha de `orcamento` também vá ser apagada pela mesma cascata, a ordem entre
   os dois ramos não é garantida e o `DELETE` da organização pode falhar com
   violação de FK. Correções possíveis, nesta ordem de preferência:
   **(a)** trocar por `on delete no action` (verificação diferida para o fim do
   comando, e o comportamento de proteção do dia a dia continua igual); ou
   **(b)** a rotina apagar `orcamento` antes de `cliente`, explicitamente. Sem
   uma das duas, a exclusão de conta **falha em produção com dado real** e passa
   em teste com org vazia.
2. **Apagar `organizacao` não apaga `auth.users`.** A cascata é do pai para os
   filhos: `perfil` morre, o login **não**. O usuário continua conseguindo
   autenticar, fica sem `perfil`, `org_do_usuario()` devolve `null` e toda RLS
   nega — aplicação inutilizável, e nenhum vazamento, mas o dado pessoal
   (e-mail) **permanece no Auth**, o que contraria a decisão de exclusão. A
   rotina precisa: **(i)** ler os `perfil.id` da org **antes** de apagar (depois
   eles não existem mais), **(ii)** apagar a `organizacao`, **(iii)** apagar
   cada usuário do Auth (Admin API / `service_role`). A ordem importa.
3. **Storage não tem FK.** Logo da organização (buckets das Tasks 4.8–4.9),
   **foto de perfil pessoal** dos usuários (Task 4.11) e **renders de proposta**
   (bucket `linha-proposta-renders`, Task 13.6a) **não** são apagados por
   cascade nenhum. Precisam de expurgo por prefixo na mesma rotina, senão sobra
   arquivo órfão — e, com ele, dado que deveria ter sido eliminado.
4. **`gabarito.origem_gabarito_id ... on delete set null`**: um gabarito global
   promovido a partir de um gabarito desta org perde a linhagem (vira `null`) e,
   com ela, a deduplicação da regra 6 da 7.1 deixa de escondê-lo. Efeito
   correto — a org não existe mais para quem esconder — mas registrado para não
   parecer bug depois.

#### Quem pode disparar (Q-17 — respondida em 2026-08-03)

**Só o papel `admin`/dono.** Um `vendedor` ou um `projetista` **não** pode
apagar a organização.

**Onde a checagem vive: na aplicação, dentro da própria Server Action / RPC —
não no banco.** Dois fatos, já verificados no schema, obrigam isso:

1. `perfil.papel` existe mas **nenhuma política de RLS o consulta**. Não há
   autorização por papel no banco para reaproveitar.
2. Não existe política de `delete` em `organizacao` para `authenticated`, **de
   propósito** — e essa política continua não existindo. Logo a **única** porta
   para a exclusão é a Server Action / RPC `SECURITY DEFINER`. Ter uma porta só
   é o que torna a checagem de aplicação suficiente: não há caminho paralelo por
   PostgREST para contorná-la.

**Como a checagem acontece** — sequência obrigatória, e a ordem faz parte da
especificação:

```
1. resolve o usuário autenticado (auth.uid()) — nunca um id vindo do client
2. lê perfil.papel desse usuário, na organização alvo
3. se papel !== 'admin'  → ABORTA com E-D1. Nada é apagado. Nenhum passo do
                           cascade, nenhuma chamada ao Auth, nenhum Storage
4. só então: confirmação explícita já dada → executa o cascade (passos 1–5 do
   exemplo trabalhado abaixo)
```

A checagem é a **primeira** operação da ação, antes da leitura dos perfis
(armadilha 2) e antes de qualquer `delete`. Rejeição é **explícita** — nunca
falha silenciosa, nunca sucesso aparente:

| Situação | Comportamento |
|---|---|
| `papel === 'admin'` | prossegue |
| `papel` é `vendedor` ou `projetista` | **E-D1**, código `NAO_AUTORIZADO_EXCLUIR_ORG`, HTTP 403 se exposta por rota |
| sem sessão (`auth.uid()` nulo) ou sem `perfil` na org alvo | mesma rejeição **E-D1** — ausência de papel não é `admin` |

| # | Situação | Mensagem |
|---|---|---|
| **E-D1** | Não-admin tenta excluir a organização | "Só o administrador da organização pode excluir a conta." |

> *Nota de robustez, não é pendência:* hoje toda organização tem exatamente um
> usuário, criado como `admin` pela trigger `handle_new_user` — na prática só o
> dono existe para disparar. A regra foi escrita **por papel**, não por "único
> usuário existente hoje", então quando houver convite e uma org com vários
> membros — inclusive vários `admin` — ela já vale sem alteração. Nada a
> modelar além disso.

#### Regras da ação

1. **Confirmação explícita obrigatória.** Não é ação de um clique. O desenho do
   diálogo é do `product-designer` (reaproveitar o padrão de confirmação
   destrutiva que já existe); o domínio só exige que a confirmação exista, seja
   explícita e diga o que será apagado.
2. **Irreversível e sem undo.** Nenhum soft-delete, nenhuma lixeira, nenhum
   prazo de retenção — foi a escolha do operador entre as três alternativas.
3. **Não é DML de app.** A exclusão **não** ganha política de `delete` em
   `organizacao` para `authenticated`. Criar essa política contradiria a Q-17
   ("qualquer membro apaga o tenant com uma chamada PostgREST", sem passar pela
   checagem de papel). O caminho é uma Server Action / RPC `SECURITY DEFINER`
   com a condição `perfil.papel === 'admin'` **dentro** dela — ver "Quem pode
   disparar".
4. **Revisão de segurança é pré-requisito de implementação**, não follow-up:
   é a única operação destrutiva multi-tabela do produto e a única que toca
   `auth.users` e Storage. Recomendação registrada: `security-auditor` revisa a
   task antes do merge.

#### Exemplo trabalhado — cascata

```
Entrada: org "Marcenaria Silva" com 1 admin, 12 clientes, 34 orçamentos
         (com ambientes, paredes, linhas de proposta e listas de material),
         180 produtos de catálogo, 9 gabaritos próprios e 1 gabarito promovido
         a global (G7' , organizacao_id = null, origem = G7)
         quem chama: ana@silva.com, perfil.papel = admin
Passo 0 — checa o papel do chamador: admin ✓ (se não fosse: E-D1, aborta aqui)
Passo 1 — lê os perfis da org: [ana@silva.com]                     (1 usuário)
Passo 2 — delete from organizacao where id = silva
          → cascata apaga: 1 perfil · 12 clientes · 180 produtos · 9 gabaritos ·
            34 orçamentos → e por eles: ambientes, paredes, linhas de proposta,
            listas de material, elementos contínuos e presets de elemento
Passo 3 — G7' (global) SOBREVIVE, com origem_gabarito_id ← null (armadilha 4)
Passo 4 — apaga ana@silva.com de auth.users (armadilha 2)
Passo 5 — apaga os objetos de Storage sob o prefixo da org (armadilha 3)
Saída:   0 linha remanescente com organizacao_id = silva, em nenhuma tabela ·
         0 login remanescente · 1 gabarito global preservado e sem linhagem
```

#### Casos de borda

| Situação | Comportamento |
|---|---|
| Org com **mais de um** usuário | O cascade apaga **todos** os perfis e todos os logins. É a consequência direta da decisão — e é por isso que só `admin` dispara (Q-17) |
| **Não-admin** clica "excluir conta" | **Rejeitado** com **E-D1**, antes de qualquer escrita. Nada é apagado, nem o próprio acesso dele |
| Usuário que quer sair **sem** apagar a org (só a própria conta) | **Não modelado, e continua fora de escopo** — a Q-17 respondeu quem exclui a org, não criou uma segunda ação. "Sair da organização" só faz sentido quando existir convite/gestão de membros; até lá não há usuário não-admin para sair |
| Org com orçamento congelado / proposta já enviada ao cliente | Apagada junto. Não há retenção (decisão do operador). O PDF que o cliente recebeu é registro externo |
| Falha no meio (org apagada, Auth não) | Estado inconsistente **tolerável e detectável**: usuário sem perfil, RLS nega tudo. A rotina deve ser idempotente e poder ser reexecutada para limpar o Auth |
| Último gabarito global promovido pela org | Sobrevive (regra: global é de todos), com linhagem nula |

---

## 8. Veio de chapa (briefing 7.3) — restrição no bin-packing

> **Ampliado em 2026-07-24 pela auditoria do operador**: não basta a flag no
> material — o sentido do veio precisa ser **visível e alterável por peça**.

```ts
// no cadastro do material:
type MaterialRef = { /* ...atual... */ temVeio: boolean }

// por peça — qual dimensão da peça se alinha ao COMPRIMENTO da chapa (2720mm):
type SentidoVeio = "comprimento" | "largura"
type Peca = { /* ...atual... */ sentidoVeio: SentidoVeio }
```

**Semântica** (exemplo do operador, peça 800×400):
- `sentidoVeio: "comprimento"` → a medida de **800 mm** corre no sentido dos
  2720 mm da chapa (veio "de pé" nos 800).
- `sentidoVeio: "largura"` → a medida de **400 mm** corre no sentido dos
  2720 mm (veio "deitado" nos 400).

**Defaults para módulos-caixa** (não exigem escolha do usuário):
- Peças derivadas de **altura** e **largura** do módulo → alinhadas ao
  **comprimento (2720 mm)**.
- Peças derivadas de **profundidade** → alinhadas à **largura (1820 mm)**.

**Placas**: o sentido é **visível e alterável ao adicionar a placa** (requisito
de UX — a representação visual precisa mostrar a direção do veio).

- **Bin-packing aceita rotação apenas quando `!temVeio`.** Com veio, a peça é
  posicionada respeitando o `sentidoVeio` — a rotação deixa de ser livre.
- Verificação de código confirmada: `lib/engine/box/cutting.ts:75-77` **hoje
  rotaciona sem restrição** (`{...p, w: p.h, h: p.w}`). Consequência a avisar
  ao operador: o aproveitamento atual está otimista para chapas com veio e
  **vai piorar (ficar correto)** após a restrição. Não é regressão.

> **[V2.1] A restrição de veio não muda nesta rodada.** A melhoria de algoritmo
> das Seções 8.1–8.5 **respeita exatamente a mesma regra**: rotação livre
> apenas quando `!temVeio`; com veio, a orientação já resolvida em
> `expandirPecas` a partir de `sentidoVeio` é final. A melhoria não afrouxa
> (não passa a girar peça com veio para ganhar aproveitamento) e não aperta
> (não restringe peça sem veio). Isto é invariante **V3** da Seção 8.5.

### 8.1 [V2.1] O plano de corte é sempre GUILHOTINÁVEL — invariante explícita

> **Decisão do operador (2026-07-31).** Hoje isto é verdade **por acidente do
> algoritmo** (shelf-first produz faixas e cortes de ponta a ponta). Passa a ser
> **invariante declarada do domínio**: nenhum algoritmo, presente ou futuro,
> pode produzir um plano não-guilhotinável.

**Definição.** Um plano de uma chapa é **guilhotinável** quando existe uma
sequência de cortes de **ponta a ponta** que separa todas as peças — cada corte
atravessa inteiramente a região que está sendo cortada, na horizontal ou na
vertical, nunca parando no meio.

**Verificador (recursivo, determinístico — vira teste do motor):**

```
guilhotinavel(regiao, pecas):
  |pecas| ≤ 1                                              → verdadeiro
  ∃ x = c interno à região que não atravessa NENHUMA peça
    e deixa peça dos dois lados
      → guilhotinavel(esquerda) ∧ guilhotinavel(direita)
  ∃ y = c nas mesmas condições
      → guilhotinavel(abaixo) ∧ guilhotinavel(acima)
  senão                                                    → falso
```

**Por que é invariante e não preferência.** O marceneiro corta em seccionadora
ou serra esquadrejadeira: a lâmina atravessa a chapa inteira. Um plano com
peças "encravadas" tem aproveitamento melhor no papel e é **fisicamente
inexecutável** — e o erro só apareceria na oficina, com a chapa já comprada.
Um plano inexecutável é pior que o plano de hoje.

Consequências:

1. **Colocação livre (*no-overlap* 2D genérico) está fora do domínio.** Não é
   opção configurável, não é parâmetro, não é pergunta em aberto.
2. O algoritmo atual satisfaz a invariante por construção — **nada a corrigir
   hoje**, mas nada garantia até agora. Com a invariante escrita, `guilhotinavel`
   vira teste e qualquer algoritmo novo nasce coberto.
3. A **árvore de cortes** que o algoritmo produz é a origem natural do item
   **3.4** do backlog (contagem de cortes / passadas de serra): o dado passa a
   existir de graça. Expor ou não é escopo do backlog-planner, não desta seção.

### 8.2 [V2.1] Kerf — espessura de serra como parâmetro do bin-packing

> **Decisão do operador (2026-07-31).** Até aqui o domínio ignorava a espessura
> da lâmina: o plano encostava peça em peça, como se o corte não consumisse
> material. Passa a ser parâmetro explícito.

**Regra.** Entre duas peças **adjacentes** na mesma chapa existe um corte, e
esse corte consome `kerf` mm de material:

```
faixa com peças de larguras w1..wn lado a lado:  Σ wi + (n − 1) × kerf ≤ larguraChapa
faixas empilhadas com alturas h1..hm:            Σ hj + (m − 1) × kerf ≤ alturaChapa

Enunciado livre de algoritmo (é este que vale):
duas peças cujas bordas se enfrentam num mesmo corte guardam
distância ≥ kerf entre si.
```

**O que NÃO é kerf, de propósito:**

- **Refilo de borda** (esquadrejar a chapa antes de cortar). Não há kerf antes
  da primeira peça nem depois da última. Se a marcenaria refila, isso é
  **redução da área útil da chapa** — outro parâmetro (`larguraChapa` /
  `alturaChapa` úteis), não kerf. Registrado como deliberadamente não modelado;
  não é pendência bloqueante.
- **Aproveitamento** não muda de fórmula: continua
  `Σ(w × h) ÷ (larguraChapa × alturaChapa)`. O material perdido no corte é
  desperdício e aparece como aproveitamento **menor** — nunca somado ao
  numerador.

**Onde o valor vive — recomendação técnica registrada.** Recomendo **campo
único no Perfil da organização** (`espessuraSerraPadraoMm`, Seção 7), **não**
por chapa e **não** por material. Justificativa: kerf é propriedade da **serra e
do disco**, não da chapa. A mesma seccionadora corta MDF branco de 15 mm e
amadeirado de 18 mm com a mesma lâmina e o mesmo consumo. Um campo por material
multiplicaria por ~380 padrões um dado que é sempre o mesmo e criaria estados
incoerentes (dois materiais com kerf diferente no mesmo plano, sem significado
físico).

- **Default sugerido: 3 mm, EDITÁVEL.** O valor vem do exemplo do operador, não
  de medição — é **calibração**, não regra de negócio. `0` é valor válido e
  reproduz exatamente o comportamento de hoje (útil para comparar com os testes
  existentes).
- **Retroatividade**: mesma disciplina das alturas de faixa (Seção 3.2.1) —
  mudar o kerf no perfil muda o plano de todo orçamento **não congelado**. A
  lista de material congelada é imune (Seção 5.4). A UI precisa dizer isso antes
  de salvar o perfil.
- **Override por orçamento: não no primeiro corte.** Se o marceneiro terceirizar
  o corte numa seccionadora de terceiro com outro disco, o override é a extensão
  natural, e o padrão já existe no doc (precificação, montagem, alturas). Não
  antecipar.
- **Snapshot**: não é necessário guardar o kerf usado na lista congelada — o
  snapshot guarda **resultados**, não entradas. Se o operador quiser auditoria
  de "por que esta lista deu 6 chapas", é campo aditivo barato (assunção
  **A-16**, Seção 11.4), não requisito.

> ⚠️ **Aviso de mudança de comportamento** (mesma natureza da nota de veio
> acima). Ligar o kerf com valor > 0 pode **aumentar** o número de chapas em
> relação ao produto de hoje, que ignora o corte. Isso é **correção, não
> regressão** — o orçamento de hoje está otimista. E como `N(M)` entra no custo
> (Seção 5.2), o preço pode subir. Subir por estar certo é o comportamento
> desejado; subir em silêncio, não — a troca precisa ser visível ao operador
> quando ele configurar o kerf pela primeira vez.

**Exemplo trabalhado — kerf muda quantas peças cabem (e quantas chapas):**

```
Entrada: chapa 2750 × 1840 mm; kerf 3 mm; 40 peças de 550 × 400, SEM veio
Passo 1 — peças por faixa: 5 × 550 + 4 × 3 = 2750 + 12 = 2762 > 2750 → 5 NÃO cabem
                           4 × 550 + 3 × 3 = 2200 +  9 = 2209 ≤ 2750 → cabem 4
Passo 2 — faixas por chapa: 4 × 400 + 3 × 3 = 1600 + 9 = 1609 ≤ 1840 → cabem 4
                            5 × 400 + 4 × 3 = 2000 + 12 = 2012 > 1840 → 5 não
Passo 3 — capacidade = 4 peças × 4 faixas = 16 peças por chapa
Passo 4 — 40 ÷ 16 = 2,5 → N = 3 chapas (16 + 16 + 8)
Saída:   N(M) = 3 chapas
Conferência do aproveitamento (área da peça = 550 × 400 = 220.000 mm²;
                               área da chapa = 2750 × 1840 = 5.060.000 mm²):
         chapa cheia = 16 × 220.000 ÷ 5.060.000 = 3.520.000 ÷ 5.060.000 = 0,695652
         última chapa =  8 × 220.000 ÷ 5.060.000 = 1.760.000 ÷ 5.060.000 = 0,347826
Comparação com kerf 0 (comportamento de HOJE):
         5 × 550 = 2750 exato → 5 por faixa;  4 × 400 = 1600 ≤ 1840 → 4 faixas
         capacidade 20 → 40 ÷ 20 = N = 2 chapas
         aproveitamento da chapa cheia = 4.400.000 ÷ 5.060.000 = 0,869565
Leitura: a mesma lista de peças custa 3 chapas em vez de 2 quando o corte é
         contado. É a mesma marcenaria, o mesmo móvel — é o número de hoje que
         está errado, não o novo.
```

### 8.3 [V2.1] Algoritmo: guilhotina com retângulos livres + busca por permutação (Web Worker)

> **Decisão do operador (2026-07-31).** Substitui integralmente a direção
> anterior (OR-Tools + worker Python + fila + entidade de job), **descartada**.
> A melhoria é **100% TypeScript**, roda num **Web Worker do navegador**, não
> trava a UI, e **não cria infraestrutura, tabela, fila nem entidade nova**.
>
> Esta é uma melhoria de **implementação** (motor-engineer). O domínio ganha
> exatamente **um parâmetro** (`kerf`, 8.2) e **uma invariante explícita**
> (guilhotina, 8.1). Nada mais.

**Duas partes, papéis distintos:**

1. **Colocação — guilhotina com lista de retângulos livres.** Cada peça é
   colocada dentro de um retângulo livre; a colocação divide o restante com um
   corte de **ponta a ponta** (vertical ou horizontal), gerando novos retângulos
   livres. A diferença essencial para o shelf-first de hoje: **os retângulos
   livres continuam disponíveis** — uma faixa livre criada cedo pode receber uma
   peça colocada depois. É exatamente o que falta hoje (item **3.1** do backlog).
2. **Busca — meta-heurística.** Em vez de uma passada única, o worker avalia N
   permutações da ordem de inserção (e das escolhas de divisão), guardando o
   melhor resultado. *Simulated annealing* e *algoritmo genético* são
   implementações válidas dessa busca; **a escolha entre eles é do
   motor-engineer**. O domínio fixa apenas o critério de comparação e as
   invariantes abaixo.

**Critério de comparação (função objetivo), nesta ordem:**

```
1. menor nº TOTAL de chapas (Σ chapas de todos os grupos)   ← é o que entra no preço (5.2)
2. desempate: maior aproveitamento da ÚLTIMA chapa de cada grupo
3. desempate final: menor nº de cortes (árvore de guilhotina, 8.1)
```

O critério 2 existe porque, com o número de chapas empatado, o plano melhor é o
que deixa a **sobra junta**: uma sobra de 1 m² concentrada numa chapa vira peça
de um próximo serviço; a mesma sobra espalhada em cinco tiras não vira nada.

**Determinismo é invariante, não preferência:**

```
mesma entrada + mesmos parâmetros  ⇒  MESMO plano, sempre
```

- A busca usa **PRNG semeado** com semente fixa (constante, ou derivada da
  entrada) — nunca `Math.random()` livre.
- O orçamento da busca é **número de iterações fixo** (`maxIteracoes`), nunca
  "o que couber em 2 s de relógio". Numa máquina lenta a busca **demora mais**;
  ela **não** produz outro plano.
- **Razão**: `N(M)` entra no preço (Seção 5.2). Um plano que varia entre duas
  aberturas da mesma tela produziria **dois preços para o mesmo orçamento** —
  indefensável perante o cliente e não auditável. Um limite por relógio faria
  exatamente isso.
- **Calibração**: `maxIteracoes` é escolhido para ficar em 1–2 s numa máquina de
  referência (ordem de grandeza indicada pelo operador: ~5.000–20.000
  tentativas). O número é calibração do motor-engineer; o que é regra de negócio
  é ele ser **fixo**.

**Nunca pior que a passada determinística:**

```
candidato inicial da busca = resultado do algoritmo determinístico,
                             com os MESMOS parâmetros (kerf incluído)
resultado final            = melhor candidato avaliado, incluindo o inicial
⇒ chapasFinal ≤ chapasDeterministico, SEMPRE
```

A comparação usa os **mesmos parâmetros**: comparar um plano com kerf 3 contra
um baseline com kerf 0 é comparar dois problemas diferentes e reprovaria tudo
(ver o aviso de comportamento em 8.2).

**Web Worker — o que muda para o domínio: quase nada.**

| Aspecto | Hoje (síncrono) | Depois |
|---|---|---|
| Onde roda | main thread, na renderização | Web Worker do navegador |
| Persistência | nenhuma | **nenhuma** — sem job, fila, tabela ou RLS nova |
| Tempo | ms | 1–2 s, **sem travar a UI** |
| Estado | nenhum | transitório de UI: `calculando` → `pronto` |
| Determinismo | sim | **sim** (invariante acima) |

Regra de tela (preserva "nunca tela vazia"): a passada determinística é barata
(ms) e continua disponível **de imediato** como estimativa; o resultado da busca
a substitui quando chega. Se o Web Worker não estiver disponível (navegador
antigo, falha de carregamento), o motor roda **a mesma função** no main thread —
o resultado é idêntico, só demora e trava a UI por 1–2 s. **Não existe estado
"sem plano de corte".**

> **O que morreu junto com a Seção 12** — registrado para não sobrar contrato
> pendurado para o backend-engineer ou o motor-engineer: não existe entidade de
> job de plano de corte, nem payload, nem resultado assíncrono, nem hash de
> entrada, nem estado "plano vencido", nem fila, nem worker externo, nem chave
> de serviço do Supabase rodando fora da aplicação. O `SnapshotListaMaterial`
> permanece em **`versao: 1`** — a extensão para `versao: 2` com procedência do
> plano (origem, id de job, versão de solver) está **cancelada**.

**Exemplo trabalhado — o item 3.1 do backlog (o bug relatado pelo marceneiro):**

```
Caso relatado: faixa livre de 30 cm × 2,70 m ignorada; o sistema abriu chapa
nova para um sarrafo de 7 cm × 1,5 m.

Entrada: chapa 2750 × 1840 mm; kerf 3 mm; material SEM veio
         P1 = 2600 × 1500 (painel)      P2 = 70 × 1500 (sarrafo, como digitado)
Passo 1 — P1 na chapa 1: ocupa x [0, 2600] × y [0, 1500]
Passo 2 — retângulo livre acima do corte horizontal:
          altura = 1840 − 1500 − 3 = 337 mm; largura = 2750
Passo 3 — P2 na orientação digitada (70 largura × 1500 altura):
          1500 > 337 → não cabe → é AQUI que o algoritmo de hoje abre chapa nova
Passo 4 — P2 é SEM veio ⇒ orientação alternativa 1500 × 70:
          1500 ≤ 2750 ✓   e   70 ≤ 337 ✓   → cabe no retângulo livre
Saída:   N = 1 chapa (não 2)
         aproveitamento = (2600×1500 + 1500×70) ÷ (2750×1840)
                        = (3.900.000 + 105.000) ÷ 5.060.000
                        = 4.005.000 ÷ 5.060.000 = 0,791502
Guilhotina (8.1): corte horizontal em y = 1500 separa P1 de P2 → válido ✓
Leitura: o bug 3.1 tem DUAS causas e as duas caem aqui — (a) o shelf-first
         descarta o espaço livre que não é a prateleira corrente, e (b) só
         rotaciona a peça quando ela não cabe na chapa inteira, nunca para
         aproveitar um espaço. A lista de retângulos livres resolve (a); a
         avaliação das duas orientações a cada tentativa resolve (b).
```

**Exemplo trabalhado — por que uma passada só não basta (o que a busca ganha):**

```
Entrada: chapa 2750 × 1840; kerf 0 (didático, para isolar o efeito da escolha);
         material SEM veio
         P = 1400 × 1000     Q = 1400 × 840     R = 1350 × 1840
         área total = 1.400.000 + 1.176.000 + 2.484.000 = 5.060.000 mm²
                    = exatamente 1 chapa (2750 × 1840 = 5.060.000)

Tentativa 1 — ordem (P, Q, R), divisão VERTICAL primeiro:
  Passo 1 — P em (0,0); livres: L1 = x[1400,2750] × y[0,1840]  (1350 × 1840)
                                L2 = x[0,1400]    × y[1000,1840] (1400 × 840)
  Passo 2 — Q (1400 × 840) → cabe exato em L2
  Passo 3 — R (1350 × 1840) → cabe exato em L1
  Resultado: 1 chapa · aproveitamento 5.060.000 ÷ 5.060.000 = 1,000000

Tentativa 2 — MESMA ordem, divisão HORIZONTAL primeiro:
  Passo 1 — P em (0,0); livres: L1' = x[0,2750] × y[1000,1840] (2750 × 840)
                                 L2' = x[1400,2750] × y[0,1000] (1350 × 1000)
  Passo 2 — Q (1400 × 840) → cabe em L1'
  Passo 3 — R (1350 × 1840) → 1840 > 840 e 1840 > 1000 → não cabe em nenhum
            → abre a 2ª chapa
  Resultado: 2 chapas · aproveitamento da 1ª = 2.576.000 ÷ 5.060.000 = 0,509091

Saída da busca: guarda a Tentativa 1 (1 chapa).
Leitura: a MESMA lista de peças, com o mesmo algoritmo, dá 1 ou 2 chapas
         conforme uma escolha local. Uma passada determinística fixa uma das
         escolhas e fica com ela para sempre; a busca testa milhares e guarda
         a melhor. É por isso que a meta-heurística compensa — e é por isso
         que ela só pode MELHORAR (o candidato inicial é a passada de hoje).
```

### 8.4 [V2.1] Resultado da busca — o tipo mínimo, e não persistido

Avaliação pedida pelo operador: vale expor "quantas iterações rodaram" e
"desperdício alcançado" no domínio e na UI?

**Decisão: não cria tipo de domínio persistido.** A saída da busca continua
sendo o mesmo `GrupoChapas[]` de `lib/engine/box/cutting.ts` — nenhum consumidor
muda de contrato (render da chapa, `ResumoGrupoCorte` do snapshot, e o `N(M)` do
rateio da Seção 5.2). O que se acrescenta é um `meta` **efêmero**:

```ts
type MetaBuscaCorte = {
  iteracoes: number              // quantas permutações foram avaliadas
  tempoMs: number                // diagnóstico
  chapasDeterministico: number   // candidato inicial (a passada de hoje)
  chapasFinal: number            // ≤ chapasDeterministico — invariante V6 (8.5)
}
```

- **Efêmero de verdade**: vive no retorno da função e no estado da tela. **Não**
  é persistido, **não** entra no snapshot congelado, **não** entra no rateio,
  **não** vira coluna.
- **Na UI**, o único número com valor para o marceneiro é
  `chapasDeterministico − chapasFinal` ("economizou 1 chapa"). `iteracoes` e
  `tempoMs` são diagnóstico de desenvolvimento; exibi-los ou não é decisão do
  ux-designer, não do domínio.
- **Por que não persistir**: guardar métrica de execução de um cálculo
  determinístico e barato cria a obrigação de mantê-la sincronizada com um dado
  que se recalcula sozinho. É o mesmo erro que a proposta anterior cometia com
  o hash de entrada e o flag de "plano vencido".

### 8.5 [V2.1] Invariantes de validação do plano de corte (viram teste do motor)

Estas são **asserções de motor**, verificadas em teste e em desenvolvimento —
não avisos de UI. O usuário nunca precisa saber que elas existem; se alguma
falhar, é bug de motor, não estado de negócio.

| # | Invariante | Como se verifica |
|---|---|---|
| **V1** | **Conservação de peças**: cada peça expandida aparece **exatamente uma vez** em `chapas[].pecas` ∪ `pecasForaDaChapa` | contagem por `id` |
| **V2** | **Geometria**: nenhum par de peças da mesma chapa se intersecta; `x + w ≤ larguraChapa`, `y + h ≤ alturaChapa`; peças enfrentadas num mesmo corte guardam distância `≥ kerf` (8.2) | varredura de pares |
| **V3** | **Veio respeitado**: peça com `temVeio` sai com `w`/`h` **idênticos** aos da entrada (nunca girada). Sem veio, a troca é livre — Seção 8 | comparação com a entrada |
| **V4** | **Aproveitamento coerente**: `= Σ(w × h) ÷ (larguraChapa × alturaChapa)`, tolerância `1e-6`. O kerf **não** entra no numerador (8.2) | aritmética |
| **V5** | **Guilhotina**: `guilhotinavel(chapa)` verdadeiro para **toda** chapa (8.1) | verificador recursivo de 8.1 |
| **V6** | **Monotonicidade**: `chapasFinal ≤ chapasDeterministico` com os mesmos parâmetros (8.3) | comparação com o candidato inicial |
| **V7** | **Determinismo**: rodar a mesma entrada duas vezes produz saída **estruturalmente idêntica** (8.3) | dupla execução + igualdade profunda |

**Exemplo trabalhado — V4, a aritmética do aproveitamento:**

```
Entrada: chapa 2750 × 1840; 3 peças de 2000 × 600 (kerf 3: 3×600 + 2×3 = 1806 ≤ 1840 ✓)
Passo 1 — área da chapa   = 2750 × 1840 = 5.060.000 mm²
Passo 2 — área ocupada    = 3 × (2000 × 600) = 3 × 1.200.000 = 3.600.000 mm²
Passo 3 — aproveitamento  = 3.600.000 ÷ 5.060.000 = 180/253 = 0,7114624506...
Saída:   0,711462  → |0,711462 − 0,71146245| = 4,5e-7 < 1e-6  → PASSA
         0,7115    → |0,7115   − 0,71146245| = 3,8e-5 > 1e-6  → REPROVA
         0,80      → reprova por larga margem
```

> A tolerância de `1e-6` é apertada de propósito: existe para absorver ponto
> flutuante, **não** para tolerar arredondamento de exibição. O motor devolve a
> fração cheia; quem arredonda para exibir é a UI.

### 8.6 [V2.1] Ligação com o backlog pré-lançamento

| Item de `docs/01-backlog-pre-lancamento.md` | Como esta seção o resolve |
|---|---|
| **3.1** — bug: sarrafo de 7 × 150 cm não encaixado numa faixa livre de 30 × 270 cm | Resolvido em **8.3**: lista de retângulos livres (o espaço livre não é descartado) + avaliação das duas orientações quando `!temVeio`. Exemplo trabalhado reproduz o caso relatado, número a número |
| **3.3** — avaliar substituição do algoritmo de bin-packing | **Avaliação encerrada pelo operador**: a substituição é esta — guilhotina com retângulos livres + busca por permutação, 100% TypeScript em Web Worker. Deixa de ser condicional; não depende mais de 3.1 |
| **6.3** — substituição do algoritmo, se 3.1 não resolver | **Sem objeto**: 3.1 e 3.3 são a mesma entrega agora |
| **3.4** — contagem de cortes / passadas de serra | **Não entra nesta rodada**, mas a árvore de guilhotina (8.1) passa a produzir o dado. Quando for atacado, a origem já existe |
| **3.2** — exibir o veio da placa no plano de corte | Inalterado: é renderização, o dado (`sentidoVeio`) já existe na Seção 8 |

> **Efeito colateral no PRD**: a pergunta **Q-12** do `docs/PRD.md` (Seção 7.4)
> perguntava se o item 3.1 devia ser corrigido agora **ou** se valia esperar a
> substituição do motor pelo solver externo. Com o solver externo descartado e a
> substituição sendo ela própria a correção, **a premissa da Q-12 caiu**.
> Reclassificar Q-12, 3.1, 3.3, 6.3 e o estágio de backlog correspondente é
> tarefa do **backlog-planner** e do operador — não a faço deste documento, que
> só modela.

---

## 9. Rastreabilidade Decisão → Modelo

| Decisão (briefing 10) | Onde vive neste modelo |
|---|---|
| D-01 SaaS multi-usuário | Seção 7 (todas as entidades com tenant) |
| D-02 render + agrupamento comercial | Seção 6 (LinhaProposta) |
| D-03 parede valida + tamponamento na parede | Seções 3.2–3.5 |
| D-13 tenant = Organização | Seção 7 |
| D-14 Supabase, Prisma sai | Seção 7 (cuidados RLS) |
| D-17 linha de proposta = ambiente | Seção 6 (default) |
| D-19 validação Tier 1+2 | Seção 3.2 / PRD (níveis) |
| D-20 posicionamento 1D | Seção 3.1 |
| D-22 N inteiro do plano de corte | Seção 5.2 |
| D-23 frete proporcional | Seção 5.3 |
| D-24 montagem 3 modos, rateio acompanha base | Seção 5.3 |
| D-25 frete/montagem diluídos | Seção 5.3 |
| D-26 m² removido | Seção 5.3 |
| D-04 um modo de precificação no 1º corte | Seção 5.1 |
| D-05 unidade global no perfil | Seção 7 (Perfil) |
| D-06 ripado quantidade→espaçamento | Seção 2.2 |
| D-07 montagem é custo | Seção 5.5 |
| D-15 produtos cópia / módulos base+fork | Seção 7 |

---

## 10. Assunções da auditoria de 2026-07-24 (a confirmar)

Correções do operador aplicadas nas Seções 2.1, 3.4, 3.5, 7 e 8. Ao traduzir
os 6 exemplos trabalhados em regra geral, assumi o seguinte — cada item é
barato de corrigir agora e caro depois de implementado:

| # | Assunção | Situação |
|---|---|---|
| A-01 | Sarrafo de 70 mm | ✅ **Confirmado com ajuste**: 70 mm é **default editável**, não constante fixa (`larguraSarrafo`) |
| A-02 | Nível 3 ⇒ **3 camadas** por lado | ✅ **Confirmado pelo operador (2026-07-24)**: o exemplo é a fonte da verdade, não o texto |
| A-03 | Camadas/placas por nível | ✅ **Resolvido e generalizado**: `espessuraFinal = base × (1 + nivel)`; vale para base 15 **e** 18 mm; "30/45/60" é rótulo do caso base-15 |
| A-04 | Engrossamento parcial | ✅ **Confirmado**: lado não selecionado não gera peça nenhuma; o sarrafo menor só desconta por lado perpendicular selecionado |
| A-05 | Eixo maior corre inteiro; menor encaixa entre eles | ✅ Mantido (consistente com os 6 exemplos) |
| A-06 | Tampo: profundidade **do módulo maior** + 30 mm, se o bloco variar | ✅ **Confirmado pelo operador (2026-07-24)** |
| A-07 | Fechamento/Rodapé: "50 mm"/"150 mm" são largura/altura; a espessura é sempre a do material | ✅ **Confirmado pelo operador (2026-07-24)** |

Todas as assunções estão confirmadas. Nenhuma pendência bloqueante para a Fase B.

**Borda de domínio resolvida (2026-07-27)**: base 18 mm tem **nível máximo 2**
(54 mm) — nível 3 (72 mm) excede a maior fita do catálogo (65 mm) e não é
oferecido para essa base. Ver Seção 2.1. Decisão fechada do operador, não
pendência para a Task 12.1 (que só implementa a validação).

---

## 11. [V2.1] Extensão pré-lançamento (2026-07-31)

Fonte: `docs/01-backlog-pre-lancamento.md` (4 walkthroughs com marceneiro real)
+ decisões do operador. As Seções 0–10 **não foram reescritas** — foram
estendidas. Nenhuma decisão anterior foi revogada, com uma exceção declarada:
o limite "1 parede por ambiente" do primeiro corte (era limite de UI).

### 11.1 O que mudou e onde

| Decisão | Origem | Onde vive agora |
|---|---|---|
| Ambiente e Parede com cardinalidade N; item pertence à parede | itens 0.1–0.3, 2.3, 2.4 | Seção 3.2 |
| Parede com nome livre | item 0.6 | Seção 3.2 (`Parede.nome`) |
| **Q-1** altura de faixa: perfil dá default, parede sobrescreve campo a campo | Q-1, itens 0.4/5.2 | Seção 3.2.1 |
| `peDireito` = limite de instalação do aéreo, não altura da parede | item 5.2 | Seção 3.2.1 (nota) |
| Módulo inferior assenta sobre o rodapé | item 2.17 | Seção 3.2.1 (tabela de Y) · **A-08** |
| **Q-2** entrada em vão, armazenamento em X absoluto | Q-2, item 2.18 | Seção 3.1.1 |
| Torre é vizinha das três faixas | item 2.16 | Seção 3.1.1 · **A-09** |
| Faixa `bancada` rotulada "meio" na UI | item 2.15 | Seção 3.1 (nota) |
| Elemento de parede: tipo **pedra** | item 2.7 | Seção 3.2.2 |
| Elemento de parede: `id` para permitir edição | item 2.8 | Seção 3.2.2 |
| Referência escolhível de X (esquerda/direita) e Y (chão/teto) | itens 2.9/2.10 | Seção 3.2.2 |
| Rótulos descritivos em vez de "X"/"Y" | item 2.11 | Seção 3.2.2 (tabela) |
| **Q-5** preset de elemento de parede **fora do catálogo** | Q-5, item 2.12 | Seção 3.2.3 |
| **D-10** criação do zero por org + promoção só do operador | item 2.1 / D-10 | Seção 7.1 |
| Tampo com **três** modelos; modelo antes da espessura | itens 3.10/3.11 | Seção 3.4.1 |
| Espessuras condicionadas ao modelo; 6 mm nunca | item 3.11 | Seção 3.4.1 |
| BOM do tampo simples (completa a Q-4) | item 3.12 / Q-4 | Seção 3.4.1 |
| Fita de 35 mm cobre também 25 mm | decorrência do tampo simples | Seção 2.1 |
| **Plano de corte sempre guilhotinável** — invariante explícita | decisão do operador (31/07) | Seção 8.1 |
| **Kerf** (espessura de serra) como parâmetro do bin-packing; campo no Perfil | decisão do operador (31/07) | Seções 8.2 e 7 (Perfil) |
| Bin-packing melhorado **100% TypeScript em Web Worker** (guilhotina com retângulos livres + busca por permutação) — resolve 3.1 e 3.3 | decisão do operador (31/07) | Seções 8.3–8.6 |
| **OR-Tools / worker Python / fila / entidade de job de plano de corte — DESCARTADOS** | decisão do operador (31/07) | removido: **não há Seção 12**; as quatro perguntas abertas por aquela direção deixam de existir (nota ao pé de 11.3) |
| `ModuleViewer` (3D estático) consome só dado existente de `BoxModule` | decisão do operador (31/07) | Seção 4.1 |
| **Estado congelado do orçamento** (`congeladoEm`) — fecha o achado bloqueante 1 da reauditoria | reauditoria 01/08 | **Seção 5.4.1** |
| **Q-16** reabertura: avisa em vez de bloquear; existe "Reabrir"; `congeladoEm` volta a `null` e `valorRateado` é preservado | decisão do operador (02/08) | **Seção 5.4.1 (I6)** |
| **Q-6** esteira é **workflow real** com transições automáticas — enum, transições e gatilhos | decisão do operador (02/08) | **Seção 7.2** |
| **Q-15** badges "Em andamento"/"Fechado" são **etapas da esteira**, não status novo | decisão do operador (02/08) | **Seção 7.2** (mapeamento badge → etapa) |
| **Q-13** excluir conta apaga a **organização inteira** (cascata; sem anonimização nem retenção) | decisão do operador (02/08) | **Seção 7.3** |
| **Q-14** `ModuleViewer` com **textura real** dos ~380 padrões; `especificacao.texturaUrl` no Produto tipo `chapa` | decisão do operador (02/08) | **Seção 4.1.1** |

### 11.2 O que NÃO é lacuna de modelo (não mexer aqui)

Os itens abaixo aparecem no backlog como bugs graves, mas o modelo **já os
especifica corretamente**. Se o código não faz, é defeito de execução — a
correção é task de implementação, não mudança de spec:

| Item do backlog | Onde o modelo já resolve |
|---|---|
| 0.7 / 1.4 / 2.2 — congelamento da proposta | Seção 5.4 **+ 5.4.1**. A 5.4 sozinha **não bastava**: dizia "persistido no fechamento" sem definir o estado que responde "está congelado?". A lacuna foi reconhecida na reauditoria de 01/08 e fechada pela **5.4.1** (`congeladoEm`, leituras R1/R2, invariantes I1–I6). Hoje é defeito de execução; antes da 5.4.1 era lacuna de modelo |
| 1.5 — paridade financeiro ↔ proposta | Seção 5.2 (rateia-se o preço final; soma fecha por construção) |
| 1.6 — resíduo de arredondamento | Seção 5.2 (última linha absorve o resíduo) |
| 1.7 — chapa de 6 mm não contada | Seção 5.2 ("segregado por material", sem limiar de aproveitamento em lugar nenhum) |
| 1.1–1.3 — cache, aba na URL, render | fora do domínio: estado de aplicação |
| 3.2 — exibir o veio da placa | Seção 8, já fechada (é renderização; o dado existe) |
| 3.1 — faixa livre ignorada | **[V2.1]** deixa de ser só defeito de execução: o modelo agora declara a invariante de guilhotina e o kerf, e a correção vem junto com o algoritmo novo — Seções 8.1–8.3 e 8.6 |

### 11.3 Pendências deliberadamente NÃO modeladas

**Vivas** (bloqueiam implementação): **nenhuma.** As duas últimas — Q-17 e Q-18
— foram respondidas pelo operador em 2026-08-03 e estão na tabela abaixo.

**Resolvidas** (não reabrir):

| # | Assunto | Resolução |
|---|---|---|
| **Q-17** | **Quem pode disparar a exclusão da organização inteira?** | **Respondida em 2026-08-03: só o papel `admin`/dono.** Um `vendedor` ou `projetista` não exclui nada. A regra passa a viver em **7.3 → "Quem pode disparar"**: checagem **de aplicação**, dentro da própria Server Action / RPC (`perfil.papel === 'admin'` para o `auth.uid()` chamador), como **primeira** operação, antes de qualquer `delete`, da leitura dos perfis e da limpeza de Auth/Storage. Rejeição explícita: erro **E-D1** / `NAO_AUTORIZADO_EXCLUIR_ORG` / 403. **Não** nasce política de `delete` em `organizacao` para `authenticated` — a porta única continua sendo a Server Action, e é o que torna a checagem de aplicação suficiente. Cascade, armadilhas e casos de borda seguem como estavam em **7.3** |
| **Q-18** | **Quem pode reabrir um orçamento congelado?** | **Respondida em 2026-08-03: só o papel `admin`/dono** — mesma resposta e mesmo padrão da Q-17. A regra passa a viver em **5.4.1, invariante I6a**: checagem de `perfil.papel === 'admin'` dentro da Server Action, antes de qualquer escrita e antes até do caminho idempotente; rejeição explícita com **E-C3** / `NAO_AUTORIZADO_REABRIR` / 403. O resto de **I6** (efeito em `congeladoEm`, `valorRateado` e `etapaEsteira`) permanece inalterado |
| **Q-7** | Corte mínimo de lançamento | **Fechada pelo operador — D-30** (`docs/PRD.md`). Era escopo, não domínio; deixou de ser pendência viva. Nada neste documento depende dela |
| **Q-6** | Status de esteira: campo manual ou workflow real? | **Workflow real**, com transições automáticas. Enum de 5 etapas, transições T1–T3 e gatilhos por ação real do produto — **Seção 7.2**. Duas etapas (`novo`, `fechado`) são **proposta técnica** marcada como tal |
| **Q-13** | Excluir conta apaga o usuário ou a organização? Cascata, anonimização ou retenção? | **A organização inteira, por cascata.** Sem exclusão lógica, sem anonimização, sem prazo de retenção. Confirmação explícita obrigatória. Cascade, armadilhas de FK/Auth/Storage e casos de borda em **Seção 7.3**. **Quem pode disparar → Q-17, respondida: só `admin`** |
| **Q-14** | `ModuleViewer` com cor sólida ou textura real? | **Textura real.** `especificacao.texturaUrl` no `Produto` tipo `chapa` (campo, não tabela — justificativa em **4.1.1**). A recomendação de lançar com cor sólida foi rejeitada. As ~380 imagens são **pré-requisito de conteúdo** da task |
| **Q-15** | Os badges "Em andamento" e "Fechado" da Design-System §2.5 são status novos? | **Não — são rótulos de etapas da esteira** (Q-6). Nenhum campo de status novo. `fechado` → "Fechado"; qualquer etapa intermediária → "Em andamento"; `novo` → o card mostra o status comercial. Função de mapeamento em **7.2** |
| **Q-16** | O que acontece ao editar um orçamento depois de congelado? | **Avisa** (W-C1) em vez de bloquear em silêncio, e **existe "Reabrir"**: `congeladoEm ← null`, valores voltam a ser recalculáveis (R1), `valorRateado` **preservado** (não zerado — a coluna é a mesma do override manual), etapa volta de `fechado` para `aguardando_aprovacao`. Invariante **I6** e exemplo trabalhado em **5.4.1**. **Quem pode reabrir → Q-18, respondida: só `admin`** (I6a) |

> **Extintas em 2026-07-31 — não são pendências, não reabrir.** As quatro
> perguntas que a direção OR-Tools/assíncrona havia aberto (onde roda o worker
> externo · mecanismo de fila · limiar de disparo assíncrono · corte
> guilhotinado obrigatório) **deixaram de existir junto com ela**: não foram
> respondidas, perderam objeto. Guilhotina deixou de ser pergunta e virou
> **invariante** (Seção 8.1). As referências remanescentes em `docs/PRD.md`
> (7.4) e `docs/Backlog.md`, que ainda as citam pela numeração antiga, são
> limpeza do **backlog-planner** — não deste documento, que não tem mais nada
> sobre o assunto.

### 11.4 Assunções desta rodada (baratas de corrigir agora)

| # | Assunção | Impacto se estiver errada |
|---|---|---|
| **A-08** | `Y(inferior) = alturaRodape` (hoje o motor usa `0`) e `Y(torre) = alturaRodape` | Muda `derivarY` e os testes de faixa já existentes. Se o operador quiser torre indo até o chão (sem rodapé sob a torre), é só a linha "torre" da tabela 3.2.1 que muda |
| **A-09** | Torre conta como vizinha das faixas inferior/bancada/aéreo no cálculo de vão | Se não contar, um módulo aéreo pode ser posicionado "por cima" de uma torre e o vão exibido ignora a torre |
| **A-10** | `ElementoParedePreset` pode guardar largura/altura de prefill | O operador disse "só nome". Mantido opcional: sem preencher, o preset é literalmente só um nome. Se for para proibir, apagar dois campos |
| **A-11** | Preset é cópia no momento de aplicar, sem vínculo vivo | Se o operador quiser que editar o preset atualize elementos já colocados, vira relação viva (e aí precisa de regra de conflito) |
| **A-12** | Fita para tampo simples de 25 mm é a de 35 mm (menor fita ≥ 25) | Se existir fita de 28/30 mm no catálogo real, a regra geral já a escolhe sozinha — a tabela é ilustrativa, a regra é que manda |
| **A-13** | **Kerf é um campo só, no Perfil da organização** (`espessuraSerraPadraoMm`), não por material nem por chapa — Seção 8.2 | Se o operador cortar com discos diferentes por espessura de chapa, vira campo por material e o bin-packing passa a receber kerf por grupo. O cálculo não muda; muda de onde o número vem |
| **A-14** | **Default 3 mm, editável, e `0` é válido.** O 3 mm veio do exemplo do operador, não de medição | Se a lâmina real for 3,2 ou 4 mm, é só trocar o default — nenhum exemplo trabalhado desta seção depende do valor, todos declaram o kerf que usam |
| **A-15** | **Kerf só entre peças adjacentes**; refilo de borda da chapa **não** é modelado (Seção 8.2) | Se a marcenaria refila a chapa antes de cortar, a área útil real é menor que 2750 × 1840 e o plano fica otimista. A correção é reduzir as dimensões úteis da chapa, não mexer no kerf |
| **A-16** | O snapshot de lista de material **não** registra o kerf usado (guarda resultados, não entradas) — permanece `versao: 1` | Se o operador quiser auditar "por que esta lista congelada deu 6 chapas", é campo aditivo barato no snapshot. Só não vale pagar por ele antes de a pergunta existir |
| **A-17** | A busca é limitada por **nº fixo de iterações**, nunca por relógio, para garantir determinismo (Seção 8.3) | Se alguém trocar por limite de tempo, o mesmo orçamento passa a produzir dois preços em duas aberturas da tela. É a assunção mais cara de violar desta rodada |
| **A-18** | `MetaBuscaCorte` (iterações, tempo, chapas antes/depois) é **efêmero**, não persistido (Seção 8.4) | Se o operador quiser histórico de otimização por orçamento, aí sim nasce persistência — e com ela a obrigação de mantê-la coerente. Hoje não há demanda |
| **A-19** | O `ModuleViewer` não exige campo novo: `color` sai de `corParaHex(material.cor)`, derivação já existente (Seção 4.1) | A heurística por substring erra na maioria dos ~380 padrões reais. Se o operador quiser cor fiel antes de decidir a Q-14, o campo opcional `corHex?` no Produto tipo `chapa` resolve sem tocar em `MaterialRef` |
| **A-20** | **"Gerar proposta" move a etapa de esteira, mas NÃO mexe no `status` comercial** (7.2). Gerar o PDF ≠ enviar ao cliente, e inventar a transição `rascunho → enviado` seria decidir produto | Um orçamento pode aparecer como `aguardando_aprovacao` (esteira) e `rascunho` (comercial) ao mesmo tempo. Se o operador quiser que gerar proposta também marque `enviado`, é **uma linha a mais no mesmo gatilho**, sem efeito em nenhuma outra regra |
| **A-21** | **Não há versionamento por linha de proposta.** Reabrir + recongelar sobrescreve `valorRateado` sem histórico (I3/I6); o registro do que o cliente recebeu é o **PDF já emitido**, externo ao banco | Se o operador quiser auditoria "recebeu 4.584,00, foi reaberto e virou 4.813,20", nasce uma tabela de versão de proposta (o análogo do que `lista_material` já faz por INSERT-only). É aditivo e não invalida nada da 5.4.1 |
| **A-22** | **Reabrir não olha o `status` comercial** — reabrir um orçamento `aprovado` é permitido (ortogonalidade, I1) | Se reabrir orçamento aprovado tiver que ser proibido, é um guard a mais na mesma ação. Nenhum exemplo trabalhado da 5.4.1 depende disso |
| **A-23** | **A etapa de esteira não tem histórico** — guarda-se a etapa atual, não a trilha de transições nem quando cada uma ocorreu (7.2) | Se o operador quiser "quanto tempo ficou em aguardando aprovação", vira tabela de eventos. Hoje não há tela que peça isso |

### 11.5 Cobertura: dado de tela → origem

Todo dado novo exigido pelo backlog tem origem definida:

| Dado na tela | Origem |
|---|---|
| Seletor de ambiente / parede em edição (2.5, 2.6) | `Ambiente.nome` · `Parede.nome` · `ordem` |
| Cascata ambiente → faixa → módulo (2.14) | `Ambiente` · `Faixa` · `Gabarito` (filtro por `categoria`) |
| "Herdado" vs "customizado" nas alturas | derivado de `Parede.alturasOverride` (Seção 3.2.1) |
| Vão até o vizinho (2.18) | derivado de `x` + vizinhança (Seção 3.1.1) |
| Cotas de faixa na elevação (2.27) | `alturasEfetivas(parede, org)` + `Parede.altura` |
| Rótulos de referência do elemento (2.11) | `ElementoParede.refX` / `refY` |
| Nome do elemento de parede recorrente (2.12) | `ElementoParedePreset.nome` |
| Modelo do tampo antes da espessura (3.10) | `ConfigTampo.modelo` (Seção 3.4.1) |
| Fita discriminada por cor (3.5) | `MaterialRef` da peça + regra de fita por espessura (Seção 2.1) — dado já existe, falta agregação por cor na saída |
| Rolos de fita a comprar (3.6) | `Produto` categoria `fita`, campo de tamanho de rolo no catálogo — **nunca hardcoded** |
| Efeito de "excluir conta" (4.15) | `organizacao` apagada em cascata — **Seção 7.3** (Q-13 respondida). *Quem pode disparar*: só `admin`, checado na Server Action (Q-17, **7.3**) |
| Valor final e custo no dashboard (5.8/5.9) | `Orçamento` → resumo financeiro de 6 campos (Seção 5.5) |
| Status de esteira (5.10) | `Orçamento.etapaEsteira` — **Seção 7.2** (Q-6 respondida) |
| Badges "Em andamento" / "Fechado" do card (DS §2.5) | derivados de `etapaEsteira` por `rotuloDoCard()` — **Seção 7.2** (Q-15 resolvida). Não são valores de `status` |
| Badges "Rascunho" / "Enviado" / "Aprovado" do card | `Orçamento.status` (inalterado). "Recusado" existe no domínio e **não tem token de cor** — lacuna do `product-designer`, não de domínio |
| "Proposta congelada em `<data>`" / aviso de edição pós-congelamento | `Orçamento.congeladoEm` — **Seção 5.4.1** (I1, aviso W-C1) |
| Valor exibido na proposta e na lista de material | `linhaProposta.valorRateado` + `lista_material.snapshot` quando congelado (R2); recalculado quando não (R1) — **Seção 5.4.1** |
| Botão "Reabrir" | ação sobre `congeladoEm` + `etapaEsteira` — **5.4.1 (I6)** e **7.2 (T2)**. *Quem pode*: só `admin` (Q-18, **I6a**) — a UI só oferece o botão a admin, e a ação rejeita o resto (E-C3) |
| Plano de corte exibido (chapas, peças, aproveitamento) | `planoDeCorte()` — derivado das peças + parâmetros de chapa + kerf (Seções 8.2–8.3). **Não é dado persistido** |
| Campo "espessura de serra" em `/perfil` | `Organização/Perfil.espessuraSerraPadraoMm` (Seções 7 e 8.2) |
| "Economizou N chapas" / estado "calculando…" | `MetaBuscaCorte` — efêmero, do retorno do motor (Seção 8.4) |
| Nº de chapas no custo de material | `N(M)` — mesma origem de sempre (Seção 5.2), agora sensível ao kerf |
| `ModuleViewer`: largura, altura, profundidade | `BoxModule.largura` · `.altura` · `.profundidade` (Seção 4.1) — mesma geometria do canvas 2D |
| `ModuleViewer`: cor sólida (`color`) | derivado de `BoxModule.material.cor` via `corParaHex()` (Seção 4.1) |
| `ModuleViewer`: textura de madeira (`textureUrl`) | `Produto` tipo `chapa` → `especificacao.texturaUrl` — **Seção 4.1.1** (Q-14 respondida). Imagens são pré-requisito de conteúdo do operador |
