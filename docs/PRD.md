# PRD — orcamentofacil V2

> **Fase A (Discovery) — artefato 2 de 4.** Fonte de requisitos:
> `docs/00-briefing-v2-reorientacao_1.md`. Fonte do modelo:
> `docs/Modelo-de-Dominio.md`. Mapa de telas: `docs/Mapa-de-Telas.md`.
> `docs/archive/PRD-PIPELINE.md` é o PRD histórico da V1 e fica como
> referência — **este documento o substitui como PRD vigente.**
>
> **Fase D — Pré-Lançamento (2026-07-31).** Fonte de requisitos adicional:
> `docs/01-backlog-pre-lancamento.md` (4 walkthroughs do produto em produção
> com um marceneiro real, 87 itens consolidados) + adendos do operador sobre
> o **algoritmo de plano de corte** e sobre o **`ModuleViewer`**. As Seções 1–9
> continuam válidas; o que mudou está na **Seção 10**, nas decisões **D-27 a
> D-33** (Seção 7.3), na **Seção 6** (escopo, reescrita) e nos riscos 7–12
> (Seção 8). As decisões D-01 a D-26 seguem fechadas e não se reabrem aqui.
>
> **Revisão da mesma data (2026-07-31) — direção OR-Tools DESCARTADA.** O
> operador descartou a proposta de "plano de corte assíncrono com Google
> OR-Tools" (worker Python externo, fila, entidade `PlanoCorteJob`). Saíram
> deste documento o RF-34 antigo, a decisão D-32 e as perguntas **Q-8, Q-9,
> Q-10 e Q-11** — não são pendências, o assunto foi **encerrado**. Em seu
> lugar entrou a **melhoria do bin-packing 100% TypeScript em Web Worker**
> (RF-34, novo), modelada em `docs/Modelo-de-Dominio.md` Seções 8.1–8.6. Na
> mesma revisão entrou o **`ModuleViewer`** (RF-38, D-33).
>
> **Revisão de 2026-08-02 — cinco perguntas respondidas pelo operador.**
> **Q-6, Q-13, Q-14, Q-15 e Q-16** foram respondidas e já estão modeladas em
> `docs/Modelo-de-Dominio.md` (Seções 7.2, 7.3, 4.1.1 e 5.4.1). Elas saem de
> "pendentes" e passam a **resolvidas** na Seção 7.4. Duas consequências neste
> documento: (a) a frase "workflow automático é projeto próprio e fica fora em
> qualquer cenário" está **revogada** — a esteira é workflow automático real e
> entra no corte de lançamento (Seção 6 e RF-33); (b) o `ModuleViewer` deixa de
> lançar com cor sólida e passa a lançar com **textura real** (RF-38). Em
> aberto, e **novas**: **Q-17** e **Q-18** (Seção 7.4), as duas sobre
> **autorização por papel**.
>
> **Revisão de 2026-08-03 — Q-17 e Q-18 respondidas; não sobra pergunta viva.**
> Resposta do operador, **a mesma para as duas**: **só o papel `admin`/dono**.
> Quem exclui a organização inteira (Q-17) e quem reabre um orçamento congelado
> (Q-18) precisam ser `admin`. As duas já estão modeladas em
> `docs/Modelo-de-Dominio.md` — Seção 7.3 ("Quem pode disparar", erro
> `NAO_AUTORIZADO_EXCLUIR_ORG`/403) e Seção 5.4.1 (invariante **I6a**, erro
> `NAO_AUTORIZADO_REABRIR`/403) — e passam a **resolvidas** na Seção 7.4.
> **Nenhuma pergunta viva bloqueia o início da execução da Fase D.**
>
> **Ordem de leitura para quem chega agora:** Seções 1–5 (o produto),
> Seção 6 (o corte de lançamento vigente), Seção 10 (o que esta rodada
> acrescenta), Seção 7.4 (o que ainda não foi decidido).

---

## 1. Visão de produto

Um **painel de orçamento para marceneiros**: rápido, direto, sem exigir
modelagem 3D. O marceneiro entra, monta o orçamento do móvel que **realmente
será feito**, enxerga plano de corte, custos, lista de material (pré-pedido de
compra) e gera uma proposta bonita com a marca dele — tudo em telas separadas
e fluidas, não numa página única sobrecarregada.

> **"Sem exigir modelagem 3D" continua literal (D-33).** O `ModuleViewer`
> (RF-38) é uma **visualização derivada** das medidas que o marceneiro já
> digitou — ele nunca desenha, arrasta ou orbita nada. A frase acima descreve
> o **trabalho** exigido do usuário, não a técnica de renderização da tela.

**Isto é a V2 do produto**, não uma refatoração de tela. O sistema atual é um
teste de possibilidades em produção; falta o produto vendável. A V2:
- **Mantém** o núcleo do motor V3 (explosão de caixa → BOM, bin-packing/plano
  de corte, precificação; 96 testes).
- **Descarta** o motor V1 (templates de fórmula).
- **Estende** o motor: primitiva Placa, veio de chapa, Parede/Ambiente com
  validação, elementos contínuos unificados, modos de precificação, rateio de
  preço por linha.
- **Adiciona** persistência multi-tenant real (Supabase Auth + RLS).
- **Reconstrói** a experiência por cima, tela por tela.

---

## 2. Persona-alvo

**Marceneiro / lojista de marcenaria pequena (Brasil).** Dono que também
orça, ou com 1-3 pessoas (vendedor, projetista). Trabalha no desktop da loja.
Não usa SketchUp/CAD no dia a dia — quer orçar em minutos, não modelar. Lida
com dados financeiros sensíveis (preços de fornecedor, margens) — a proteção
de isolamento entre marcenarias é argumento de venda, não detalhe técnico.

Prioridade de dispositivo: **desktop** (densidade e produtividade); mobile/
tablet não podem quebrar, mas não são a experiência primária.

---

## 3. Jornada alvo (briefing Seção 3)

```
1.  Login → área pessoal configurada (marca, unidades, alturas padrão, modelo
    de precificação)
2.  Novo orçamento → dados do cliente
3.  Definir ambiente → paredes (altura × largura) + elementos da parede
    (janela, porta, tomada, ponto hidráulico) → feedback visual 2D
4.  Posicionar itens na parede: módulos (biblioteca própria/padrão) e placas
    avulsas → o sistema valida encaixe e detecta conjuntos adjacentes
5.  Aplicar elementos contínuos sobre os conjuntos (tampo, rodapé,
    tamponamento) — direto no layout da parede
6.  Acompanhar em paralelo: plano de corte + resumo financeiro (6 campos)
7.  Gerar orçamento → lista visual de material (pré-pedido), frete e montagem
    editáveis, adição manual de itens
8.  Orçamento fechado → lista de material congelada, extraível para o fornecedor
9.  Montar linhas comerciais → agrupar itens em linhas de proposta, com render
    automático e rateio de preço
10. Gerar proposta → PDF com a marca do marceneiro, sem custos internos, valor
    final à vista/parcelado
```

**Princípio de UX transversal:** configuração dirigida por capacidade
(`docs/Modelo-de-Dominio.md` Seção 4). Não se oferece porta/gaveta numa
prateleira ou painel ripado.

---

## 4. Requisitos funcionais (alto nível)

Legenda: **[E]** já existe (preservar) · **[P]** parcial · **[N]** novo

