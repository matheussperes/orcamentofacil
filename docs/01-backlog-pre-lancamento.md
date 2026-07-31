# Backlog Pré-Lançamento — Orça Fácil

> **Origem:** quatro rodadas de walkthrough do produto em produção (Partes 1–4),
> gravadas e transcritas. Este documento consolida, deduplica, classifica e
> sequencia os ~87 itens levantados.
>
> **Status:** entrada para planejamento de execução. Sete perguntas na seção 6
> devem ser respondidas antes do Lote 2.
>
> **Documento irmão:** `00-briefing-v2-reorientacao.md` (decisões de arquitetura
> e domínio). Onde houver conflito entre os dois, este documento é mais recente —
> mas os conflitos estão listados na seção 5, não resolvidos silenciosamente.

---

## 1. Como ler este documento

O feedback veio organizado por **tela** (dashboard → biblioteca → ambientes →
proposta → catálogo). Aqui está reorganizado por **dependência de execução**,
porque construir na ordem das telas faria vários itens serem refeitos.

Classificação usada:

| Tag | Significado |
|---|---|
| 🔴 **BLOQ** | Bloqueia lançamento — produto não é vendável sem isso |
| 🟠 **BUG** | Comportamento errado do que já existe |
| 🟡 **LACUNA** | Funcionalidade esperada que nunca foi construída |
| 🔵 **UX** | Existe e funciona, mas está confuso, feio ou mal nomeado |
| ⚪ **DEPOIS** | Legítimo, mas não é pré-lançamento |

---

## 2. Cinco achados que reorganizam a prioridade

### 2.1 🔴 Cinco bugs reportados têm uma causa técnica só

Sintomas reportados em partes diferentes da gravação:

- Proposta não atualiza depois de salvar no financeiro
- F5 na aba "corte e material" joga de volta para "ambientes"
- Botão "atualizar render" não faz nada
- Salvar em ambientes não propaga para corte/material
- Valor da proposta muda só de navegar para fora e voltar

**Causa raiz única:** a aplicação não invalida cache após mutação, e o estado da
aba não está na URL. Um lote técnico resolve os cinco.

### 2.2 🔴 O congelamento da proposta nunca foi implementado

Observação do operador: *"os valores estão certinhos, só estão desatualizados."*

Se navegar entre abas muda o número exibido, a proposta está sendo **recalculada
a partir do estado vivo**, não lida de um snapshot persistido. O congelamento
definido no briefing V2 (seção 5.2) não existe no código.

Consequência comercial: uma proposta enviada ao cliente por R$ 4.584 que reabre
mostrando R$ 3.551 destrói a confiança na ferramenta. Isso não é bug de exibição —
é bloqueador de lançamento.

**Nota de investigação:** na leitura relatada há uma diferença de exatamente
R$ 6,00 entre o esperado (material 1.664,39 + montagem 1.250,00 + lucro 1.664,38
= 4.578,77) e o exibido (4.584,77). Pode ser edição entre leituras, ou resíduo de
arredondamento não absorvido pela última linha. Verificar com dados reais antes de
assumir que a matemática está correta.

### 2.3 🔴 "Ambiente" não existe como entidade

A Parte 1 expõe o buraco: *"eu tô construindo essa parede dentro de qual
ambiente?"* Hoje parede não pertence a nada.

A Parte 3 depende dele: linhas de proposta são ambientes (D-17 do briefing).

**Deve ser o primeiro item de execução.** Se vier depois, pelo menos seis itens
são construídos duas vezes: cadastro de ambientes, altura de perfil por parede,
seleção em cascata (categoria = ambiente), agrupamento na proposta, dashboard por
ambiente, e o rateio de custo.

### 2.4 🔴 Não é possível criar módulo

O usuário consegue abrir e editar módulos existentes, mas não criar novos. Um
SaaS onde o cliente não consegue cadastrar o jeito que ele mesmo trabalha não é
lançável.

Isso amplifica a **D-10** do briefing (quem cria os módulos padrão e em que
volume): se não dá para criar, o seed é literalmente tudo que o produto oferece.

### 2.5 🔵 Vocabulário de especificação vazou para a interface

O card "validação tier 1 + tier 2" usa nomenclatura criada no briefing V2 para
escopar níveis de validação (D-19). É linguagem interna de planejamento, não de
produto — o marceneiro não sabe o que é um "tier".

**Ação:** remover o card e fazer uma varredura por outros termos de spec que
tenham vazado do documento para a tela.

