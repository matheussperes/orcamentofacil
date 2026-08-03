# Business Strategy — orcamentofacil

> **Documento de contexto estratégico, não de execução.** Nada aqui entra no
> `docs/Backlog.md`, muda o escopo do PRD ou libera task nova. Ele existe para
> registrar a visão de longo prazo que o operador trouxe **fora** da esteira de
> execução, para que ela não se perca e para que decisões futuras de
> arquitetura saibam que ela existe.
>
> **Fonte:** visão de negócio do operador, 2026-08-03. Tudo que está registrado
> abaixo veio dele. O que ele **não** definiu está marcado como
> **não definido** — não foi preenchido por dedução.
>
> Documentos vizinhos: `docs/PRD.md` (o produto), `docs/Modelo-de-Dominio.md`
> (a verdade do dado), `docs/Backlog.md` (a execução em curso).

---

## 1. Visão — o hub multi-ferramenta para marcenarias

O **orcamentofacil** não é o produto final: é o **primeiro módulo** de uma
plataforma maior voltada a marcenarias. A intenção do operador é que outras
ferramentas sejam **plugáveis na mesma base**, atendendo o mesmo cliente
(o marceneiro / lojista de marcenaria pequena da Seção 2 do PRD) em outras
partes da operação dele.

Ferramentas citadas pelo operador como candidatas ao hub:

- **CRM**
- **Financeiro avulso**
- **Cronograma**
- **Processos da marcenaria**
- **Contrato + assinatura eletrônica**
- **Gestão de clientes**
- **Pagamento**

O operador disse "entre outras" — a lista **não é exaustiva** e não é um
compromisso de roadmap. Nenhuma ferramenta além dessas foi citada, e nenhuma
foi acrescentada aqui.

**O que não está definido:** como as ferramentas se plugam tecnicamente. Não há
arquitetura de plugin decidida, nem foi pedida. Quando essa decisão chegar, ela
é do `data-architect` / `solution-architect`, não deste documento.

---

## 2. Modelo de monetização

Registro literal da intenção do operador:

- As ferramentas do hub podem ser vendidas **avulsas** ou **em planos**.
- Os planos são três: **Básico**, **Pro** e **Premium**.
- Há **desconto por combinação** de ferramentas — quanto mais ferramentas o
  cliente contrata junto, melhor o preço relativo.
- **Premium = todas as ferramentas.**

**O que não está definido, e não foi inventado aqui:** preço de nada (nem
avulso, nem por plano), qual ferramenta cai em qual plano, tamanho do desconto
por combinação, ciclo de cobrança, teste grátis, e qualquer nome de plano além
dos três acima.

**Situação hoje:** a cobrança segue **manual** (D-18, PRD 7.2) e continua fora
do corte de lançamento. Não existe no produto nenhuma noção de assinatura,
plano contratado ou ferramenta habilitada — e isso é coerente com o corte
atual, não uma lacuna a corrigir agora.

---

## 3. Decisão de priorização (explícita)

> **O OrçaFácil — orçamento com PDF de proposta, plano de corte e projeto
> visual 3D estático (`ModuleViewer`) — é o produto de lançamento e de
> monetização inicial. As demais ferramentas do hub são escopo futuro: não
> iniciar nenhuma delas antes do lançamento do OrçaFácil.**

Consequências práticas:

1. **O `docs/Backlog.md` atual está certo e não muda.** Ele já está 100%
   dedicado a fechar o OrçaFácil (Épico V2.1 / Fase D do PRD). Esta visão de
   hub **confirma** a prioridade em execução; não a altera, não acrescenta task
   e não reordena nada.
2. **Nada de CRM, financeiro, cronograma, contrato, pagamento ou gestão de
   clientes entra no escopo de execução agora.** Registro de contexto não é
   requisito.
3. **Nada se finaliza antes do lançamento** — palavra do operador. Inclusive as
   observações da Seção 7 abaixo, que são alertas, não tarefas.

---

## 4. Fases de crescimento do sistema

