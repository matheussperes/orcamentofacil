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

### 2.1 Engrossamento / dobra (briefing 7.2) — DUAS técnicas, BOMs distintos

Valores de borda: **30 / 45 / 60 mm**. Não é um flag — são dois caminhos de
fabricação diferentes que geram peças e metragem de fita diferentes:

```ts
type Engrossamento =
  | { tecnica: "engrossada"; borda_mm: 30 | 45 | 60 }
  //   → sarrafo colado atrás da borda: PEÇAS ADICIONAIS + cola + fita na face aparente
  | { tecnica: "dobrada";    borda_mm: 30 | 45 | 60 }
  //   → chapa usinada e dobrada a 45°: PEÇA ÚNICA MAIOR + operação de usinagem,
  //     sem peças extras, metragem de fita diferente
```

O impacto em metros lineares de fita é significativo — o motor de BOM precisa
tratar cada técnica com sua própria regra de explosão. Especificar ambas.

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
  x: number                                            // offset da borda esquerda da parede
  faixa: "inferior" | "bancada" | "aereo" | "torre"
  // Y é DERIVADO: faixa + alturas configuradas no perfil do marceneiro
  //   (altura do rodapé, altura da bancada, altura de instalação do aéreo, pé-direito)
}
```

Torna validação e detecção de adjacência quase triviais e casa com como a
marcenaria funciona (módulos no chão em fila, ou pendurados a altura fixa).

### 3.2 Parede e Ambiente

```ts
type Parede = {
  id: string
  altura: number
  largura: number
  elementos: ElementoParede[]      // janela, porta, tomada, ponto hidráulico
  itens: ItemPosicionado[]
  // primeiro corte: UMA parede por ambiente (briefing Seção 9)
}

type ElementoParede = {
  tipo: "janela" | "porta" | "tomada" | "ponto_hidraulico"
  x: number
  y: number
  largura: number
  altura: number
}

type Ambiente = {
  id: string
  nome: string                     // "Cozinha", "Quarto" — default do título da Linha de Proposta
  paredes: Parede[]                // primeiro corte: 1; futuro: I/L/U/quadrado
}
```

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

Regra de detecção (briefing 6.2): itens na mesma parede, mesma faixa, bordas
encostadas dentro de tolerância, **sem elemento de parede bloqueante entre
eles** (uma porta na parede quebra o bloco; uma janela acima da bancada não
quebra o bloco inferior). O usuário quebra/une via handle de junção na
elevação; a quebra é override, a detecção automática só vale onde não há
override.

### 3.4 Elementos contínuos unificados (briefing 6.1) — a maior simplificação

Tampo, rodapé e tamponamento são **o mesmo mecanismo**: elemento aplicado a um
conjunto, com dimensão **derivada**, não digitada. Isto elimina o "elemento
contínuo do V1" como caso especial — não é feature portada, é consequência do
modelo novo.

```ts
type ElementoContinuo = {
  id: string
  tipo: "tampo" | "rodape" | "tamponamento"
  conjuntoId: string
  lado?: "esquerda" | "direita" | "frente" | "superior"
  material: MaterialRef
  espessura: number
  sarrafo?: SarrafoConfig
  // dimensões NÃO são input — derivam (regra difere por tipo, ver abaixo)
}
```

| Elemento | Deriva de | Largura | Outra dimensão |
|---|---|---|---|
| **Tampo** | Bloco inteiro | Extensão total do bloco | Profundidade dos módulos (a maior, se variarem) |
| **Rodapé** | Bloco inteiro | Extensão total do bloco | Altura configurável no perfil |
| **Tamponamento** | **Módulo da extremidade** (não o bloco!) | — | Ver 3.5 |

### 3.5 Tamponamento (briefing 6.1) — deriva do módulo da extremidade

Encosta na face lateral de **um único módulo** (o da ponta exposta). Se o
bloco tem módulos de profundidades diferentes, a profundidade do tamponamento
vem do módulo da extremidade **daquele lado**, não do maior nem da média.

```ts
type Tamponamento = {
  tipo: "inteiro" | "sarrafo"
  lado: "esquerda" | "direita"
  material: MaterialRef            // cor — INPUT
  espessura: number               // INPUT
  // DERIVADOS — nunca digitáveis:
  //   altura       = altura do módulo da extremidade
  //   profundidade = "inteiro"  → profundidade do módulo da extremidade + 25mm
  //                  "sarrafo"  → 70mm (fixo)
}
```

**Inputs do usuário: tipo, lado, cor, espessura. Nada mais.**

### 3.6 O que quebra no `BoxModule` atual (briefing 6.4)

```ts
// ANTES (lib/engine/box/types.ts) — BayContent é union:
type BayContent =
  | { tipo: "espaco"; frente; prateleiras?; fundo? }
  | { tipo: "tamponamento"; lado; material; sarrafo }
// DEPOIS — tamponamento sai; BayContent deixa de ser union:
type BayContent = { frente; prateleiras?; fundo? }
```

- Parte do `docs/13-correcoes-box-v3.md` ("tamponamento por lado") fica
  **obsoleta** — resolvia um problema que o modelo novo elimina.
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
| **Organização** | — | Tenant raiz (D-13: tenant = Organização, não Usuário) | RLS root |
| **Usuário / Perfil** | Org | Nome, e-mail, telefone, endereço, logo, marca, unidade (mm/cm, D-05 global), alturas padrão, modo de precificação padrão, modo de montagem padrão | RLS por org |
| **Produto** | Org | Chapas, ferragens, LEDs, acessórios | **Cópia no signup** (D-15) — preço é local |
| **Módulo / Gabarito** | Global + Org | Por categoria | **Base global read-only + fork na edição** (D-15) |
| **Orçamento** | Org | Cliente, status, itens | RLS por org |
| **Ambiente / Parede** | Orçamento | Dimensões, elementos, itens posicionados | — |
| **Elemento contínuo** | Parede/Conjunto | Tampo, rodapé, tamponamento | — |
| **Linha de Proposta** | Orçamento | Agrupamento, render, descrição, `valorRateado` congelado | — |
| **Lista de material fechada** | Orçamento | Snapshot congelado, extraível (D-08: texto/CSV) | — |

**Cuidados de RLS (briefing 4.1)** — critério de aceitação, não follow-up:
- Cliente Supabase de servidor e de browser estritamente separados; `service_role`
  jamais no cliente.
- Toda tabela multi-tenant nasce com RLS + política **na mesma migration**.
- **Um teste de isolamento por tabela**: tenant A não lê dados do tenant B.

---

## 8. Veio de chapa (briefing 7.3) — restrição no bin-packing

```ts
// no cadastro do material:
type MaterialRef = { /* ...atual... */ temVeio: boolean }
```

- Sentido do veio por peça, derivado do papel/orientação.
- **Bin-packing aceita rotação apenas quando `!temVeio`.**
- Verificação de código confirmada: `lib/engine/box/cutting.ts:75-77` **hoje
  rotaciona sem restrição** (`{...p, w: p.h, h: p.w}`). Consequência a avisar
  ao operador: o aproveitamento atual está otimista para chapas com veio e
  **vai piorar (ficar correto)** após a restrição. Não é regressão.

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