| RF | Descrição | Status |
|---|---|---|
| RF-01 | Autenticação multi-tenant (org + usuários) com isolamento no banco | [N] |
| RF-02 | Perfil da organização: marca/logo, **CNPJ, endereço, telefone** (saem na proposta), unidade, alturas padrão, modo de precificação e montagem padrão | [N] |
| RF-02b | Cadastro de cliente (nome, telefone, endereço) capturado na criação do orçamento + prazo de entrega, para pré-preencher a proposta | [N] |
| RF-03 | Catálogo de produtos editável (chapas, ferragens, LEDs, acessórios) — cópia no signup | [P] |
| RF-04 | Biblioteca de módulos por categoria — base global read-only + fork na edição | [P] |
| RF-05 | Editor de item dirigido por capacidade: módulo-caixa (carcaça+vãos+portas+gavetas) e placa | [P] |
| RF-06 | Primitiva Placa: espessura, material, orientação, borda por lado, ripado, e **engrossamento (placa + sarrafos, oca) vs dobra (placas laminadas, maciça)** com **seleção de quais lados engrossar** | [N] |
| RF-06b | **Fita de borda derivada da espessura final** da peça, pela regra "menor fita disponível ≥ espessura final" (15/18→22mm · 25/30→35mm · 36/45/54/60→65mm) — **tabela completa e canônica em `docs/Modelo-de-Dominio.md` Seção 2.1**; fitas são produtos distintos no catálogo | [N] |
| RF-07 | Ambiente com parede(s): dimensões + elementos de parede + posicionamento 1D com faixas | [N] |
| RF-08 | Validação de encaixe Tier 1 (cabe, não sobrepõe) + Tier 2 (faixas não colidem, respeita elementos de parede) | [N] |
| RF-09 | Detecção automática de conjuntos adjacentes + quebra/união manual (handle de junção na elevação) | [N] |
| RF-10 | Elementos contínuos unificados — **tampo · rodapé · tamponamento (4 posições) · fechamento** — com dimensão derivada (editável em rodapé/fechamento) | [N] |
| RF-11 | Motor de BOM + plano de corte com restrição de veio, **sentido do veio por peça visível e alterável** (default nos módulos-caixa) | [P] |
| RF-12 | Precificação: 4 modos (um no 1º corte) + resumo de 6 campos | [P] |
| RF-13 | Rateio de preço por custo alocado, segregado por material, com congelamento | [N] |
| RF-14 | Frete (proporcional) e montagem (3 modos, rateio acompanha base), diluídos na proposta | [N] |
| RF-15 | Lista de material (pré-pedido) editável + adição manual + congelamento + extração texto/CSV | [P] |
| RF-16 | Linha de Proposta: agrupamento comercial, render automático de conjunto, override manual com rebalanceamento | [N] |
| RF-17 | Proposta em PDF: marca + **CNPJ/endereço/telefone** do emitente, **dados do cliente**, **ambientes orçados** com imagem e valor, **prazo de entrega**, sem custos internos, à vista/parcelado (texto livre) | [P] |
| RF-18 | Persistência real de todo o estado (orçamento, ambiente, itens, linhas) por tenant | [N] |

> **Emendados na Fase D (Seção 10.2):** RF-02, RF-03, RF-04, RF-05, RF-07,
> RF-08, RF-11, RF-13, RF-15, RF-16, RF-17, RF-18. Os requisitos novos desta
> rodada são **RF-19 a RF-38** (Seção 10.3). Nenhum RF de 01 a 18 foi
> revogado — todos foram estendidos ou tiveram critério de aceite endurecido.

---

## 5. Critérios de sucesso

- Um marceneiro consegue, sem treinamento, ir de "novo orçamento" a "PDF da
  proposta" em poucos minutos, orçando o móvel real.
- O valor que o cliente vê na proposta é auditável e reproduzível (rateio por
  custo alocado, não por ocupação de corte).
- Isolamento entre marcenarias garantido no banco (teste de isolamento por
  tabela passa).
- Nada se perde num reload (persistência real).
- O motor de cálculo (BOM, corte, preço) permanece coberto por testes ≥ o
  nível atual (96), acrescido dos testes das features novas.

---

## 6. Escopo negativo — corte de lançamento

> **Reescrita na Fase D (D-30, Q-7 do backlog pré-lançamento).** O recorte
> original vinha do briefing V2 Seção 9 e assumia "uma parede por ambiente,
> validação Tier 1". Quando a Q-7 perguntou qual é o corte mínimo real de
> lançamento, o operador **decidiu aceitar o escopo já crescido**: o produto em
> produção passou do recorte antigo, e voltar atrás custaria mais do que
> terminar. O texto abaixo substitui o da Fase A. O que saiu de "fora" e
> entrou em "dentro" está marcado com **[D-30]**.

**Dentro do corte de lançamento:**

- Auth multi-tenant + perfil da organização com marca — **logo por upload**
  (não mais URL), CNPJ/endereço/telefone com máscara.
- Conta e segurança: troca de senha com confirmação por e-mail, exclusão de
  conta, área de segurança no perfil.
- Catálogo de produtos editável, **unificado** (card único, categoria interna,
  campos dinâmicos, código universal).
- Biblioteca de módulos por categoria: base global read-only, **fork** e
  **criação do zero** por usuário da organização (D-31).
- Primitiva Placa (engrossamento/dobra por nível, ripado, borda por lado).
- **N ambientes por orçamento e N paredes por ambiente** — **[D-30]**, com
  nome livre de parede e indicação permanente de o que está em edição.
- **Validação Tier 1 + Tier 2** — **[D-30]** (encaixe, faixas, elementos de
  parede).
- Elementos de parede incluindo **pedra**, com referência de medida escolhível
  e preset por organização fora do catálogo (D-29).
- Alturas de faixa com default no perfil e **override por parede** (D-27).
- Posicionamento 1D por faixas, **entrada em vão até o vizinho** (D-28).
- Elementos contínuos (tampo/rodapé/tamponamento/fechamento), tampo com os
  **três modelos** e espessuras condicionadas ao modelo.
- Plano de corte com veio respeitado, **fita discriminada por cor**, rolos a
  comprar a partir do catálogo e contagem de cortes.
- Resumo financeiro de 6 campos com **um** modo de precificação.
- Lista de material com **congelamento real** (snapshot persistido).
- Linhas de proposta com rateio, override manual com rebalanceamento,
  subdivisão dentro do ambiente e **reversão da divisão**.
- PDF da proposta com a marca do marceneiro.
- **Bin-packing melhorado** (RF-34): guilhotina com retângulos livres +
  meta-heurística, **kerf** (espessura de serra) como parâmetro do perfil,
  rodando em **Web Worker do navegador**. Escopo ativo e **sem bloqueio** —
  não depende de decisão pendente nenhuma.
- **`ModuleViewer`** (RF-38): visualização 3D **estática e não-interativa** do
  módulo em edição. Escopo ativo; lança **com textura real** de padrão de MDF
  (Q-14 respondida em 2026-08-02 — Modelo 4.1.1). As ~380 imagens são
  **pré-requisito de conteúdo do operador**, não trabalho do executor; sem
  elas o campo fica vazio e a tela cai no fallback de cor sólida.
- **Etapa de esteira** (RF-33): **workflow automático real** — enum
  `etapaEsteira` (`novo` · `visita_agendada` · `projeto_3d` ·
  `aguardando_aprovacao` · `fechado`), ortogonal ao `status` comercial, com
  transições disparadas por ação do produto ("gerar proposta", "reabrir") e
  **duas etapas sem gatilho** (`visita_agendada`, `projeto_3d`), movidas à mão
  porque não existe ação no produto que as signifique. Badges "Em andamento" e
  "Fechado" são **derivados** de `etapaEsteira`, não status novo (Q-15).
  Modelo 7.2.
- **Congelar e reabrir orçamento** (RF-22): `congeladoEm` como carimbo de
  tempo e a ação **Reabrir**, que zera o carimbo, preserva `valorRateado` e
  devolve a etapa de `fechado` para `aguardando_aprovacao` (Modelo 5.4.1, I6).
  A **condição de autorização** está fechada (Q-18, 2026-08-03): **só o papel
  `admin`/dono** reabre — checagem de aplicação dentro da própria ação, antes
  de qualquer escrita (Modelo 5.4.1, **I6a**).

**Fora do corte de lançamento:**

- Planta baixa L/U/quadrado (o posicionamento continua 1D por parede; ter N
  paredes não é ter planta).
- **3D interativo, órbita livre e qualquer forma de modelagem 3D.** O canvas
  técnico (`BoxCanvas`, `ElevacaoParede`, `PlanoCorteCanvas`) continua 2D —
  não nesta fase, e sim como política (D-33). O `ModuleViewer` é exceção
  estreita: câmera fixa, sem controles, derivado do mesmo `BoxModule`.
- **Plano de corte assíncrono, solver externo, fila e worker fora da Vercel.**
  Direção descartada pelo operador em 2026-07-31 — não é adiamento, é
  encerramento. A melhoria de algoritmo acontece em TypeScript, síncrona, no
  navegador.
- **Validação Tier 3** (continua fora — não foi incluída em nenhuma decisão
  desta rodada).
- Os outros 3 modos de precificação (D-04 mantém um).
- Versionamento de orçamento (D-12).
- Cobrança automatizada (D-18: faturar manual no início).
- Rastreio de "sobra aproveitável".
- Fluxo de aprovação de orçamento e reexibição de prazo de entrega após
  aprovação (Lote 6 do backlog pré-lançamento, despriorizado pelo operador).
- **Etapas de esteira de produção/instalação/medição.** A esteira **entrou**
  no corte de lançamento (Q-6 respondida — ver acima), mas só com as 5 etapas
  do enum. Nenhuma etapa de chão de fábrica foi pedida, e acrescentar depois é
  aditivo — a máquina é por posição, não por contagem (Modelo 7.2).
