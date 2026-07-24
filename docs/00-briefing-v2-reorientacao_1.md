# Briefing V2 — Reorientação do orcamentofacil

> **Status:** entrada para o discovery formal (Fase A). Substitui o documento
> "Reorientação do produto: manter o motor, reconstruir a experiência" como
> briefing de entrada do Solution Architect.
>
> **Revisão 6 — decisões estruturais fechadas.** Incorpora o modelo de rateio
> sobre o plano de corte com exemplo trabalhado, a especificação do
> tamponamento, o modelo híbrido de blocos e as regras de frete e montagem.
> Nenhuma decisão bloqueante em aberto; a lista "Confirmar" pode ser assumida
> pelo Solution Architect e revista no PRD.

---

## 1. Correção do diagnóstico

O documento anterior concluiu que *"o problema real é organização de tela e
fluxo, não o motor de cálculo"*. Essa conclusão era válida para o escopo
investigado, mas **não se sustenta diante da visão de produto descrita pelo
operador**.

Conclusão corrigida:

- **Mantém-se** o núcleo do motor V3: explosão recursiva de caixa → BOM,
  bin-packing / plano de corte, pipeline de precificação, e os 96 testes.
- **Descarta-se** o motor V1 (templates).
- **Estende-se** o motor com: primitiva Placa, veio de chapa, modelo de
  Parede/Ambiente com validação, elementos contínuos unificados, modos de
  precificação, rateio de preço por linha.
- **Reconstrói-se** a experiência por cima, em telas separadas.
- **Adiciona-se** camada de persistência multi-tenant, hoje inexistente.

Isto **não é refatoração de apresentação. É a V2 do produto.**

---

## 2. Decisões tomadas

### D-01 — É um SaaS multi-usuário ✅

Confirmado. Consequências na seção 4.

### D-02 — Imagem por render automático + agrupamento comercial ✅

A imagem de cada linha da proposta é **render automático do canvas 2D**, com a
possibilidade de o marceneiro **agrupar múltiplos itens numa única linha de
orçamento**.

Exemplo dado pelo operador:
```
Cozinha  →  Módulo 1 + Módulo 2 + Módulo 3   → uma linha, uma imagem, um valor
Quarto   →  Módulo 4 + Módulo 5              → uma linha, uma imagem, um valor
```

Consequências na seção 5.

### D-03 — A parede valida encaixe; tamponamento é elemento de parede ✅

A parede **valida** posicionamento e encaixe dos itens. E — decisão de domínio
mais importante desta rodada — o **tamponamento sai do módulo e passa a ser
aplicado a um conjunto de módulos adjacentes na parede**, porque na prática ele
cobre vários módulos juntos, não um só.

Consequências na seção 6.

---

## 3. Visão de produto consolidada

Painel de orçamento para marceneiros: rápido, direto, sem exigir modelagem 3D.

**Jornada alvo:**

```
1. Login → área pessoal configurada (marca, unidades, alturas padrão,
   modelo de precificação)
2. Novo orçamento → dados do cliente
3. Definir ambiente → paredes (altura × largura) + elementos da parede
   (janela, porta, tomada, ponto hidráulico)
   → feedback visual 2D: planta baixa (I / L / U / quadrado) + elevação
4. Posicionar itens na parede:
   - Módulos (biblioteca própria ou padrão, por categoria)
   - Placas avulsas (painel, ripado, prateleira, fechamento de vão)
   → o sistema valida encaixe e detecta conjuntos adjacentes
5. Aplicar elementos contínuos sobre os conjuntos detectados
   (tampo, rodapé, tamponamento) — direto no layout da parede
6. Acompanhar em paralelo: plano de corte e resumo financeiro (6 campos)
7. Gerar orçamento → lista visual de material (pré-pedido de compra),
   frete e montagem editáveis, adição manual de itens
8. Orçamento fechado → lista de material congelada, extraível para o fornecedor
9. Montar linhas comerciais → agrupar itens em linhas de proposta,
   com render automático e rateio de preço
10. Gerar proposta → PDF com marca do marceneiro, sem custos internos,
    valor final à vista/parcelado
```

**Princípio de UX transversal:** configuração **dirigida por capacidade**. Cada
tipo de item declara quais seções de configuração se aplicam. Não se oferece
porta ou gaveta numa prateleira ou num painel ripado. Modelar como schema de
capacidades no domínio, não como condicionais na UI.

---

## 4. Consequências de D-01 (SaaS multi-usuário)

### 4.1 Autenticação e isolamento — ✅ DECIDIDO: Supabase, sem Prisma

**D-14 resolvida:** Supabase Auth + RLS. Prisma sai do projeto inteiramente.