---

## 3. Sequência recomendada

```
Lote 0 — Fundação de dados          ← bloqueia tudo
Lote 1 — Confiança e estado         ← bloqueia lançamento
Lote 2 — Lacunas funcionais         ← depende do Lote 0
Lote 3 — Precisão do motor          ← independente
Lote 4 — Cadastros e identidade     ← independente
Lote 5 — Limpeza visual             ← independente, paralelizável
Lote 6 — Pós-lançamento
```

**Lotes 3, 4 e 5 são independentes entre si e do Lote 0.** Se houver frustração
com o tempo sem resultado visível, o Lote 5 pode ser puxado para frente — é o que
transforma a percepção de "teste de possibilidades" em "produto", e não bloqueia
nem é bloqueado por nada.

---

## 4. Backlog por lote

### Lote 0 — Fundação de dados

Nada aqui é visível na tela. Tudo aqui bloqueia o resto.

| # | Item | Tag |
|---|---|---|
| 0.1 | **Ambiente como entidade real**, filho do orçamento. Um orçamento tem N ambientes (cozinha, quarto 1, quarto 2, banheiro) | 🔴 BLOQ |
| 0.2 | **Parede pertence a um ambiente.** Um ambiente tem N paredes | 🔴 BLOQ |
| 0.3 | **Módulo posicionado pertence a uma parede** (e portanto a um ambiente) | 🔴 BLOQ |
| 0.4 | **Altura de perfil é configuração por parede**, não global (ver Q-1) | 🟡 LACUNA |
| 0.5 | **Editar dados do cliente após criação** (nome, telefone, etc.) | 🟡 LACUNA |
| 0.6 | Parede recebe **nome livre** ("parede da pia", "parede do box") além do identificador | 🟡 LACUNA |
| 0.7 | **Snapshot congelado da proposta** — entidade persistida, não recálculo (ver 2.2) | 🔴 BLOQ |

### Lote 1 — Confiança e estado

| # | Item | Tag |
|---|---|---|
| 1.1 | **Invalidação de cache após mutação** — salvar em qualquer aba propaga para as demais | 🔴 BLOQ |
| 1.2 | **Aba persistida na URL** — F5 mantém a aba atual, não volta para ambientes | 🟠 BUG |
| 1.3 | **Botão "atualizar render" funciona** sem F5 | 🟠 BUG |
| 1.4 | **Proposta lê do snapshot congelado**, nunca recalcula ao renderizar | 🔴 BLOQ |
| 1.5 | **Paridade financeiro ↔ proposta**: soma das linhas == preço final, sempre. Teste automatizado, não verificação visual | 🔴 BLOQ |
| 1.6 | **Resíduo de arredondamento** absorvido pela última linha (regra do briefing 5.2) | 🟠 BUG |
| 1.7 | **Bug do valor por chapa**: chapas de 6mm com baixo aproveitamento não estavam sendo contadas. Regra: tudo na categoria "chapa" conta como chapa, independente de aproveitamento | 🟠 BUG |
| 1.8 | Bug de navegação: link "calculadora" no editor leva para a raiz/dashboard | 🟠 BUG |

### Lote 2 — Lacunas funcionais

Depende do Lote 0.

**Biblioteca e criação de módulos**

| # | Item | Tag |
|---|---|---|
| 2.1 | **Criar novo módulo** — página/fluxo dedicado, acessível da biblioteca e do menu lateral | 🔴 BLOQ |
| 2.2 | Manter filtro por ambiente na listagem (já está bom) | — |

**Ambientes e paredes**

| # | Item | Tag |
|---|---|---|
| 2.3 | Cadastrar e editar ambientes dentro do orçamento | 🟡 LACUNA |
| 2.4 | Adicionar múltiplas paredes por ambiente | 🟡 LACUNA |
| 2.5 | Seletor de parede que expande o painel de configuração daquela parede | 🔵 UX |
| 2.6 | Indicação visual permanente de **qual ambiente e qual parede** estão em edição | 🔵 UX |

**Elementos de parede**