- **Gestão de membros da organização** (convite, papéis operantes, remoção).
  Hoje toda org tem exatamente um usuário, criado como `admin` pela trigger de
  signup. `perfil.papel` existe no schema e, até 2026-08-02, **nenhuma regra do
  produto o usava** — era justamente por isso que Q-17 e Q-18 não podiam ser
  deduzidas. Com as duas respondidas (Seção 7.4), `perfil.papel` passa a ser
  lido por **exatamente duas checagens de aplicação** — excluir a organização
  (Modelo 7.3) e Reabrir (Modelo 5.4.1, I6a). Isso **não** traz convite, papéis
  operantes nem remoção para dentro do corte: as duas regras são escritas por
  papel e continuam valendo sem alteração no dia em que a gestão de membros
  existir.

> Nota que continua valendo: "um modo de precificação" é recorte de UI, não de
> modelo — o domínio já é desenhado para os 4 modos, para não haver migração ao
> expandir. O que **deixou** de ser recorte é a cardinalidade de ambiente/
> parede: o modelo de domínio (Seção 3.2) não tem mais limite, e a UI também
> não deve ter.

---

## 7. Decisões resolvidas

### 7.1 Fechadas no briefing (não reabrir)

| # | Decisão | Resultado |
|---|---|---|
| D-01 | SaaS multi-usuário? | Sim |
| D-02 | Imagem: upload ou render? | Render automático + agrupamento comercial |
| D-03 | Parede valida? | Sim; tamponamento é elemento de bloco na parede |
| D-13 | Tenant = Usuário ou Organização? | Organização |
| D-14 | Supabase Auth + RLS ou Prisma? | Supabase; Prisma sai do projeto |
| D-17 | Linha de proposta = ambiente? | Sim |
| D-19 | Nível de validação da parede? | Tier 1 + 2 |
| D-20 | Posicionamento 1D ou 2D livre? | 1D com faixas |
| D-22 | Base da contagem de chapa | N inteiro do plano de corte |
| D-23 | Frete: igual ou proporcional? | Proporcional ao custo alocado |
| D-24 | Montagem: como calcular/ratear? | 3 modos exclusivos; rateio acompanha a base do cálculo |
| D-25 | Frete/montagem visíveis ou diluídos? | Diluídos por ambiente |
| D-26 | m² para montagem? | Não se aplica — m² removido do produto |

### 7.2 Confirmadas nesta Fase A (recomendação do briefing assumida)

O briefing (Seção 10, "Confirmar") já deu recomendação para cada uma. Como
Solution Architect, assumo a recomendação e registro aqui. Nenhuma exigiu
devolver ao operador — todas são coerentes com o modelo de domínio.

| # | Decisão | Resolução assumida |
|---|---|---|
| D-04 | Quantos modos de precificação na V2? | **Um** no primeiro corte (arquitetura suporta 4) |
| D-05 | Unidade mm/cm global ou por campo? | **Global** no perfil |
| D-06 | Ripado: quantidade→espaçamento ou inverso? | **Quantidade → espaçamento derivado** |
| D-07 | Montagem é custo mesmo quando o próprio marceneiro executa? | **Sim, custo** |
| D-08 | Lista para fornecedor: formato por fornecedor ou texto/CSV? | **Texto/CSV copiável** |
| D-09 | Parcelamento: texto livre ou cálculo com juros? | **Texto livre** na V2 |
| D-10 | Quem cria os módulos padrão e em que volume? | Principal custo de conteúdo — **planejar à parte** (não bloqueia PRD; ver risco na Seção 8) |
| D-12 | Versionamento de orçamento entra agora? | **Não** |
| D-15 | Catálogo: cópia no signup ou base global? | **Produtos = cópia; Módulos = base global + fork** |
| D-18 | Cobrança automatizada entra quando? | **Depois** do primeiro corte; faturar manual |

Não há decisão bloqueante em aberto para iniciar a Fase B.

### 7.3 Fechadas na Fase D — Pré-Lançamento (2026-07-31)

Origem: perguntas Q-1, Q-2, Q-5, Q-7 e D-10 do
`docs/01-backlog-pre-lancamento.md`, respondidas pelo operador, mais os dois
adendos do mesmo dia — **algoritmo de plano de corte** e **`ModuleViewer`**.
Todas já estão modeladas em `docs/Modelo-de-Dominio.md` — a coluna "Onde vive"
é o endereço canônico, e o modelo prevalece sobre qualquer paráfrase deste PRD.

| # | Decisão | Resolução | Onde vive |
|---|---|---|---|
| D-27 | Altura das faixas é do perfil da organização ou da parede? (Q-1) | **Das duas, em cascata.** O perfil define o default; a **parede sobrescreve campo a campo**, com estado "herdado" vs "customizado" **derivado** (nunca flag persistido). "Voltar ao herdado" apaga o campo, não copia o valor. Mudar o perfil propaga retroativamente para quem não sobrescreveu. **Salvar uma parede nunca escreve em `organizacao.alturas_padrao`** | Modelo 3.2.1 |
| D-28 | Posicionamento relativo: o que se guarda? (Q-2) | **Entrada em vão, armazenamento em X absoluto.** O marceneiro digita o vão até o vizinho de um dos lados; o sistema converte e persiste `x` absoluto; a exibição reconverte para vão dos dois lados. **Apagar um módulo do meio não move ninguém** — muda só o vão exibido. `refEntrada` é preferência de leitura, ignorá-la nunca altera geometria | Modelo 3.1.1 |
| D-29 | Elemento de parede vira 6ª categoria do catálogo? (Q-5) | **Não. Recomendação do backlog-fonte REJEITADA** (ela propunha a categoria com preço/status desabilitados). Elemento de parede recorrente vira `ElementoParedePreset`, entidade leve por organização, **fora do catálogo de produtos**: só `nome` obrigatório (+ largura/altura de prefill), **sem preço, sem status, sem tipo/categoria**, sem vínculo vivo — aplicar copia, editar o preset não retroage | Modelo 3.2.3 |
| D-30 | Qual o corte mínimo real de lançamento? (Q-7) | **Aceitar o escopo já crescido.** "Múltiplas paredes por ambiente" e "validação Tier 2" saem de *fora do primeiro corte* e entram no **corte de lançamento**. Tier 3 continua fora. O recorte da Fase A (briefing Seção 9) está **superado** — Seção 6 deste PRD é a versão vigente | PRD 6 · Modelo 3.2 |
| D-31 | Como nasce um módulo, e quem publica módulo global? (D-10 estendido) | **Três caminhos de criação, um de promoção.** Semente global (operador) · fork de um global (usuário da org) · **criação do zero pelo usuário da org**, privada à organização. **Promoção org → global é exclusiva do operador**, por **cópia** (nunca reparent), fora do alcance da app; a linha da org permanece intacta e editável pelo dono. Não existe botão "promover" para o marceneiro, e nada é promovido automaticamente | Modelo 7.1 |
| ~~D-32~~ | ~~O bin-packing troca de algoritmo via Google OR-Tools assíncrono?~~ | **REVOGADA em 2026-07-31, no mesmo dia em que foi registrada.** O operador descartou a direção OR-Tools / worker Python / fila / `PlanoCorteJob`. Não há decisão pendente aqui e não há o que reabrir: a substituição do algoritmo **acontece**, mas em TypeScript síncrono no navegador (ver a linha "Substituição do algoritmo de bin-packing" na tabela abaixo e o RF-34 novo). Número aposentado — não reutilizar | — |
| D-33 | O produto pode ter 3D? (adendo do operador) | **Exceção pontual, não reversão de política.** O operador reabriu **pessoalmente** a decisão "sem 3D" **só** para um visualizador **estático e não-interativo** do módulo em edição (`ModuleViewer`, RF-38): câmera ortográfica fixa, sem órbita, sem controles de usuário, derivado da mesma geometria do `BoxModule` que o canvas 2D já consome. **O canvas técnico continua 2D para sempre** (`BoxCanvas`, `ElevacaoParede`, `PlanoCorteCanvas`), e a filosofia da Seção 1 — "orçar **sem exigir modelagem 3D**" — **não muda**: o marceneiro continua não modelando nada em 3D; o `ModuleViewer` é visualização derivada, nunca ferramenta de modelagem. Qualquer pedido futuro de órbita, edição ou modelagem em 3D reabre esta decisão do zero | Modelo 4.1 · STATUS |

**Resoluções desta rodada que já vivem no Modelo de Domínio — citadas, não
reabertas** (nenhuma recebe número D próprio; o endereço canônico é o modelo):