Isolamento passa a ser garantido no banco via `auth.uid()` — um filtro esquecido
não vaza a tabela de preços de outra marcenaria. Para operador solo com dados
financeiros de terceiros, essa rede de proteção é o argumento decisivo.

**Escopo real dessa decisão (maior que trocar o auth):**

| O que sai | O que entra |
|---|---|
| `app/api/auth/*` (auth próprio) | Supabase Auth |
| `prisma/schema.prisma` | Migrations SQL Supabase + políticas RLS |
| `prisma/seed.ts` | Seed via SQL / script Supabase |
| Rotas de `app/api/clientes` e `app/api/orcamentos` sobre Prisma | Acesso via cliente Supabase |
| Prisma Client como camada de dados | Cliente Supabase (server e browser separados) |

Não é swap de biblioteca — é tarefa de Fase B com peso próprio.

**Cuidados de implementação a registrar no PRD:**

- Separação estrita entre cliente Supabase de servidor e de browser no Next.js.
- `service_role` key jamais exposta ao cliente.
- Toda tabela multi-tenant nasce com RLS habilitada e política escrita **junto
  com a migration**, não depois — tabela sem política é tabela aberta.
- Testes de isolamento: um teste por tabela verificando que o tenant A não lê
  dados do tenant B.

### 4.2 Forma do tenant

`Usuário` ou `Organização/Marcenaria` com N usuários?

Uma marcenaria real tem dono + vendedores + projetista. Se o tenant nascer
como usuário e precisar virar organização depois, a migração toca todas as
tabelas. Nascer como organização com 1 usuário é barato agora e caro depois.

**Recomendação:** tenant = Organização desde o início. Ver D-13.

### 4.3 Catálogos: padrão vs. próprio

Dois catálogos têm naturezas diferentes e pedem estratégias diferentes:

- **Produtos (chapas, ferragens, LEDs):** preço é inerentemente local — cada
  marcenaria compra do seu fornecedor. Atualização central do preço-base é
  irrelevante para o usuário.
  → **Cópia no signup.** Simples, RLS trivial.
- **Módulos padrão da plataforma:** a *geometria* é compartilhável e melhorável
  ao longo do tempo. O usuário se beneficia de novos módulos publicados.
  → **Base global read-only + fork na edição.** O usuário só cria registro
  próprio quando customiza.

Ver D-15.

### 4.4 Cobrança

Não bloqueia o PRD e não deve entrar no primeiro corte. Os primeiros clientes
podem ser faturados manualmente. Quando entrar, considerar Pix/boleto (Asaas,
Pagar.me, Iugu) além de cartão — público de marcenaria pequena no Brasil.

---

## 5. Consequências de D-02 (render + agrupamento comercial)

### 5.1 Nova entidade: Linha de Proposta

```ts
type LinhaProposta = {
  id: string
  titulo: string              // default: nome do ambiente
  itens: ItemOrcamento[]      // 1..N módulos e/ou placas
  imagem: RenderRef           // render automático DO CONJUNTO, não de cada item
  descricao: string           // pré-preenchida a partir dos dados dos itens
  valorRateado: number        // congelado no fechamento
}
```

**Restrição de projeto crítica para o canvas:** a função de render precisa
receber **uma lista de itens posicionados**, não um módulo. Se o canvas for
construído para renderizar um item por vez, suportar grupos depois é retrabalho
caro. Isso precisa estar na especificação desde o início.

**Default sugerido:** linha de proposta = ambiente. Cobre o caso comum com zero
trabalho do usuário; ele só intervém para dividir ou mesclar.

### 5.2 Rateio de preço — sobre o consumo real, não sobre custo isolado

**Restrição levantada pelo operador (correta e estruturante):** o custo **não é
aditivo por módulo**. Três módulos brancos 700×500×500 no mesmo orçamento
aninham nas mesmas chapas e custam menos que a soma de três orçamentos de um
módulo cada.

```
Custo(A + B + C)  ≠  Custo(A) + Custo(B) + Custo(C)
```

Causa: a chapa é **compartilhada** (aninhamento pelo bin-packing) e
**quantizada** (compra por chapa inteira).

**Isso invalida "somar custos isolados" — mas não favorece o m².** O rateio por
área sofre da mesma não-aditividade; apenas a esconde atrás de uma base menos
precisa. A correção é de natureza diferente: **ratear o consumo que efetivamente
aconteceu, em vez de calcular custos hipotéticos isolados.**

#### As duas naturezas de custo

| Natureza | Componentes | Comportamento |
|---|---|---|
| **Compartilhado / quantizado** | Chapas | Não aditivo. Depende do aninhamento e da compra por chapa inteira. |
| **Diretamente atribuível** | Fita de borda, ferragens, acessórios, LED | Aditivo. Pertence a uma peça/módulo específico. |