**Fase 1 — Lançamento do OrçaFácil** *(o que está sendo executado agora)*
Desbloqueada por: nada — é o estado corrente.
Características: escopo da Seção 6 do PRD — orçamento multi-ambiente/parede,
plano de corte, congelamento real da proposta, PDF com a marca do marceneiro,
`ModuleViewer` 3D estático. Cobrança manual.

**Fase 2 — Monetização do OrçaFácil sozinho**
Desbloqueada por: **marco não definido pelo operador.**
O que muda: o OrçaFácil passa a ser vendido como ferramenta avulsa. É aqui que
aparecem, pela primeira vez, assinatura/entitlement e a necessidade de mais de
um usuário por organização (convite e gestão de membros, hoje fora do corte —
PRD Seção 6).

**Fase 3 — Segunda ferramenta e nascimento do hub**
Desbloqueada por: **marco não definido pelo operador.**
O que muda: deixa de existir "um produto com um banco" e passa a existir
"plataforma com ferramentas". É o momento em que a arquitetura de plugin, a
noção de plano (Básico/Pro/Premium) e o desconto por combinação precisam
existir de verdade — e o momento em que as observações da Seção 7 deixam de
ser alertas e viram trabalho.

**Fase 4 — Hub completo**
Desbloqueada por: **marco não definido pelo operador.**
O que muda: Premium (todas as ferramentas) passa a ser uma oferta real, e o
argumento de venda deixa de ser a ferramenta e passa a ser a plataforma.

> Os marcos de desbloqueio de cada fase **não foram definidos pelo operador** e
> não foram inventados aqui. "Quando crescer" não é marco; até haver número, a
> fase fica sem gatilho declarado. Pergunta em aberto para uma próxima rodada
> de estratégia — **não bloqueia nada da execução atual**.

---

## 5. Estratégia de expansão

- **Novas verticais / casos de uso:** a expansão declarada pelo operador é
  **por ferramenta dentro da mesma vertical** (marcenaria), não por público
  novo. O hub adiciona superfícies da operação da marcenaria — comercial (CRM,
  contrato, pagamento), financeira, produtiva (cronograma, processos) — para o
  **mesmo** cliente.
- **Novos segmentos, geografia, idioma, regulação:** **não definido.** O
  operador não citou expansão para outro público nem outro mercado, e nada foi
  assumido.
- **Condição de gatilho:** também **não definida** — a única condição declarada
  é a da Seção 3 (o OrçaFácil precisa lançar primeiro).

---

## 6. Roadmap pós-MVP — o que ficou conscientemente fora

Esta tabela **não vira Backlog**. O `backlog-planner` continua fatiando só o
escopo do PRD.

| Ferramenta / melhoria | Prioridade | Racional | Depende de |
|---|---|---|---|
| CRM | não definida | Escopo futuro do hub; não iniciar antes do lançamento | Lançamento do OrçaFácil |
| Financeiro avulso | não definida | idem | idem |
| Cronograma | não definida | idem | idem |
| Processos da marcenaria | não definida | idem | idem |
| Contrato + assinatura eletrônica | não definida | idem — e é a que mais mexe com retenção de dado (ver 7.2) | idem |
| Gestão de clientes | não definida | idem | idem |
| Pagamento | não definida | idem | idem |
| Planos Básico / Pro / Premium com desconto por combinação | não definida | Só faz sentido com mais de uma ferramenta vendável | Segunda ferramenta do hub |

> **A prioridade relativa entre as ferramentas não foi dada pelo operador** e
> não foi arbitrada aqui. A única ordenação declarada é: OrçaFácil primeiro,
> todo o resto depois.
>
> Os itens "fora do corte de lançamento" do próprio OrçaFácil (planta baixa,
> 3D interativo, Tier 3, outros modos de precificação, versionamento de
> orçamento, cobrança automatizada, sobra aproveitável, fluxo de aprovação,
> etapas de chão de fábrica, gestão de membros) continuam listados e
> justificados no **PRD Seção 6** — não são duplicados aqui.

---