| Assunto | Situação |
|---|---|
| **Q-3** — agrupamento cross-faixa é comercial, físico, ou os dois? | Resolvida: **os dois coexistem**. `Conjunto` continua **físico** (mesma parede, mesma faixa, adjacência automática, base de tampo/rodapé/tamponamento); `LinhaProposta` é o agrupamento **comercial**, criado pelo usuário, podendo cruzar faixas **e paredes** dentro do ambiente. Nunca colapsar num botão só — Modelo 3.3 e 6 |
| **Q-4** — qual o BOM de cada modelo de tampo? | Resolvida: tampo tem **três** modelos (`simples` · `engrossado` · `dobrado`); a escolha é **modelo antes da espessura**; espessuras válidas por modelo (simples 15/18/25 · engrossado/dobrado 30/45/60 base 15 e 36/54 base 18); **6 mm nunca**; BOM do `simples` fechado com exemplo trabalhado — Modelo 2.1 e 3.4.1 |
| Item 5.2 — "pé direito" redundante | Resolvido: `Parede.altura` é a altura física; `peDireito` é o **limite superior de instalação do aéreo**. Não são o mesmo campo, e o rótulo de UI precisa dizer isso — Modelo 3.2.1 |
| Item 5.3 — rolo de fita apareceu com tamanhos diferentes | Resolvido por construção: **tamanho do rolo é campo do catálogo**, nunca constante no código; o cálculo de rolos lê do cadastro — Modelo 11.5. Cadastrar os tamanhos reais é tarefa de dados do operador, não decisão de produto |
| **Substituição do algoritmo de bin-packing** (adendo do operador, substitui a D-32 revogada) | Resolvida: **guilhotina com lista de retângulos livres + meta-heurística (simulated annealing ou algoritmo genético, escolha do motor-engineer)**, **100% TypeScript**, executada num **Web Worker do navegador**. **Kerf** (espessura de serra) vira parâmetro, com campo `espessuraSerraPadraoMm` no perfil da organização (default **3 mm**, editável, `0` válido). **Zero infraestrutura nova**: sem worker externo, sem fila, sem tabela, sem entidade, sem RLS nova. Fecha juntos os itens **3.1** (bug de aproveitamento) e **3.3** (troca de algoritmo) do backlog pré-lançamento — Modelo 8.1–8.6. Detalhe do requisito: **RF-34** (Seção 10.3) |
| Item 5.4 — rotação de peças × veio da chapa | Resolvido no modelo: **bin-packing só rotaciona quando `!temVeio`** — Modelo 8, invariante V3. A restrição **não muda** com o algoritmo novo: ele não passa a girar peça com veio para ganhar aproveitamento nem restringe peça sem veio. A falha de empacotamento relatada (item 3.1) é corrigida pelo RF-34 — Modelo 8.3 e 8.6 |
| Item 5.7 — chapa de 6 mm não contada | Regra fechada: **tudo na categoria "chapa" conta como chapa**, sem limiar de aproveitamento em lugar nenhum (Modelo 5.2). A causa (filtro no cálculo × classificação errada no catálogo) precisa ser **verificada no dado antes** de mexer no código — é critério de investigação, não decisão em aberto |

### 7.4 Decisões pendentes — não decidir por conta própria

#### Respondidas pelo operador em 2026-08-02 — fechadas, não reabrir

As cinco estão **modeladas** em `docs/Modelo-de-Dominio.md`; a coluna "Onde
vive" é o endereço canônico e o modelo prevalece sobre a paráfrase abaixo.

| # | Pergunta | Resolução | Onde vive |
|---|---|---|---|
| **Q-6** | Status de esteira é **campo select manual** ou **workflow real** com transições automáticas? | **Workflow real.** Enum `etapaEsteira` de 5 etapas (`novo` · `visita_agendada` · `projeto_3d` · `aguardando_aprovacao` · `fechado`), **ortogonal** ao `status` comercial — nunca colapsar os dois eixos. Transições T1–T3: movimento livre entre não-terminais; `fechado` só se sai por **Reabrir**; nenhuma transição implícita. Gatilhos automáticos amarrados a ações que **existem** no produto ("gerar proposta" → `aguardando_aprovacao`, no mesmo ato que congela; "reabrir" → volta de `fechado`). **`visita_agendada` e `projeto_3d` não têm gatilho** e são movidas à mão — não há ação no produto que as signifique, e inventar uma seria inventar produto. `novo` e `fechado` são **proposta técnica** do data-architect, marcadas como tal | Modelo 7.2 |
| **Q-13** | **Excluir conta** (item 4.15) apaga o **usuário** ou a **organização inteira**? Cascata, anonimização ou retenção por prazo? | **A organização inteira, por cascata.** Sem exclusão lógica, sem anonimização, sem prazo de retenção — destruição imediata e irreversível, com confirmação explícita obrigatória. Apagar a linha de `organizacao` **é** o mecanismo (toda tabela de tenant já é `on delete cascade`); gabaritos globais sobrevivem. A rotina precisa, além do cascade: ler os perfis **antes**, apagar os usuários de `auth.users` **depois**, e expurgar o Storage por prefixo (não há FK ali). **`orcamento.cliente_id ... on delete restrict` aborta a cascata** e precisa virar `no action` — sem isso a exclusão passa em teste com org vazia e falha em produção. **Quem pode disparar → Q-17, respondida em 2026-08-03: só o papel `admin`/dono** (checagem de aplicação na Server Action, erro `NAO_AUTORIZADO_EXCLUIR_ORG`/403 — Modelo 7.3) | Modelo 7.3 · Q-17 respondida em 2026-08-03: **só `admin`/dono** |
| **Q-14** | O `ModuleViewer` lança **só com cor sólida**, ou o catálogo mapeia **textura real** de madeira por padrão de MDF? | **Textura real.** A recomendação técnica do data-architect (lançar com cor sólida) foi **rejeitada** pelo operador. `texturaUrl` vira campo opcional dentro do jsonb `especificacao` do `Produto` tipo `chapa` — **campo, não tabela** (cardinalidade 1–1, sem atributos próprios). Caminho relativo dentro do bucket de texturas, **nunca URL externa**; bucket read-only, uma cópia compartilhada por todas as orgs; ausente ⇒ fallback na cor sólida já existente; nada de textura é persistido no item, e nem BOM, nem plano de corte, nem preço a enxergam. **As ~380 imagens são pré-requisito de conteúdo do operador**, não trabalho do executor — mesma natureza da nota de `docs/STATUS.md` sobre os padrões de MDF | Modelo 4.1.1 |
| **Q-15** | Os badges "Em andamento" e "Fechado" da Design-System §2.5 são **valores novos de status**? | **Não — são rótulos derivados da esteira.** Nenhum campo de status novo nasce daqui. Um badge por card, por precedência determinística: `fechado` ⇒ "Fechado"; qualquer etapa intermediária ⇒ "Em andamento"; `novo` ⇒ o card mostra o rótulo do `status` comercial. Com isso os 5 badges reservados passam a ter origem — 3 vêm de `status`, 2 vêm de `etapaEsteira` | Modelo 7.2 (Q-15) |
| **Q-16** | O que acontece ao editar um orçamento depois de congelado? | **Avisa em vez de bloquear em silêncio** (W-C1), e **existe a ação "Reabrir"**: `congeladoEm ← null` (a leitura volta a ser recalculada), o `valorRateado` das linhas é **preservado, nunca zerado** — é a mesma coluna do override manual do usuário, e zerá-la destruiria trabalho que nada tem a ver com congelamento —, e a etapa de esteira volta de `fechado` para `aguardando_aprovacao`. Invariante **I6**. **Quem pode reabrir → Q-18, respondida em 2026-08-03: só o papel `admin`/dono** (invariante **I6a**, erro `NAO_AUTORIZADO_REABRIR`/403) | Modelo 5.4.1 (I6 · I6a) |

#### Respondidas pelo operador em 2026-08-03 — fechadas, não reabrir

As duas nasceram das respostas de 2026-08-02 e eram a **mesma classe de
pergunta**: autorização por papel. O modelo de papéis (`perfil.papel`:
`admin`/`vendedor`/`projetista`) **existia no schema sem nenhuma política de
RLS ou regra de produto que o usasse** — não havia como deduzir a resposta a
partir do que estava construído, e por isso ambas foram devolvidas ao operador
em vez de assumidas. **Resposta do operador, idêntica para as duas: só o papel
`admin`/dono.** As duas já estão modeladas; a coluna "Onde vive" é o endereço
canônico e o modelo prevalece sobre a paráfrase abaixo.