#### Fórmula corrigida — por material

```
para cada material M:
  chapaAlocada(item, M) = custoChapasCompradas(M)
                          × ( áreaPeças(item, M) ÷ Σ áreaPeças(M) )

custoAtribuído(item) = Σ_M chapaAlocada(item, M)
                     + fitaDeBorda(item)
                     + ferragens(item)
                     + acessórios(item)

preçoLinha = preçoFinal
           × ( Σ custoAtribuído(itens da linha) ÷ Σ custoAtribuído(todos os itens) )
```

#### Propriedades

- **Soma exata por construção.** O custo real das chapas compradas é distribuído
  integralmente — a sobra e a ineficiência de corte entram no rateio
  proporcionalmente, em vez de desaparecer.
- **Segregação por material.** MDF branco e MDF amadeirado não se misturam. Um
  módulo branco não paga pela chapa amadeirada de outro.
- **Sem contrafactual.** Não é preciso calcular "quanto custaria esse módulo
  sozinho" — número que não existe no orçamento real e que geraria exatamente a
  distorção apontada pelo operador.
- **Zero cálculo novo.** O BOM já entrega as peças com dimensões. Por m² seria
  necessário primeiro definir *qual* m² (frontal? de chapa? volume?) e depois
  calcular.

#### Exemplo trabalhado

Orçamento com três ambientes. Preço final: **R$ 19.000,00**.

Área de peças em chapa branca, por ambiente:

| Ambiente | Módulos | Área de peças (chapas-equivalente) |
|---|---|---|
| Cozinha | mod 1–6 | 7,4 |
| Guarda-roupas | mod 7–8 | 11,3 |
| Banheiro | mod 9 | 0,3 |
| **Total** | | **19,0** |

> ⚠️ **Não existe etapa de arredondamento separada.** O bin-packing já entrega o
> número inteiro de chapas do plano de corte. A sobra não é somada depois — ela
> já está dentro dessas chapas, como área não aproveitada distribuída entre
> elas. `N` é saída do motor, não cálculo posterior.

```
N(M) = número de chapas do material M no plano de corte   ← inteiro, do bin-packing

chapasAlocadas(item, M) = N(M) × ( áreaPeças(item, M) ÷ Σ áreaPeças(M) )
```

**Caso 1 — plano fecha em 19 chapas** (aproveitamento perfeito):

| Ambiente | Conta | Chapas alocadas |
|---|---|---|
| Cozinha | 19 × (7,4 ÷ 19,0) | 7,400 |
| Guarda-roupas | 19 × (11,3 ÷ 19,0) | 11,300 |
| Banheiro | 19 × (0,3 ÷ 19,0) | 0,300 |
| **Total** | | **19,000** ✓ |

Sem sobra a distribuir, a alocação reproduz as áreas exatamente.

**Caso 2 — plano fecha em 20 chapas** (mesma área, corte menos eficiente):

| Ambiente | Conta | Chapas alocadas |
|---|---|---|
| Cozinha | 20 × (7,4 ÷ 19,0) | 7,789 |
| Guarda-roupas | 20 × (11,3 ÷ 19,0) | 11,895 |
| Banheiro | 20 × (0,3 ÷ 19,0) | 0,316 |
| **Total** | | **20,000** ✓ |

A chapa de sobra é distribuída proporcionalmente. **Um mecanismo só, correto nos
dois casos.**

Chapa marrom e preta rodam a mesma conta, **independentemente por material**.
Depois somam-se ferragens (atribuição direta, sem rateio), frete e montagem. O
markup do modo de precificação aplica-se ao total, e os R$ 19.000 finais são
distribuídos na mesma proporção do custo alocado.

**Efeito desejável a notar:** no caso 2 o banheiro paga 0,316 chapa. Orçado
isoladamente precisaria de 1 chapa inteira. O ganho de combinar ambientes vai
para o cliente — comportamento correto e argumento comercial.

#### Inteiro para compra, fracionário para custo

| Contexto | Número exibido |
|---|---|
| **Resumo de material / pré-pedido ao fornecedor** | `N` **inteiro** — não se compra 18,3 chapas |
| **Rateio por ambiente / composição de custo** | **Fracionário** — serve para alocar custo, não para comprar |

#### Base do rateio: área de peças, não ocupação no plano de corte

Decisão técnica com consequência forte: a base deve ser a **área das peças**
extraída do BOM, **não** a ocupação de cada chapa no plano de corte.

A base por ocupação é tentadora porque soma 20 naturalmente — cada chapa é
atribuída a quem tem peças nela. Mas quebra no próprio exemplo acima:

> O banheiro consome 0,3 chapas. Se o bin-packing encaixar essas peças numa
> chapa junto com as da cozinha, o banheiro paga ~0,3 chapa (R$ 79). Se
> encaixar numa chapa nova quase vazia, paga 1,0 chapa (R$ 250). **Mesmo
> orçamento, mesmo móvel, três vezes o preço na linha — decidido pela ordem em
> que o algoritmo colocou as peças.**

Duas execuções do bin-packing com ordem de inserção diferente produziriam
alocações diferentes para o mesmo orçamento. Indefensável diante do cliente e
impossível de auditar. Área de peças é estável, reproduzível e independente do
algoritmo de corte.

#### Onde a sobra aparece (e onde não aparece)

| Tela | O que mostra |
|---|---|
| **Plano de corte / materiais** | Chapas compradas, área consumida e **sobra** — informação operacional útil (eficiência do corte, material remanescente para o próximo serviço) |
| **Orçamento / proposta** | Apenas as **chapas rateadas**. O valor intermediário de área consumida nunca aparece. |

#### Ordem da operação: ratear o preço final, não o custo

Rateia-se o **preço final** usando o custo alocado como *base de proporção* —
não se aplica o markup ambiente a ambiente.

Motivo: nos modos "multiplicador" e "percentual" os dois caminhos coincidem, mas
nos modos "valor fixo" e "valor por chapa" não. Ratear o preço final funciona
uniformemente nos quatro modos e garante que a soma feche por construção.

#### Frete e montagem — ✅ DECIDIDO

**Frete (D-23):** rateado **proporcionalmente ao custo alocado** de cada
ambiente. Não em partes iguais.

**Montagem (D-24):** o marceneiro escolhe **um** modo de cálculo da montagem,
configurado no perfil. Os modos são mutuamente exclusivos — não funcionam
simultaneamente:

1. Porcentagem do material
2. Por chapa de MDF
3. Lançamento manual

> ⚠️ **Regra de coerência:** a base do rateio da montagem entre ambientes deve
> **acompanhar a base do cálculo**, não ser sempre o custo. Calcular montagem
> por chapa e ratear por custo produz números internamente inconsistentes,
> impossíveis de justificar na conferência.

| Modo de cálculo | Base do rateio entre ambientes |
|---|---|
| % do material | Custo de material alocado |
| Por chapa de MDF | Chapas rateadas |
| Lançamento manual | Custo alocado, ou lançamento direto por ambiente |

> ✅ **O m² sai do produto por completo.** Era o último lugar onde aparecia,
> depois que o rateio da proposta passou a ser por custo alocado. Elimina uma
> ambiguidade de definição (área frontal? de chapa? desenvolvida?) que seria
> fonte garantida de bug.

**Visibilidade na proposta (D-25):** frete e montagem são **diluídos nos valores
por ambiente**. O cliente vê apenas as linhas de ambiente e o total — nenhuma
linha separada de frete ou montagem.

Consequência: o valor da linha é o único número que o cliente enxerga, o que
torna o override manual com rebalanceamento a ferramenta natural de negociação.

**Configuração:** o modo de cálculo de montagem vive no perfil da organização
como default, com override por orçamento.

#### Alerta operacional a expor na UI

Remover um ambiente **aumenta** o preço dos demais — eles passam a absorver mais
da chapa quantizada. Uma proposta nunca deve ser editada por subtração de linha;
precisa ser regerada. Isso deve virar aviso explícito na interface.

#### Três detalhes de implementação que mordem

1. **Arredondamento.** Rateio proporcional arredondado não soma exatamente o
   total. Regra: rateia todas as linhas menos a última; a última absorve o
   resíduo.
2. **Congelamento — agora crítico.** Como o rateio depende do aninhamento do
   orçamento inteiro, **adicionar um módulo altera o valor de todos os outros**.
   O valor rateado precisa ser persistido no fechamento da proposta, não
   recalculado na renderização. Uma proposta enviada é imutável.
3. **Base do custo de chapa.** Chapas inteiras compradas (teto) ou área
   consumida? Ver D-22.

**Override manual com rebalanceamento — primeiro corte, não extensão futura.**
O exemplo do operador fecha em R$ 7.800 / R$ 9.500 / R$ 1.700 — números redondos
que o rateio real não produziria (daria R$ 7.789,47 e afins). Marceneiro ajusta
linha para fechar redondo o tempo todo. Portanto: rateio automático como
default, com edição manual de uma linha e rebalanceamento automático das demais,
preservando a soma. `valorRateado` é campo persistido e sobrescrevível.