| # | Item | Tag |
|---|---|---|
| 2.7 | Adicionar tipo **"pedra"** (limite de mármore/bancada de pedra) | 🟡 LACUNA |
| 2.8 | **Editar elemento após adicionar** — via clique na linha da lista OU clique na representação 2D | 🟡 LACUNA |
| 2.9 | **X com referência escolhível**: afastamento da parede esquerda ou direita | 🟡 LACUNA |
| 2.10 | **Y com referência escolhível**: afastamento do chão ou do teto | 🟡 LACUNA |
| 2.11 | **Rótulos descritivos em vez de "X" e "Y"** — marceneiro não usa vocabulário cartesiano | 🔵 UX |
| 2.12 | Elementos de parede cadastráveis no catálogo (ver Q-5) | 🟡 LACUNA |

**Itens posicionados**

| # | Item | Tag |
|---|---|---|
| 2.13 | **"Preset" → "Módulo"** em toda a interface | 🔵 UX |
| 2.14 | **Seleção em cascata**: ambiente → faixa → módulo. O campo de módulo só libera depois da faixa | 🟡 LACUNA |
| 2.15 | **Faixas renomeadas**: inferior, meio (era "bancada"), aéreo, torre | 🔵 UX |
| 2.16 | Torre ocupa as três faixas | 🟡 LACUNA |
| 2.17 | Módulo inferior **cola automaticamente** na faixa inferior respeitando o rodapé | 🟡 LACUNA |
| 2.18 | **Posicionamento relativo ao vizinho** — o valor informado é o vão até o módulo pré-existente daquele lado, não o afastamento da parede (ver Q-2) | 🟡 LACUNA |
| 2.19 | **Editar módulo no momento da inserção**, na mesma página: largura, altura, profundidade | 🟡 LACUNA |
| 2.20 | Editar: **cor e espessura da caixa** | 🟡 LACUNA |
| 2.21 | Editar: **cor e espessura das portas** | 🟡 LACUNA |
| 2.22 | Editar: **fundo sim/não** | 🟡 LACUNA |
| 2.23 | Editar: **tipo de puxador** (ponto, haste, perfil) | 🟡 LACUNA |

**Elevação da parede**

| # | Item | Tag |
|---|---|---|
| 2.24 | **Módulos aparecem na elevação** — hoje só elementos de parede são desenhados | 🔴 BLOQ |
| 2.25 | Faixas rotuladas na elevação com a nomenclatura nova | 🔵 UX |
| 2.26 | Torre desenhada atrás/ao lado dos módulos, refletindo sobreposição real | 🔵 UX |
| 2.27 | **Cotas à direita**: altura total da parede + altura de cada faixa (inferior, meio, aéreo) | 🟡 LACUNA |

**Agrupamento**

| # | Item | Tag |
|---|---|---|
| 2.28 | **Agrupamento comercial cross-faixa** — vincular aéreo com inferior, torre, ou faixa do meio, para virar uma linha só na proposta (ver Q-3) | 🟡 LACUNA |
| 2.29 | Botão de tag de conjunto disponível também nos módulos superiores, não só nos inferiores | 🟡 LACUNA |
| 2.30 | **Bloco físico permanece separado** do agrupamento comercial — mesma faixa, adjacência, base para tampo/rodapé/tamponamento | 🔴 BLOQ |

**Proposta**

| # | Item | Tag |
|---|---|---|
| 2.31 | **Cancelar/reverter divisão de linha** — item volta para a linha mãe | 🟡 LACUNA |
| 2.32 | Subdividir dentro do ambiente **mantendo o vínculo** (quarto → cabeceira, penteadeira, gaveteiro, guarda-roupa, todos sob "Quarto") | 🟡 LACUNA |

### Lote 3 — Precisão do motor

Independente dos demais lotes.

| # | Item | Tag |
|---|---|---|
| 3.1 | **Plano de corte: rotação de peças** quando o material não tem veio. Caso relatado: faixa livre de 30cm × 2,70m ignorada, sistema abriu chapa nova para um sarrafo de 7cm × 1,5m | 🟠 BUG |
| 3.2 | **Exibir o veio da placa** na visualização do plano de corte (MDF Loro Freijó não mostra) | 🟡 LACUNA |
| 3.3 | Avaliar substituição do algoritmo de bin-packing por um mais eficiente (ver 5.4 antes de decidir) | ⚪ DEPOIS |
| 3.4 | **Contagem de cortes / passadas de serra** no resultado do plano de corte | 🟡 LACUNA |
| 3.5 | **Fita de borda discriminada por cor** — hoje mostra "29m" sem dizer de qual | 🔴 BLOQ |
| 3.6 | **Cálculo de rolos de fita a comprar**, a partir do tamanho de rolo cadastrado no catálogo (não hardcoded — ver 5.3) | 🟡 LACUNA |
| 3.7 | **Quantidade sem m²** na lista de material — número inteiro simples | 🔵 UX |
| 3.8 | **Editar quantidade** na lista de material (só quantidade; valor, categoria e descrição permanecem travados) | 🟡 LACUNA |
| 3.9 | Manter item manual/personalizado (espelho, LED, serviço) — confirmado como essencial | — |
| 3.10 | **Tampo: modelo antes da espessura** — simples, engrossado ou dobrado | 🟠 BUG |
| 3.11 | **Espessuras condicionadas ao modelo**: simples → 15/18/25mm; engrossado ou dobrado → 30/45/60mm (base 15) e 36/54mm (base 18). Nunca 6mm | 🟠 BUG |
| 3.12 | Confirmar o **BOM de cada modelo de tampo** (ver Q-4) | 🟡 LACUNA |