| # | Pergunta | Resolução | Onde vive |
|---|---|---|---|
| **Q-17** | **Quem pode disparar a exclusão da organização inteira** (Task 4.15 / RF-31)? Qualquer usuário da org, ou só o papel `admin`/dono? | **Só o papel `admin`/dono.** `vendedor` e `projetista` não podem apagar a organização. A checagem é **de aplicação**, dentro da própria Server Action / RPC, e é a **primeira** operação do fluxo — antes da leitura dos perfis e de qualquer `delete`; rejeição explícita com `NAO_AUTORIZADO_EXCLUIR_ORG`, HTTP 403 quando exposta por rota. Continua **não existindo política de `delete` em `organizacao` para `authenticated`** — criá-la contradiria esta resposta, porque abriria um caminho paralelo por PostgREST que não passa pela checagem de papel. O que estava travado era **só a porta de entrada**; o cascade sempre esteve especificado por inteiro e **não muda**. O que a resposta evita: um `vendedor` clicando "excluir conta" e apagando o tenant inteiro, com os orçamentos e clientes de todos os colegas | Modelo 7.3, "Quem pode disparar (Q-17)" · erro **E-D1** |
| **Q-18** | **Quem pode reabrir um orçamento congelado?** Qualquer usuário da org, ou só um papel específico? | **Só o papel `admin`/dono.** Invariante **I6a**: a ação Reabrir só executa com `perfil.papel === 'admin'` na organização dona do orçamento, checado na aplicação **antes de qualquer escrita**; não-admin é rejeitado com `NAO_AUTORIZADO_REABRIR`, HTTP 403 por rota, sem degradar para no-op silencioso (`congeladoEm`, `valorRateado` e `etapaEsteira` ficam intactos). A checagem de papel vem **antes** da de idempotência, para que um `vendedor` não descubra por resposta `ok: true` que o orçamento já estava reaberto. O mecanismo (I6) sempre esteve modelado por inteiro e **não muda**. Por que não se deduzia: Reabrir tem **efeito comercial** — o valor que o cliente recebeu deixa de ser o vigente | Modelo 5.4.1, **I6a** · erro **E-C3** |

> **Nota de contexto que continua valendo:** hoje **toda organização tem
> exatamente um usuário**, criado como `admin` no signup — não existe convite
> nem gestão de membros (Seção 6, "fora do corte"). Na prática o dono é o único
> que consegue disparar as duas ações. As regras foram escritas **por papel**,
> não por "único usuário existente hoje", então valem sem alteração no dia em
> que o convite existir — que é justamente quando as duas ambiguidades se
> materializariam, e ambas as ações são destrutivas o bastante para não
> nascerem com a regra errada.

> **Extintas em 2026-07-31 — não são pendências, não reabrir:** ~~Q-8~~
> (onde roda o worker Python), ~~Q-9~~ (mecanismo de fila), ~~Q-10~~ (limiar de
> disparo assíncrono) e ~~Q-11~~ (corte guilhotinado é obrigatório?). As três
> primeiras perderam objeto junto com o worker externo; a Q-11 deixou de ser
> pergunta e virou **invariante do domínio** — todo plano de corte é
> guilhotinável, sempre, por qualquer algoritmo (Modelo 8.1, invariante V5).
>
> **~~Q-12~~ — sem objeto.** Ela perguntava se o bug de empacotamento (item
> 3.1) devia ser corrigido agora ou se valia esperar a troca de motor. Com o
> solver externo descartado e a **troca de algoritmo sendo ela própria a
> correção**, não há mais nada a esperar: os itens 3.1 e 3.3 são a mesma
> entrega, dentro do RF-34 — `docs/Modelo-de-Dominio.md` Seção 8.6.

> **Nenhuma pergunta viva bloqueia o início da execução da Fase D.** **Q-1 a
> Q-5 e Q-7** fecharam em 2026-07-31 (7.3); **Q-6, Q-13, Q-14, Q-15 e Q-16**
> fecharam em 2026-08-02; **Q-17 e Q-18** — as duas últimas, e as únicas que
> ainda travavam alguma coisa — fecharam em **2026-08-03**, ambas com a mesma
> resposta: **só `admin`/dono**. As duas condições de autorização que estavam
> em suspenso (exclusão da organização · reabertura de orçamento) passam a ter
> regra escrita, e o mecanismo de ambas já estava modelado por inteiro. Não
> resta pendência bloqueando lote, task ou RF nenhum — o **Lote 3 (plano de
> corte)**, que já era o único sem bloqueio, deixa de ser exceção.

---

## 8. Riscos e pontos de atenção (não estimativa — sinalização)

1. **Migração Prisma → Supabase (D-14).** Maior mudança de infraestrutura do
   plano: sai schema, seed, rotas de auth/clientes/orçamentos. Peso de tarefa
   própria, não swap de biblioteca.
2. **Rateio de custo (RF-13).** Matematicamente fechado no briefing (exemplo
   numérico verificado), mas é dinheiro exibido ao cliente — exige testes de
   arredondamento (soma das linhas == total) e de congelamento no fechamento.
3. **Render de conjunto no canvas (RF-16).** `BoxCanvas.geometria` hoje
   renderiza um item por vez. A mudança de assinatura para lista de itens
   posicionados vem **antes** de qualquer tela que dependa dela.
4. **RLS multi-tenant.** Teste de isolamento por tabela é critério de aceitação
   obrigatório, não follow-up.
5. **Conteúdo dos módulos padrão (D-10).** Não é engenharia — é curadoria de
   catálogo. Custo real de conteúdo do produto; planejar quem cria e em que
   volume antes do lançamento.
6. **Veio de chapa (RF-11).** Ao restringir a rotação, o aproveitamento do
   plano de corte vai piorar (ficar correto). Avisar o operador antes de o
   número mudar, para não parecer regressão.

### Riscos acrescentados na Fase D (2026-07-31)

7. **Retrofit do estado de ambiente/parede — gap de wiring, não de schema.**
   O banco e os tipos já suportam `Orçamento 1—N Ambiente 1—N Parede 1—N
   ItemPosicionado`, mas a **camada de estado da aplicação** está presa a "1
   ambiente, 1 parede": `lib/ambiente/estado.ts`, `lib/ambiente/salvar.ts` e
   `lib/ambiente/mapear.ts` operam sobre um singleton. Não há migração de
   dados a fazer, mas há **retrabalho real de estado e de UI** — seletor de
   ambiente, seletor de parede, indicação do que está em edição, e todo
   componente que hoje assume "a parede". Subestimar isso como "só ligar o
   que já existe" é o erro previsível desta rodada.
8. **Salvar ambiente sobrescreve o perfil da organização inteira.** Achado
   colateral do Data Architect: hoje o fluxo de Ambientes grava as 4 alturas
   em `organizacao.alturas_padrao` (`lib/ambiente/salvar.ts`) — ajustar uma
   parede reescreve o padrão da marcenaria toda. Isso **conflita frontalmente
   com D-27**: se o override por parede nascer por cima desse comportamento,
   o resultado é pior que hoje (o usuário customiza uma parede e vê as outras
   mudarem). A correção não é follow-up: entra **junto** com o override, e
   "perfil só muda em `/perfil`" é invariante de aceite.
9. **"Especificado" nunca significou "implementado".** O congelamento da
    proposta está no PRD desde a Fase A (RF-13, D-12, Modelo 5.4) e **nunca
    foi construído** — a proposta segue recalculando do estado vivo, e o
    marceneiro viu o valor mudar só de navegar entre abas. O risco não é o
    bug: é o processo que deixou um bloqueador comercial passar por
    "documentado". Para RF-22, o aceite é **teste automatizado de que a
    proposta lê do snapshot** e de que soma das linhas == preço final — não
    conferência visual.
10. **Escopo aceito por inteiro (D-30) sem corte de lançamento menor.** Os 87
    itens do backlog pré-lançamento passam a ser o caminho até o primeiro
    cliente pagante. Mitigação já embutida no material de origem: os Lotes 3,
    4 e 5 são independentes entre si e do Lote 0, e o Lote 5 (limpeza visual)
    pode ser puxado para frente sem bloquear nada — é o que transforma a
    percepção de "teste de possibilidades" em "produto". Sequenciar isso é do
    `backlog-planner`, não deste PRD.
11. **Dados sensíveis de cliente final entram em dois lugares novos.** Logo
    por upload (Storage) e exclusão de conta (Q-13 respondida: apaga a
    **organização inteira**, irreversível). Cada um exige RLS/política de
    bucket própria e teste de isolamento por tenant, no mesmo padrão já
    estabelecido — critério de aceitação, não follow-up. A exclusão é a única
    operação destrutiva multi-tabela do produto e a única que toca
    `auth.users` e Storage: **revisão do `security-auditor` antes do merge é
    pré-requisito**. A **Q-17** deixou de bloquear a ação (respondida em
    2026-08-03: só `admin`/dono), mas a checagem de papel na Server Action
    passa a ser item obrigatório dessa revisão, junto com a ausência
    deliberada de política de `delete` em `organizacao` (Modelo 7.3).
    (O terceiro lugar da versão anterior deste risco era o payload do
    `PlanoCorteJob`; ele **deixou de existir** — o plano de corte melhorado
    roda no navegador do próprio usuário e **não persiste nada**.)