**Ideia registrada, fora de escopo:** a sobra tem valor residual reaproveitável
em serviços futuros. Rastrear "sobra aproveitável" seria diferencial real de
produto, mas não entra nesta rodada.

---

## 6. Consequências de D-03 (parede valida + tamponamento na parede)

### 6.1 Elementos contínuos unificados — a maior simplificação desta rodada

Tampo, rodapé e tamponamento passam a ser **o mesmo mecanismo**: um elemento
aplicado a um conjunto de módulos adjacentes, com dimensão **derivada da
extensão do conjunto**, não digitada.

```ts
type ElementoContinuo = {
  id: string
  tipo: "tampo" | "rodape" | "tamponamento"
  conjuntoId: string                    // derivado da adjacência
  lado?: "esquerda" | "direita" | "frente" | "superior"
  material: MaterialRef
  espessura: number
  sarrafo?: SarrafoConfig
  // dimensões NÃO são input — derivam da extensão do conjunto
}
```

Efeito colateral positivo: os "elementos contínuos" do V1, que o plano anterior
cogitava registrar como lacuna, deixam de ser caso especial. Não é uma feature
portada — é uma consequência do modelo novo.

#### Regra de derivação — difere por tipo de elemento

| Elemento | Deriva de | Largura | Outra dimensão |
|---|---|---|---|
| **Tampo** | Bloco inteiro | Extensão total do bloco | Profundidade dos módulos (a maior, se variarem) |
| **Rodapé** | Bloco inteiro | Extensão total do bloco | Altura configurável no perfil |
| **Tamponamento** | **Módulo da extremidade** | — | Ver especificação abaixo |

> ⚠️ **Tamponamento não deriva do bloco inteiro.** Ele encosta na face lateral
> de um único módulo — o da ponta exposta. Se o bloco tiver módulos de
> profundidades diferentes (500mm e 600mm), a profundidade do tamponamento vem
> do **módulo da extremidade daquele lado**, não do maior nem da média. Tampo e
> rodapé, ao contrário, derivam do bloco inteiro. Mesmo mecanismo, regras de
> derivação distintas.

#### Especificação do tamponamento (definida pelo operador)

```ts
type Tamponamento = {
  tipo: "inteiro" | "sarrafo"
  lado: "esquerda" | "direita"
  material: MaterialRef        // cor — input do usuário
  espessura: number            // input do usuário

  // DERIVADOS — nunca digitáveis:
  //   altura       = altura do módulo da extremidade
  //   profundidade = tipo "inteiro"  → profundidade do módulo da extremidade + 25mm
  //                  tipo "sarrafo"  → 70mm (fixo)
}
```

**Inputs do usuário: tipo, lado, cor, espessura. Nada mais.** Altura e
profundidade são consequência da geometria — permitir digitá-las é abrir fonte
de erro sem ganho.

### 6.2 Bloco: derivado por default, ajustável pelo usuário

A derivação puramente automática por adjacência é **insuficiente**. Caso real
apontado pelo operador: numa mesma parede pode haver (mod 1, 2, 3) formando um
bloco e (mod 4, 5, 6) formando outro, **com tamponamentos distintos**, mesmo
estando próximos.

**Modelo recomendado: híbrido.**

1. O sistema **detecta blocos automaticamente**: itens na mesma parede, mesma
   faixa, com bordas encostadas dentro de uma tolerância, sem elemento de parede
   bloqueante entre eles (uma porta na parede quebra o bloco; uma janela acima
   da bancada não quebra o bloco inferior).
2. O usuário pode **quebrar ou unir** blocos manualmente. A quebra é persistida
   como override; a detecção automática só vale onde não há override.

#### Sugestão de interação — handle de junção na elevação

Fazer na **elevação da parede**, não em lista separada: o agrupamento é um fato
físico e deve ser manipulado onde a física está visível.

- Blocos detectados aparecem com contorno/colchete acima dos módulos, rotulados
  (Bloco A, Bloco B).
- Entre dois módulos adjacentes há um **handle de junção** clicável, que alterna
  entre *unido* e *separado*. Separado = fronteira de bloco = ponto onde
  tamponamento pode ser aplicado.
- Ao selecionar um bloco, o painel lateral mostra seus elementos contínuos — e
  as opções de tamponamento aparecem **apenas para as extremidades expostas**
  daquele bloco (aplicação direta do princípio de configuração dirigida por
  capacidade).

O handle de junção é uma peça mínima de UI que resolve toda a ambiguidade de
agrupamento sem exigir tela nova.

**Alternativa considerada e não recomendada:** agrupamento por lista ou drag em
painel separado. Divorcia o agrupamento da realidade física e obriga o
marceneiro a manter dois modelos mentais do mesmo layout.

### 6.3 Dois tipos de agrupamento — não colapsar