**Saída esperada do plano de corte** (consolidação do que o operador descreveu):

1. Quantas placas de MDF e quais (por material e cor)
2. Quantos cortes / passadas de serra
3. Quantos metros de fita de borda e quais fitas (por cor)

### Lote 4 — Cadastros e identidade

Independente. É o lote que faz o produto parecer um SaaS de verdade.

**Catálogo unificado**

| # | Item | Tag |
|---|---|---|
| 4.1 | **Card único** com seletor de categoria interno, eliminando as abas separadas (chapa, ferragem, LED, acessório, fita) | 🔵 UX |
| 4.2 | Botão genérico **"Adicionar item"** — nunca "Adicionar chapa" | 🔵 UX |
| 4.3 | **Campos dinâmicos por categoria**, aparecendo só depois da seleção do tipo | 🟡 LACUNA |
| 4.4 | **Código universal** para todos os itens, para chamada rápida no orçamento | 🟡 LACUNA |
| 4.5 | Campos universais: código, preço, status | — |

Campos por categoria:

| Categoria | Campos específicos |
|---|---|
| Chapa | nome, cor, espessura |
| Ferragem | nome, unidade (un / m / m² / "perfil de 3m") |
| Fita de borda | nome, espessura, unidade (rolo de 20m / 100m / 300m) |
| LED | nome, unidade (metro / kit) |
| Acessório | nome, unidade |
| *Elemento de parede* | *nome, largura, altura — ver Q-5* |

**Perfil**

| # | Item | Tag |
|---|---|---|
| 4.6 | **Máscara de CNPJ** | 🟡 LACUNA |
| 4.7 | **Máscara de telefone**, aceitando 10 ou 11 dígitos | 🟡 LACUNA |
| 4.8 | **Upload de logo** substituindo o campo de URL | 🔴 BLOQ |
| 4.9 | Logo persiste e aparece em todos os lugares que a exibem | 🔴 BLOQ |
| 4.10 | **Fallback**: sem logo cadastrada, exibe a marca padrão Orça Fácil | 🟡 LACUNA |
| 4.11 | **Upload de foto de perfil** pessoal | 🟡 LACUNA |
| 4.12 | **Área de segurança** dedicada no perfil | 🟡 LACUNA |
| 4.13 | **Troca de senha** com confirmação por e-mail | 🔴 BLOQ |
| 4.14 | **E-mail não editável** — decisão explícita, é o identificador da conta | — |
| 4.15 | **Excluir conta** disponível no perfil | 🔴 BLOQ |

> 🔴 4.8/4.9 são bloqueadores porque a proposta com a marca do marceneiro é a
> entrega final do produto. Sem upload funcionando, o PDF sai com a marca errada
> ou sem marca. 4.13/4.15 são bloqueadores por obrigação legal (LGPD) e por
> expectativa mínima de qualquer SaaS.

### Lote 5 — Limpeza visual

Independente e paralelizável. É o lote que responde à percepção de *"não tenho um
produto, tenho um teste de possibilidades"*.