12. **O preço vai subir quando o kerf entrar (RF-34), e isso é correção.**
    O plano de corte de hoje encosta peça em peça, como se a serra não
    consumisse material. Com kerf de 3 mm, a mesma lista de peças pode exigir
    **mais chapas** — e `N(M)` entra no custo (Modelo 5.2), então o orçamento
    do mesmo móvel sobe. Subir por estar certo é o comportamento desejado;
    subir em silêncio, não. O operador precisa ver a troca **na primeira vez
    que configurar o kerf**, e a comunicação disso é requisito, não cortesia
    — mesma natureza do aviso do risco 6 (veio). Contrapeso na mesma entrega:
    a meta-heurística **nunca piora** o resultado com os mesmos parâmetros
    (invariante V6), então parte do aumento é reabsorvida.

---

## 9. Relação com o trabalho já feito nesta sessão

Já mesclado e reaproveitável na V2 (ver `docs/Backlog.md` para o detalhe):
- **Segurança (Stage 1) + ESLint (2.1)**: mantidos — valem para qualquer
  código. (Nota: `/api/calcular` e `seed-qa-user.ts` mudam de forma na
  migração Supabase, mas os princípios de segurança seguem.)
- **Fundação Tailwind + shadcn/ui (Stage 5)**: base de UI da Fase C.
- **Laboratório `/modulo` (Tasks 7.1/7.2)**: base direta do Editor de Item.
- **Design System (`docs/Design-System.md`)**: contrato visual, segue valendo.

Parcialmente supersequido pela nova IA (a decompor na Fase C):
- **Stage 6 (Produção sobre `app/page.tsx`)** e o wizard de templates: a página
  única é decomposta nas telas do `docs/Mapa-de-Telas.md`; os componentes/
  padrões (Button, Stepper, KPI, tabela) sobrevivem, o layout único não.

---

## 10. Fase D — Pré-Lançamento (2026-07-31)

> Fonte: `docs/01-backlog-pre-lancamento.md` — quatro walkthroughs do produto
> **em produção** com um marceneiro real, consolidados em 87 itens —, mais os
> adendos do operador sobre o algoritmo de plano de corte e sobre o
> `ModuleViewer`. Modelagem correspondente: `docs/Modelo-de-Dominio.md` Seções
> 3.1.1, 3.2, 3.2.1, 3.2.2, 3.2.3, 3.4.1, 4.1, 7.1, 8.1–8.6 e 11. **Onde este
> PRD e o Modelo de Domínio divergirem, o Modelo manda** — este documento
> descreve o produto, aquele define a verdade do dado.

### 10.1 Por que uma fase nova em vez de reabrir a V2

As Fases A (Discovery), B (Motor e dados) e C (Experiência) fecharam o Épico
V2: o produto está em produção, com 290 testes verdes. **Nada do que está aqui
contradiz a V2** — e é exatamente por isso que não se reabre a V2.

Três razões para a fase separada:

1. **Origem do requisito é outra.** A V2 nasceu de um briefing escrito antes
   de existir produto. Esta rodada nasce de **uso real observado**: um
   marceneiro operando o sistema, quatro vezes, com o produto rodando. É
   validação, não especificação — e validação de produto entregue é fase
   própria, não emenda retroativa de spec.
2. **O trabalho tem natureza diferente.** A V2 construiu do zero. A Fase D
   fecha **lacunas, bugs e vocabulário** de algo que já existe, mais um punhado
   de funcionalidades que a V2 nunca previu porque ninguém tinha usado o
   sistema ainda (criar módulo do zero, altura por parede, elemento "pedra",
   tampo simples).
3. **Reabrir a V2 apagaria a rastreabilidade.** Reescrever as Seções 1–9 para
   "atualizar" faria sumir o registro de que o congelamento estava
   especificado desde a Fase A e mesmo assim não foi construído (risco 10).
   Esse registro é o ativo mais útil desta rodada.

**O que a Fase D entrega:** o produto vendável ao primeiro cliente pagante.
O critério de saída não é "os 87 itens fechados" — é a Seção 6 inteira
satisfeita, com os itens 🔴 do backlog-fonte todos resolvidos.

### 10.2 Emendas aos requisitos existentes

Nenhum RF de 01 a 18 foi revogado. Estes ganharam extensão ou critério de
aceite mais duro:

| RF | O que muda na Fase D | Origem |
|---|---|---|
| RF-02 | Logo passa a ser **upload real** (o campo de URL sai), com persistência e fallback para a marca Orça Fácil; entram foto de perfil, máscara de CNPJ e de telefone (10 ou 11 dígitos) e área de segurança. As alturas padrão viram **default herdável** (D-27), o perfil da organização **só pode ser escrito em `/perfil`**, e entra um campo novo: **espessura de serra (kerf)**, default 3 mm, editável, `0` válido — parâmetro do plano de corte (RF-34) | 4.6–4.12 · Q-1 · Modelo 8.2 |
| RF-03 | Catálogo **unificado** (card único, categoria interna, campos dinâmicos), **código universal** por item, campos universais código/preço/status, e **tamanho de rolo de fita como campo do cadastro** — nunca hardcoded | 4.1–4.5 · 3.6 · 5.3 |
| RF-04 | Além de fork, **criação do zero** pelo usuário da organização; **promoção org → global só do operador**, por cópia; a biblioteca **esconde** o global cuja origem é gabarito da própria org (senão o marceneiro vê o próprio módulo duas vezes) | D-31 |
| RF-05 | O editor deixa de ser só uma tela à parte: as edições de uso comum (largura, altura, profundidade, cor e espessura da caixa e das portas, fundo sim/não, tipo de puxador) ficam disponíveis **no momento da inserção do módulo na parede** | 2.19–2.23 |
| RF-07 | Cardinalidade **N ambientes × N paredes** (o limite de 1 parede era da UI e caiu — D-30); parede com **nome livre**; alturas com **override por parede** (D-27); posicionamento com **entrada em vão** (D-28) | 0.1–0.6 · 2.3–2.6 |
| RF-08 | **Tier 2 entra no corte de lançamento** (D-30). Regra de bloqueio por tipo de elemento explicitada: porta e janela quebram o bloco físico quando intersectam; **pedra, tomada e ponto hidráulico não quebram** | Q-7 · 2.7 |
| RF-11 | A saída do plano de corte passa a ser completa: chapas por material **e cor**, **contagem de cortes/passadas de serra**, metros de fita **discriminados por cor** e **rolos a comprar**; o **veio da placa é exibido** na visualização. O plano passa a ser **sempre guilhotinável** (invariante, não preferência) e a respeitar o **kerf** — ver RF-34 | 3.2 · 3.4–3.6 · Modelo 8.1/8.2 |
| RF-13 | O congelamento deixa de ser cláusula e vira **aceite testado**: paridade "soma das linhas == preço final" em teste automatizado, resíduo de arredondamento absorvido pela última linha | 1.5 · 1.6 |
| RF-15 | Quantidade como **inteiro simples, sem m²**; **quantidade editável** na lista (valor, categoria e descrição permanecem travados); item manual/personalizado confirmado como essencial. O snapshot **permanece em `versao: 1`** — a extensão que registraria procedência do plano de corte morreu com a direção assíncrona (Modelo 8.3) | 3.7–3.9 |
| RF-16 | Entram **reversão da divisão de linha** (item volta para a linha mãe) e **subdivisão dentro do ambiente mantendo o vínculo** (quarto → cabeceira, penteadeira, gaveteiro, todos sob "Quarto"); o botão de conjunto passa a existir também nos módulos superiores | 2.29 · 2.31 · 2.32 |
| RF-17 | O PDF usa a logo **carregada por upload**; sem logo, a marca padrão. Prazo de entrega sai do dashboard mas continua na proposta | 4.8–4.10 · 5.7 |
| RF-18 | Persistência real não basta: **invalidação de cache após mutação** e **estado de aba na URL** passam a ser parte do requisito. Sem isso, o dado está salvo e a tela mente | 1.1 · 1.2 |

### 10.3 Requisitos funcionais novos

Legenda de bloqueio: 🔴 bloqueia lançamento · ⛔ execução bloqueada por decisão
pendente — **nenhum RF está nesta condição desde 2026-08-03** (Q-17 e Q-18
respondidas; ver 7.4).