| | **Conjunto (físico)** | **Linha de Proposta (comercial)** |
|---|---|---|
| Origem | Derivado da adjacência | Criado pelo usuário |
| Escopo | Uma parede, uma faixa | Pode cruzar paredes e faixas |
| Serve para | Elementos contínuos, validação | Apresentação e rateio de preço |
| Exemplo | 3 inferiores encostados na parede norte | "Cozinha" (em L, duas paredes) |

São conceitos distintos com donos distintos. Colapsá-los quebra o caso "Cozinha
em L" da D-02.

### 6.4 O que quebra

- **`tamponamento` sai do `BayContent`.** O union do bay perde um branch:
  ```ts
  // antes
  type BayContent =
    | { tipo: "espaco"; frente; prateleiras?; fundo? }
    | { tipo: "tamponamento"; lado; material; sarrafo }
  // depois
  type BayContent = { frente; prateleiras?; fundo? }   // deixa de ser union
  ```
- **Parte do doc 13 é descartada** — a rodada de correções "tamponamento por
  lado" resolvia um problema que o modelo novo elimina.
- **Presets em localStorage migram.** Presets contendo bays de tamponamento
  precisam de migração (existe `migrate.test.ts`) ou descarte explícito. Como é
  pré-lançamento e localStorage, descarte com aviso é aceitável.

### 6.5 Modelo de posicionamento — 1D com faixas

**Recomendação forte: não implementar posicionamento 2D livre.** Cada item tem:

```ts
{ x: number,                                        // offset da borda esquerda
  faixa: "inferior" | "bancada" | "aereo" | "torre" }
```

O Y é **derivado** da faixa + alturas configuradas no perfil do marceneiro
(altura do rodapé, altura da bancada, altura de instalação do aéreo, pé-direito).

Por quê: torna validação e detecção de adjacência quase triviais, casa com como
marcenaria funciona de verdade (módulos sentam no chão em fila ou penduram a
altura fixa), e economiza semanas. Posicionamento 2D livre é armadilha de
escopo. Ver D-20.

### 6.6 Níveis de validação — escopar ou consome meses

| Tier | Validação | Rodada |
|---|---|---|
| **1** | Item cabe na parede (largura acumulada ≤ largura; altura ≤ altura). Itens não se sobrepõem. | Esta |
| **2** | Faixas não colidem entre si. Itens respeitam elementos da parede (janela, porta, tomada, ponto hidráulico). | Esta |
| **3** | Folgas técnicas, ergonomia, avisos contextuais ("aéreo sobre fogão precisa de X cm"). | Depois |

Tier 2 importa porque o operador citou explicitamente "elementos da parede" — e
uma janela é exatamente o que obriga o marceneiro a repensar o layout. Ver D-19.

---

## 7. Delta contra o estado atual

Legenda: **[E]** existe · **[P]** parcial · **[N]** novo

### 7.1 Motor e domínio

| Item | Status | Observação |
|---|---|---|
| Caixa → vãos → BOM | **[E]** | Preservado |
| Bin-packing / plano de corte | **[E]** | Preservado; precisa de restrição de veio |
| Pipeline de custo e margem | **[P]** | Precisa dos modos de precificação e do rateio |
| Motor V1 de templates | **[E]** | **Removido** |
| Primitiva Placa | **[N]** | Ver 7.2 |
| Veio de chapa no corte | **[N]** | Ver 7.3 |
| Parede / Ambiente + validação | **[N]** | Seção 6 |
| Elementos contínuos unificados | **[N]** | Seção 6.1 |
| Tamponamento em `BayContent` | **[E]** | **Removido** — migra para elemento contínuo |
| Modos de precificação | **[N]** | Ver 7.4 |
| Linha de Proposta + rateio | **[N]** | Seção 5 |
| Render de conjunto | **[N]** | Seção 5.1 |
| Persistência multi-tenant | **[N]** | Seção 7.5 |

### 7.2 Primitiva Placa

Uma `Placa` **não é** um `BoxModule`. Não tem carcaça nem vãos.

```ts
type ItemOrcamento = BoxModule | Placa
```

> ⚠️ **Nota para a Fase B.** O plano anterior previa colapsar `ModuloOrcamento`
> em tipo único ao remover o branch de template. **Não colapsar.** O union
> permanece, com branches diferentes.

**Atributos base:** espessura, material, orientação (horizontal / vertical /
alinhada à parede), acabamento de borda por lado, dimensões.

**Modificadores:**