| # | Item | Tag |
|---|---|---|
| 5.1 | **Biblioteca de módulos na versão nova** — hoje é layout/UX da versão antiga | 🔵 UX |
| 5.2 | **Editor de módulo na versão nova** — mesma situação | 🔵 UX |
| 5.3 | **Remover textos clicáveis antigos** (editor, calculadora, biblioteca, catálogo) das duas telas | 🔵 UX |
| 5.4 | **Menu lateral presente** na biblioteca e no editor | 🔵 UX |
| 5.5 | **Remover o card "validação tier 1 + tier 2"** (ver 2.5) | 🔵 UX |
| 5.6 | **Varredura por vocabulário de especificação** vazado para a UI | 🔵 UX |
| 5.7 | Dashboard / orçamentos recentes: **remover prazo de entrega** | 🔵 UX |
| 5.8 | Dashboard / orçamentos recentes: **adicionar valor final do projeto** | 🟡 LACUNA |
| 5.9 | Dashboard / orçamentos recentes: **adicionar custo** | 🟡 LACUNA |
| 5.10 | Dashboard: **status de esteira** (visita, projeto 3D, etc. — ver Q-6) | 🟡 LACUNA |

### Lote 6 — Pós-lançamento

| # | Item | Tag |
|---|---|---|
| 6.1 | Aba de orçamentos com **fluxo de aprovação** — explicitamente despriorizado pelo operador | ⚪ DEPOIS |
| 6.2 | **Prazo de entrega** volta a aparecer quando o orçamento é aprovado | ⚪ DEPOIS |
| 6.3 | Substituição do algoritmo de bin-packing, se 3.1 não resolver | ⚪ DEPOIS |

---

## 5. Contradições e lacunas encontradas no próprio feedback

### 5.1 Altura de perfil: briefing dizia perfil da organização, agora é por parede

O briefing V2 (seção 6.5) definiu que a altura das faixas vem do perfil do
marceneiro, e o Y do módulo é derivado dela. O feedback da Parte 1 estabelece que
a configuração é **por parede** — cada parede tem sua própria altura de rodapé,
de instalação inferior e de instalação aérea.

Não é contradição real, mas muda o modelo: o perfil da organização passa a ser
**default herdado**, e a parede tem override. Ver Q-1.

### 5.2 "Pé direito" está redundante

A altura da parede já é informada no cadastro da parede. O campo "pé direito" em
altura de perfil deve ser renomeado para o que ele realmente é: **o limite
superior de instalação dos módulos aéreos**.

### 5.3 Tamanho de rolo de fita apareceu com dois valores diferentes

Parte 3: branca em rolos de 50m e 300m. Parte 4: rolos de 20m, 100m e 300m.

**Resolve-se sozinho** se o tamanho do rolo for campo do catálogo (item 4.5) em
vez de constante no código. O cálculo de rolos (3.6) lê do cadastro. Nenhum valor
deve ser hardcoded.

### 5.4 Rotação de peças e veio da chapa são requisitos que se opõem

A Parte 3 pede duas coisas que puxam em direções contrárias:

- Peças devem ser **giradas** para aproveitar melhor a chapa (3.1)
- O **veio** da chapa deve ser respeitado e exibido (3.2)

Material com veio **não permite rotação**. Antes de trocar o algoritmo, separar
os dois casos:

1. O material do caso relatado (MDF Loro Freijó) **tem veio**? Se sim, parte da
   não-rotação é comportamento correto.
2. No exemplo específico — sarrafo de 7cm × 1,5m numa faixa livre de 30cm × 2,70m
   — **a peça cabe sem rotação nenhuma**. Isso é falha real de empacotamento,
   independente de veio.

> ⚠️ **Aviso ao operador:** quando o veio passar a ser respeitado de verdade, o
> aproveitamento das chapas madeiradas vai **piorar** em relação ao número atual.
> Isso é correção, não regressão. Saber disso antes evita concluir que algo
> quebrou.

### 5.5 Dois agrupamentos diferentes correm risco de virar um botão só

| | **Bloco físico** | **Agrupamento comercial** |
|---|---|---|
| Origem | Detectado por adjacência | Criado pelo usuário |
| Escopo | Mesma parede, **mesma faixa** | **Cruza faixas** |
| Serve para | Tampo, rodapé, tamponamento | Linha de proposta: uma imagem, um valor |
| Exemplo | 3 inferiores encostados | Aéreo + inferior + torre = "Cozinha" |

Se virarem o mesmo mecanismo, ou o tamponamento passa a se aplicar em módulo
aéreo, ou o agrupamento comercial fica preso dentro da faixa. Precisam coexistir
na mesma elevação com afordâncias visuais distintas. Ver Q-3.

### 5.6 Espessuras de tampo sugerem laminação, o briefing definiu outra coisa

O briefing V2 (7.2) definiu:

- **Engrossada**: sarrafo colado atrás da borda → peças extras + cola + fita na
  face aparente
- **Dobrada**: chapa usinada e dobrada a 45° → peça única maior + usinagem