| RF | Descrição | Origem | Nota |
|---|---|---|---|
| RF-19 | **Ambiente e parede navegáveis na aplicação.** Cadastrar, editar, ordenar e nomear ambientes dentro do orçamento; N paredes por ambiente com nome livre; seletor de parede que expande o painel daquela parede; **indicação visual permanente de qual ambiente e qual parede estão em edição** | 0.1–0.3 · 0.6 · 2.3–2.6 | 🔴 |
| RF-20 | **Alturas de faixa herdadas com override por parede.** Perfil da organização define o default; a parede sobrescreve **campo a campo**; a UI mostra "herdado" vs "customizado" e oferece "voltar ao herdado" (que apaga o campo, não copia o valor); salvar o perfil avisa que a mudança **propaga** para as paredes não customizadas. Rótulo de `peDireito` passa a dizer o que ele é: limite superior de instalação do aéreo | 0.4 · 5.1 · 5.2 · D-27 | |
| RF-21 | **Posicionamento por vão até o vizinho.** O campo que o marceneiro preenche é o vão até o módulo vizinho do lado escolhido; o sistema converte para X absoluto ao salvar e reconverte para vão ao exibir, dos dois lados. Apagar um módulo do meio **não move nenhum outro** — só o vão exibido cresce. Vão negativo é erro, não aviso | 2.18 · D-28 | |
| RF-22 | **Congelamento real da proposta.** A proposta e a lista de material fechada são lidas de um **snapshot persistido**, nunca recalculadas na renderização. Navegar entre abas, dar F5 ou consultar o orçamento de novo dias depois exibe **exatamente** o valor congelado — só a ação de produto **Reabrir** descongela. Recalcular o plano de corte (RF-34) depois do congelamento **não retroage** sobre a lista congelada | 0.7a, 0.7b | 🔴 — ver 10.4 |
| RF-23 | **Estado de aplicação confiável.** Salvar em qualquer aba propaga para as demais (invalidação de cache após mutação); a aba atual vive na URL e sobrevive ao F5; "atualizar render" funciona sem recarregar a página; o link "calculadora" do editor leva ao destino certo | 1.1–1.3 · 1.8 | 🔴 |
| RF-24 | **Criar módulo do zero.** O que falta é o **ponto de entrada na UI**, a partir de `/biblioteca` e do menu lateral: um caminho "criar novo" que abre a **mesma tela de edição de módulo já existente** (`/modulo`), sem gabarito de origem, produzindo um gabarito **privado à organização**. Não é página nova nem capacidade nova de backend — a criação do zero já existe (`lib/gabarito/criar.ts`, `origem_gabarito_id: null`). Promoção org → global existe, é **cópia** e é **exclusiva do operador** — não há botão para o marceneiro | 2.1 · D-31 | 🔴 |
| RF-25 | **Elementos de parede completos.** Tipo **pedra** (bancada/mármore de terceiros); **edição após adicionar**, tanto pela linha da lista quanto pelo clique na representação 2D; referência de medida escolhível em X (esquerda/direita) e Y (chão/teto), com **rótulos descritivos** ("Distância da parede esquerda", "Altura do chão"), nunca "X" e "Y"; **preset por organização** para elementos recorrentes — só nome, **fora do catálogo**, sem preço e sem status | 2.7–2.12 · D-29 | |
| RF-26 | **Inserção de módulo na parede, com decisão guiada.** Seleção em cascata ambiente → faixa → módulo (o campo de módulo só libera depois da faixa); faixas nomeadas **inferior · meio · aéreo · torre**; torre ocupa as três faixas; módulo inferior **assenta sobre o rodapé** automaticamente | 2.14–2.17 | |
| RF-27 | **Elevação da parede desenha os módulos.** Hoje só os elementos de parede aparecem. A elevação passa a mostrar os módulos posicionados, as faixas rotuladas com a nomenclatura nova, a torre refletindo a sobreposição real, e **cotas à direita**: altura total da parede e altura de cada faixa | 2.24–2.27 | 🔴 |
| RF-28 | **Tampo com três modelos.** `simples` · `engrossado` · `dobrado`, escolhidos **antes** da espessura; a lista de espessuras é filtrada pelo modelo (simples 15/18/25 · engrossado e dobrado 30/45/60 com base 15 e 36/54 com base 18); **6 mm nunca**; trocar o modelo com espessura incompatível **limpa** o campo em vez de coagir para o valor mais próximo | 3.10–3.12 | |
| RF-29 | **Saída do plano de corte que serve para comprar.** Quantas chapas e quais (material e cor) · quantos cortes/passadas de serra · quantos metros de fita e **de qual cor** · quantos rolos comprar, a partir do tamanho de rolo do catálogo. Regra fechada: **tudo na categoria "chapa" conta como chapa**, independente de espessura ou aproveitamento — verificar no dado se o defeito das chapas de 6 mm está no cálculo ou na classificação do catálogo antes de corrigir | 1.7 · 3.1–3.8 | 🔴 (3.5) |
| RF-30 | **Catálogo unificado.** Card único com seletor de categoria interno no lugar das abas separadas; botão genérico **"Adicionar item"**, nunca "Adicionar chapa"; campos específicos aparecem só depois de escolhida a categoria; código universal para chamada rápida no orçamento | 4.1–4.5 | |
| RF-31 | **Identidade e conta.** Upload de logo (o campo de URL sai) que persiste e aparece em todo lugar que a exibe, com fallback da marca Orça Fácil; upload de foto de perfil; máscaras de CNPJ e telefone; área de segurança dedicada; **troca de senha com confirmação por e-mail**; e-mail **não editável** (é o identificador da conta); **exclusão de conta** — que, decidido na Q-13, apaga a **organização inteira por cascata**, sem soft-delete, sem anonimização e sem retenção, com confirmação explícita, expurgo de `auth.users` e de Storage, e correção do `on delete restrict` de `orcamento.cliente_id` (Modelo 7.3) | 4.6–4.15 · Q-13 · Q-17 | 🔴 (4.8/4.9/4.13/4.15) — **destravado**: quem pode excluir é **só `admin`/dono** (Q-17 respondida em 2026-08-03), checado na Server Action antes de qualquer escrita, com `NAO_AUTORIZADO_EXCLUIR_ORG`/403 para o resto (Modelo 7.3) |
| RF-32 | **Editar dados do cliente após a criação do orçamento** (nome, telefone, endereço). Hoje o cadastro é de mão única | 0.5 | |
| RF-33 | **Dashboard que serve para gerir, com esteira real.** A lista de orçamentos recentes perde o prazo de entrega e ganha **valor final do projeto** e **custo**. Entra a **etapa de esteira** (Q-6 respondida): enum `etapaEsteira` de 5 valores, **ortogonal ao `status` comercial**, com **transições automáticas** disparadas por ações que já existem — "gerar proposta" leva a `aguardando_aprovacao` no mesmo ato em que congela (RF-22), "reabrir" traz de volta de `fechado`. **`visita_agendada` e `projeto_3d` não têm gatilho** e são movidas **manualmente** pelo usuário; não se inventa gatilho para elas. Nenhuma transição é implícita: nada muda de etapa por recalcular, abrir tela ou salvar item. O card exibe **um badge derivado** de `etapaEsteira` — "Fechado" no terminal, "Em andamento" nas intermediárias, e o rótulo do `status` comercial quando a etapa é `novo` (Q-15). **Nenhum campo de status novo nasce daqui** | 5.7–5.10 · Q-6 · Q-15 · Modelo 7.2 | |
| RF-34 | **Plano de corte que aproveita a chapa de verdade.** Substituição do bin-packing por **guilhotina com lista de retângulos livres** (o espaço livre deixa de ser descartado quando a "prateleira" corrente fecha) + **meta-heurística** que avalia milhares de ordens de inserção e guarda a melhor. **Kerf** (espessura de serra, campo do perfil, default 3 mm) passa a ser respeitado entre peças adjacentes. Roda **100% em TypeScript, num Web Worker do navegador**: sem worker externo, sem fila, sem tabela, sem entidade nova, sem custo de infra. Enquanto a busca roda (1–2 s), a **passada determinística de hoje continua na tela de imediato** — nunca existe estado "sem plano de corte", e se o Web Worker não estiver disponível a mesma função roda no main thread com resultado idêntico. **Duas invariantes de produto, não de implementação:** (a) **determinismo** — mesma entrada ⇒ mesmo plano, sempre; PRNG semeado e **número fixo de iterações**, jamais limite de relógio, porque `N(M)` entra no preço (Modelo 5.2) e um plano que varia entre duas aberturas da mesma tela produz **dois preços para o mesmo orçamento**; (b) **monotonicidade** — o resultado **nunca é pior** que o do algoritmo determinístico atual com os mesmos parâmetros, porque este é o candidato inicial da busca. Fecha os itens **3.1** (bug relatado pelo marceneiro) e **3.3** (troca de algoritmo) de uma vez | Adendo do operador · Modelo 8.1–8.6 | 🔴 (3.1) |
| RF-35 | **Shell consistente em todas as telas.** Biblioteca e editor de módulo passam para a versão nova da UI, com menu lateral presente; os textos clicáveis antigos (editor, calculadora, biblioteca, catálogo) saem das duas telas | 5.1–5.4 | |
| RF-36 | **Vocabulário de produto na interface.** Nenhum termo de especificação interna aparece para o marceneiro — ver 10.4 | 2.5 · 5.5 · 5.6 | transversal |
| RF-37 | **Dois agrupamentos, duas afordâncias.** Bloco físico (automático, mesma parede, mesma faixa — base de tampo/rodapé/tamponamento) e agrupamento comercial (criado pelo usuário, cruza faixas e paredes dentro do ambiente — vira uma linha de proposta) coexistem na mesma elevação com controles **visualmente distintos**. Nunca podem virar o mesmo botão | 2.28–2.30 · Q-3 | 🔴 (2.30) |
| RF-38 | **`ModuleViewer` — visualização 3D estática do módulo em edição.** Visualizador **não-interativo** derivado da **mesma geometria do `BoxModule`** que o canvas 2D já consome: câmera ortográfica **fixa e programática** (`isometric` · `front` · `top` · `side`), **sem órbita e sem controle de usuário**. Props `width`/`height`/`depth`/`view`/`color?`/`textureUrl?`. **Nada é persistido** — não há campo de domínio novo e não pode existir um segundo caminho de derivação de geometria só para o 3D (se o 3D e o 2D divergirem, é bug de derivação, não diferença legítima). Lança com **textura real** de padrão de MDF (Q-14 respondida): `textureUrl` sai de `especificacao.texturaUrl` do `Produto` tipo `chapa`, caminho relativo dentro do bucket de texturas (nunca URL externa), resolvido **na renderização**; ausente ⇒ fallback na cor sólida derivada de `material.cor`, que continua sendo o **único** fallback. As **~380 imagens de textura são pré-requisito de conteúdo do operador** — curadoria, recorte, conversão e hospedagem —, **não trabalho do executor**, exatamente como os padrões de MDF já anotados em `docs/STATUS.md`; sem elas a task entrega o campo funcionando e a tela se comporta como o cenário "cor sólida". Exceção escopada à política "sem 3D" — **não** reabre o canvas técnico (D-33) | Adendo do operador · D-33 · Q-14 · Modelo 4.1 e 4.1.1 | |