- **Engrossamento / dobra — 30 / 45 / 60 mm.** São **duas técnicas distintas
  com BOMs distintos**:
  - *Engrossada*: sarrafo colado atrás da borda → peças adicionais + cola + fita
    na face aparente.
  - *Dobrada*: chapa usinada e dobrada a 45° → peça única maior + operação de
    usinagem, sem peças extras, metragem de fita diferente.
  O impacto em metros lineares de fita é significativo. Especificar ambas.
- **Ripado.** É um **gerador de peças**: a partir de largura da ripa +
  quantidade, deriva N peças, calcula espaçamento e representa visualmente.
  Ver D-06.
- **Uso funcional:** prateleira, fechamento de vão, painel de parede.

### 7.3 Veio de chapa

- Flag `temVeio: boolean` no cadastro do material.
- Sentido do veio por peça, derivado do papel/orientação.
- Bin-packing aceita rotação **apenas** quando `!temVeio`.

**Verificar antes de especificar:** se `lib/cutting.ts` rotaciona hoje. Se
rotaciona sem restrição, os números atuais de aproveitamento estão otimistas
para chapas com veio e vão piorar após a correção — o operador deve saber disso
antes de ver o número mudar.

### 7.4 Modos de precificação

1. Multiplicador sobre custo de material (× N)
2. Percentual sobre custo de material (+ N%)
3. Valor por chapa de MDF consumida
4. Valor fixo

Frete e montagem são linhas separadas e editáveis.

**Resumo financeiro — 6 campos:**

| Campo | Definição |
|---|---|
| Preço final | Soma de tudo |
| Custo de material | Chapas + acabamentos + ferragens + acessórios |
| Montagem | Mão de obra (inclusive a própria) |
| Frete | Editável |
| Lucro final | Preço final − material − montagem − frete |
| Margem de lucro | Lucro final ÷ preço final |

> ⚠️ **D-07:** como montagem é custo mesmo quando executada pelo próprio
> marceneiro, o "lucro final" exclui a remuneração do trabalho dele. Escolha
> legítima e provavelmente correta, mas deve ser explícita.

### 7.5 Persistência

Hoje, no fluxo V3: gabaritos em `localStorage`, lista de módulos em `useState`.
**Nada sobrevive a um reload.** Backend real existe só para auth, clientes e
orçamentos (Prisma), não usado pelo fluxo de caixa.

Entidades a persistir, agora com tenant:

| Entidade | Escopo | Conteúdo |
|---|---|---|
| Organização | — | Tenant raiz |
| Usuário / Perfil | Org | Nome, e-mail, senha, telefone, endereço, logo, marca, unidade (mm/cm), alturas padrão, modo de precificação padrão |
| Produto | Org | Chapas, ferragens, LEDs, acessórios — cópia no signup |
| Módulo / Gabarito | Global + Org | Base global read-only + fork na edição, por categoria |
| Orçamento | Org | Cliente, status, itens |
| Ambiente / Parede | Orçamento | Dimensões, elementos, itens posicionados |
| Elemento contínuo | Parede | Tampo, rodapé, tamponamento por conjunto |
| Linha de Proposta | Orçamento | Agrupamento, render, descrição, valor rateado congelado |
| Lista de material fechada | Orçamento | Snapshot congelado, extraível |

**O mapa de telas não pode ser fechado antes do modelo de dados.** Construir a
UI sobre um núcleo sem estado significa reconstruí-la depois.

---

## 8. Fases corrigidas

### Fase A — Discovery (Solution Architect) · nenhum código

1. PRD específico com a jornada da seção 3 e escopo negativo declarado.
2. **Modelo de domínio** — `ItemOrcamento` como union, entidades da 7.5,
   schema de capacidades por tipo de item, conjunto derivado vs. linha comercial.
3. Mapa de telas/IA, derivado do modelo de domínio.
4. Lista de arquivos do V1 a remover + plano de migração de presets.
5. Atualização do `docs/Backlog.md`: o que das Tasks 6.1-6.5 / 7.1 / 7.2 é
   reaproveitável, e o que do doc 13 é descartado.

### Fase B — Motor e dados (Backend Engineer)

1. Decisão de auth resolvida e implementada (D-14).
2. Remoção do V1 (23 testes removidos junto, sem órfãos).
3. Modelo de dados multi-tenant + migrations + persistência real.
4. Primitiva `Placa` + modificadores.
5. Parede/Ambiente + posicionamento 1D + validação Tier 1-2.
6. Elementos contínuos unificados; tamponamento sai do `BayContent`; migração.
7. Veio de chapa no bin-packing.
8. Modos de precificação + rateio por custo direto com congelamento.

**Verificação:** `npm test` verde com os testes do V3 + novos para Placa, veio,
elementos contínuos, validação de parede, modos de precificação e rateio
(incluindo o caso de arredondamento: soma das linhas == total).