A Parte 3 descreve as espessuras como camadas empilhadas ("30 = duas placas de 15
juntas"). Isso descreve o resultado visual, mas **não diz qual é o BOM**. As três
possibilidades consomem material muito diferente. Ver Q-4.

Nota adicional: **"simples"** é um terceiro modelo que não existia no briefing —
peça única, sem engrossamento. Precisa ser especificado junto.

### 5.7 O bug do valor por chapa pode ter causa em outro lugar

Chapas de 6mm com baixo aproveitamento não estavam sendo contadas no modo
"valor por chapa". Duas hipóteses com correções diferentes:

1. O cálculo filtra por aproveitamento mínimo (limiar em algum lugar do código)
2. Chapas de 6mm não estão classificadas na categoria "chapa" no catálogo

A regra decidida é clara — **tudo na categoria "chapa" conta como chapa,
independente de espessura ou aproveitamento** — mas a correção muda conforme a
hipótese. Verificar o dado antes de mexer no cálculo.

---

## 6. Perguntas que bloqueiam

### Bloqueiam o Lote 0

**Q-1 — Altura de perfil por parede herda default do perfil da organização?**
Se cada parede exigir configuração manual de rodapé, faixa inferior e faixa
aérea, um orçamento de 4 ambientes × 3 paredes vira 12 configurações repetitivas.
*Recomendação:* perfil da organização define o default; a parede sobrescreve
quando precisa, com indicação visual de "herdado" vs "customizado".

**Q-2 — No posicionamento relativo, o que acontece ao deletar um módulo do meio?**
Se M1 (800mm), M2 (a 0mm de M1) e M3 (a 50mm de M2) estão numa parede, e M2 é
deletado — M3 desliza para junto de M1, ou permanece onde está?
*Recomendação:* **armazenar posição absoluta, receber input como vão.** O
marceneiro digita o vão (conveniente), o sistema converte e guarda X absoluto
(estável). Deletar um módulo não move os outros. Se guardar o vão, toda a parede
cascateia a cada edição e fica imprevisível.

### Bloqueiam o Lote 2

**Q-3 — O agrupamento cross-faixa é comercial, físico, ou os dois?**
E ele pode cruzar **paredes** dentro do mesmo ambiente? Uma cozinha em L tem
módulos em duas paredes que viram uma linha só de proposta.
*Recomendação:* comercial, podendo cruzar faixas e paredes dentro de um ambiente;
o bloco físico continua automático, mesma faixa, mesma parede.

**Q-4 — Qual o BOM de cada modelo de tampo?**

| Modelo | Peça principal | Consumo adicional |
|---|---|---|
| Simples | Chapa na espessura escolhida | Fita nas bordas aparentes |
| Engrossado | ? | Sarrafo/tiras + cola + fita? |
| Dobrado | ? | Usinagem, sem peças extras? |

Sem isso, o custo do tampo sai errado nos três casos.

**Q-5 — Elemento de parede vira 6ª categoria do catálogo?**
A Parte 1 sugere que sim (*"esses elementos também podem estar dentro do meu
catálogo"*). Se entrar, os campos são nome + largura + altura, e o catálogo passa
a ter uma categoria que não é insumo — não tem preço, não entra no orçamento.
*Recomendação:* entra, mas com preço e status desabilitados para essa categoria.

### Não bloqueiam, mas mudam o esforço

**Q-6 — O status de esteira é campo manual ou workflow real?**
"Visita agendada", "projeto 3D", "aguardando aprovação" — o marceneiro seleciona
manualmente, ou o sistema transiciona sozinho conforme ações?
*Recomendação:* campo select manual com estados configuráveis. Custo baixo,
resolve a necessidade declarada (*"quero olhar a linha e ver em que parte do
processo o cliente está"*). Workflow automático é projeto próprio.

**Q-7 — Qual o corte mínimo real de lançamento?**
Os itens 🔴 somam um escopo grande. Vale marcar quais dos 🟡 ficam para a versão
seguinte e lançar antes, ou o produto precisa dos 87 itens para o primeiro
cliente pagante?

---

## 7. Contagem

| Categoria | Itens |
|---|---|
| 🔴 Bloqueadores de lançamento | 15 |
| 🟠 Bugs | 9 |
| 🟡 Lacunas funcionais | 41 |
| 🔵 UX / nomenclatura | 19 |
| ⚪ Pós-lançamento | 3 |
| **Total** | **87** |