## 7. Observações de risco estrutural futuro

> **Nada aqui é para corrigir agora.** O operador foi explícito: nada se
> finaliza antes do lançamento do OrçaFácil. Estas são anotações para não se
> perder o alerta quando a Fase 3 chegar. Nenhuma delas é bug, nenhuma delas
> bloqueia task, e nenhuma justifica reabrir decisão fechada do PRD ou do
> Modelo de Domínio.

### 7.1 `perfil.papel` tem vocabulário de uma ferramenta só

O enum é `admin` / `vendedor` / `projetista` — nomes que descrevem quem
trabalha **num orçamento**. Num hub, "quem pode usar o financeiro" ou "quem
pode assinar um contrato" não é a mesma pergunta, e o papel é da **organização
inteira**, não por ferramenta. Não existe hoje nenhum lugar para "esta
organização contratou estas ferramentas" (entitlement) — o que é coerente com o
corte atual (cobrança manual, D-18), mas é a primeira coisa que falta no dia em
que houver plano Básico/Pro/Premium.

Agrava um pouco: até 2026-08-02 `perfil.papel` não era usado por nada; com as
respostas de Q-17 e Q-18 ele passa a ser lido por **duas** checagens de
aplicação (excluir organização · Reabrir orçamento). São só duas, ambas
documentadas e ambas escritas *por papel* — mas quem for redesenhar papéis para
o hub precisa saber que elas existem. Endereços: Modelo 7.3 e 5.4.1 (I6a).

### 7.2 "Excluir conta" apaga a organização inteira, e a organização será o tenant do hub inteiro

Decidido na Q-13/Q-17: excluir conta destrói a `organizacao` por cascata, sem
soft-delete, sem anonimização, sem retenção, irreversível — e a regra
registrada no Modelo 7.3 é **permanente**: *"toda tabela futura com
`organizacao_id` obrigatoriamente `on delete cascade`"*.

Para o OrçaFácil isso está correto e não se discute. Para o hub, é a observação
mais séria deste documento: se CRM, financeiro, pagamento e **contrato com
assinatura eletrônica** pendurarem em `organizacao_id`, um clique de "excluir
conta" dentro do OrçaFácil apaga contrato assinado e histórico financeiro
junto. Contrato assinado e movimento financeiro costumam ter exigência de
retenção que colide frontalmente com "destruição imediata e irreversível".

Não é para mexer agora — hoje não existe nenhuma dessas tabelas. É para não
descobrir isso depois de já ter pendurado a primeira delas no mesmo cascade.

### 7.3 O que já está bem posicionado para o hub (registro, não risco)

- **`organizacao` como tenant** (D-13) e RLS por organização: é exatamente a
  fronteira que um hub multi-ferramenta precisa. Não há retrabalho previsto
  aqui.
- **`cliente` é tabela própria da organização**, não um campo do orçamento — um
  CRM ou uma ferramenta de "gestão de clientes" teria onde se apoiar sem
  migração de dado.
- **Gabaritos globais sobrevivem à exclusão de uma org** (Modelo 7.3): o padrão
  "conteúdo compartilhado × conteúdo do tenant" já existe e já foi testado numa
  decisão real.

---

## 8. Seções deliberadamente não preenchidas

Para deixar claro que foram consideradas e não esquecidas — o operador não
tratou de nenhuma delas nesta rodada, e preenchê-las por dedução seria inventar
negócio:

| Seção | Situação |
|---|---|
| Diferencial defensável | **não definido** pelo operador |
| Estratégia de aquisição (por onde chegam os primeiros usuários) | **não definido** |
| Plano de crescimento (10 → 1000 usuários) | **não definido** |
| Riscos de negócio (custo variável, dependência de terceiro, regulação) | **não levantado** nesta rodada — a exceção é a observação 7.2, que é estrutural e veio do que já está modelado |
| Custo operacional estimado (infra, APIs, modelo) | **não levantado** |

São perguntas para uma próxima rodada de estratégia com o operador. **Nenhuma
delas bloqueia a execução em curso.**