### Fase C — Experiência (Frontend Engineer), tela por tela

Reaproveita: fundação Tailwind + shadcn/ui, laboratório `/modulo` como base do
Editor de Item, canvas de plano de corte.

Refeito: `app/page.tsx` decomposto.

Ordem: Editor de Item (módulo + placa, dirigido por capacidades) → Ambiente e
Paredes (2D, validação, elementos contínuos) → Orçamento em edição → Plano de
Corte e Materiais → Linhas de Proposta e PDF → Área pessoal.

Cadência: validação em lote por conjunto de telas.

---

## 9. Recorte mínimo sugerido (primeiro cliente pagante)

**Dentro:** auth multi-tenant + perfil com marca, catálogo de produtos editável,
biblioteca de módulos com categorias, primitiva Placa, **uma parede por
ambiente** com validação Tier 1, elementos contínuos, plano de corte com veio,
resumo de 6 campos com **um** modo de precificação, lista de material, linhas de
proposta com rateio, PDF com marca.

**Fora do primeiro corte:** múltiplas paredes + planta baixa L/U/quadrado,
validação Tier 2 e 3, os outros 3 modos de precificação, override manual de
rateio, versionamento de orçamento, cobrança automatizada.

Sugestão, não decisão — mas vale ser deliberado sobre o que entra antes de
alguém pagar, dado o histórico de construir sistema antes de faturamento e a
regra "feito = dinheiro recebido".

---

## 10. Decisões abertas

### Resolvidas

| # | Decisão | Resultado |
|---|---|---|
| **D-01** | SaaS multi-usuário? | ✅ Sim |
| **D-02** | Imagem: upload ou render? | ✅ Render automático + agrupamento comercial |
| **D-03** | Parede valida? | ✅ Sim; tamponamento é elemento de bloco na parede |
| **D-13** | Tenant = Usuário ou Organização? | ✅ Organização |
| **D-14** | Supabase Auth + RLS ou Prisma? | ✅ Supabase, Prisma sai do projeto |
| **D-17** | Linha de proposta = ambiente? | ✅ Sim — confirmado pelo exemplo trabalhado |
| **D-19** | Nível de validação da parede? | ✅ Tier 1 + 2 |
| **D-20** | Posicionamento 1D ou 2D livre? | ✅ 1D com faixas |
| **D-22** | Base da contagem de chapa | ✅ `N` inteiro do plano de corte; sem arredondamento posterior |
| **D-23** | Frete: igual ou proporcional? | ✅ Proporcional ao custo alocado |
| **D-24** | Montagem: como calcular e ratear? | ✅ 3 modos exclusivos (% material, por chapa, manual), escolhidos no perfil; rateio acompanha a base do cálculo |
| **D-25** | Frete/montagem visíveis ou diluídos? | ✅ Diluídos nos valores por ambiente |

| **D-26** | Definição de m² para montagem | ✅ Não se aplica — m² removido do produto |

### Confirmar (recomendação já dada)

| # | Decisão | Recomendação |
|---|---|---|
| **D-04** | Quantos modos de precificação na V2? | Um só no primeiro corte |
| **D-05** | Unidade mm/cm global ou por campo? | Global no perfil |
| **D-06** | Ripado: usuário define quantidade e sistema calcula espaçamento, ou o inverso? | Quantidade → espaçamento derivado |
| **D-07** | Montagem é custo mesmo quando executada pelo próprio marceneiro? | Sim, custo |
| **D-08** | Lista para fornecedor: formato por fornecedor ou texto/CSV copiável? | Texto/CSV |
| **D-09** | Parcelamento: texto livre ou cálculo com juros? | Texto livre na V2 |
| **D-10** | Quem cria os módulos padrão e em que volume? | Principal custo de conteúdo — planejar |
| **D-12** | Versionamento de orçamento entra agora? | Não |
| **D-15** | Catálogo: cópia no signup ou base global + override? | Produtos = cópia; Módulos = base global + fork |
| **D-18** | Cobrança automatizada entra quando? | Depois do primeiro corte; faturar manual |

---

## 11. Verificação prévia no código (antes do PRD)

1. `lib/cutting.ts` rotaciona peças hoje? Com ou sem restrição de veio?
2. `lib/orcamento.ts` — forma exata do `ModuloOrcamento`, para planejar a
   substituição do branch em vez da remoção do union.
3. O pipeline financeiro aplica margem em que ponto — sobre custo total ou sobre
   material? Define o encaixe dos 4 modos.
4. O canvas atual renderiza um módulo por vez ou aceita lista de itens? Define
   o esforço do render de conjunto (seção 5.1).
5. `migrate.test.ts` — que mecanismo de migração de preset já existe?