### 10.4 Critérios de aceite transversais desta fase

Valem para **qualquer** task da Fase D, não só para o RF que os cita.

1. **Vocabulário (RF-36).** Termos criados para especificar o produto não
   aparecem na tela. Remover o card "validação tier 1 + tier 2" e varrer o
   restante da UI atrás de outros vazamentos. Substituições já decididas:

   | Na tela hoje | Passa a ser |
   |---|---|
   | "Tier 1", "Tier 2" | não aparece — a validação acontece, o nome dela não é do usuário |
   | "Preset" (item posicionado) | **"Módulo"** |
   | "Template" | não aparece (o motor V1 não existe mais) |
   | Faixa "bancada" | **"meio"** (o identificador do domínio continua `bancada`) |
   | "X" / "Y" nos elementos de parede | "Distância da parede esquerda/direita" · "Altura do chão" / "Distância do teto" |
   | "Pé direito" (nas alturas de perfil) | "Limite de instalação do aéreo" |

   Regra geral, para o que não estiver na tabela: **se o termo só existe porque
   alguém precisou escrever uma spec, ele não vai para a tela.**

2. **Congelamento é testado, não conferido (RF-22).** A causa raiz apontada
   pelo backlog-fonte é dupla — **falta de invalidação de cache após mutação**
   e **estado de aba fora da URL** — e os cinco bugs reportados
   (proposta desatualizada, F5 voltando para "ambientes", "atualizar render"
   inerte, salvar que não propaga, valor que muda ao navegar) têm essa causa
   única. Aceite mínimo:
   - a proposta é lida do snapshot persistido, e existe teste que **falha** se
     alguém voltar a recalculá-la na renderização;
   - soma das linhas == preço final, verificado por teste automatizado;
   - navegar entre abas, dar F5 e revisitar o orçamento produzem **o mesmo
     número**, sempre. (A ação de produto **Reabrir** é o único caminho que
     muda esse número — e ela é de `admin`, Q-18 / Modelo 5.4.1 I6a.)

   > A diferença de R$ 6,00 relatada no walkthrough (esperado 4.578,77 ×
   > exibido 4.584,77) precisa ser **reproduzida com dado real** antes de se
   > assumir que a aritmética está certa. Pode ser edição entre leituras ou
   > resíduo de arredondamento não absorvido pela última linha.

3. **Nada de "1 parede" implícito.** Qualquer componente, estado ou consulta
   que assuma um ambiente único ou uma parede única é defeito, mesmo que a
   tela pareça correta com um ambiente só (risco 7).

4. **Perfil da organização só é escrito em `/perfil`.** Salvar parede,
   ambiente ou orçamento nunca toca em `organizacao.alturas_padrao`
   (risco 8) — hoje toca, e isso precisa cair junto com a entrega do RF-20.

5. **Decisão pendente não vira palpite — e não sobrou nenhuma.** A lista de
   perguntas vivas está **vazia**: **nenhuma pergunta viva bloqueia o início
   da execução da Fase D** (Seção 7.4). Q-17 e Q-18, as duas últimas, foram
   respondidas em **2026-08-03** com a mesma resposta — **só `admin`/dono** —
   e saem desta lista; Q-6, Q-13, Q-14, Q-15 e Q-16 saíram porque foram
   respondidas em 2026-08-02; Q-8 a Q-12 saíram porque **deixaram de existir**
   — não é a mesma coisa. A regra permanece para o que vier depois: nenhuma
   condição de papel, política de RLS, coluna, enum ou limiar numérico nasce
   de dedução. Se uma pergunta nova aparecer no meio de uma task, a task
   **para** e devolve ao operador.

   As duas condições de autorização recém-fechadas são de aceite obrigatório
   nas tasks que as tocam: exclusão da organização só com `perfil.papel ===
   'admin'`, checado na Server Action antes de qualquer escrita
   (`NAO_AUTORIZADO_EXCLUIR_ORG`/403 — Modelo 7.3), e **Reabrir** só com
   `admin`, mesma forma de checagem (`NAO_AUTORIZADO_REABRIR`/403 — Modelo
   5.4.1, **I6a**). Em nenhum dos dois casos nasce política de RLS nova, e a
   ausência de política de `delete` em `organizacao` para `authenticated` é
   deliberada e permanece.

6. **Plano de corte é determinístico e nunca regride (RF-34).** Qualquer task
   que toque no motor de corte entrega, junto, as invariantes do Modelo 8.5:
   duas execuções da mesma entrada produzem saída estruturalmente idêntica
   (**V7**) e o número de chapas nunca é maior que o do algoritmo
   determinístico com os mesmos parâmetros (**V6**). Limite por tempo de
   relógio é defeito, não otimização — é o que faria o mesmo orçamento ter
   dois preços.

7. **O 3D não vaza para o canvas técnico (D-33).** `BoxCanvas`,
   `ElevacaoParede` e `PlanoCorteCanvas` continuam 2D. O `ModuleViewer` não
   ganha órbita, não ganha edição, não persiste estado de visualização e não
   deriva geometria por um caminho próprio.

### 10.5 Critérios de sucesso da Fase D

Somam-se aos da Seção 5 — não os substituem.

- O marceneiro monta um orçamento com **mais de um ambiente e mais de uma
  parede** sem gambiarra e sem perder de vista onde está.
- **O valor da proposta não muda sozinho.** Enviada por R$ 4.584, consultada de
  novo por R$ 4.584 — em qualquer aba, depois de qualquer F5, em qualquer dia.
  (Só a ação de produto **Reabrir** — RF/Task 1.9 — descongela o orçamento e
  devolve os valores ao recálculo; navegar de volta nunca faz isso.)
- O marceneiro **cadastra o jeito dele de trabalhar**: cria módulo do zero,
  ajusta alturas por parede, cadastra os elementos de parede que se repetem.
- O plano de corte responde às três perguntas de compra: **quantas chapas e
  quais · quantos cortes · quantos metros de fita e de qual cor**.
- **O plano de corte não varia sozinho e não regride.** O mesmo orçamento
  revisitado amanhã, em outra máquina, produz **o mesmo plano e o mesmo número
  de chapas**; e o plano novo nunca usa mais chapas que o algoritmo antigo com
  os mesmos parâmetros. O caso relatado no walkthrough — sarrafo de 7 × 150 cm
  abrindo chapa nova com 30 × 270 cm livres — deixa de acontecer.
- **O marceneiro reconhece o móvel olhando a tela, sem ter modelado nada.**
  O visualizador 3D estático mostra o módulo que ele acabou de configurar por
  medidas; ele nunca precisou desenhar em 3D para chegar ali.
- A proposta sai com **a marca do marceneiro**, carregada por ele, sem
  intervenção de operador.
- Ninguém encontra na tela uma palavra que só existe em documento de
  especificação.
