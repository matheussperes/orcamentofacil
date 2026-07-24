# PRD — orcamentofacil V2

> **Fase A (Discovery) — artefato 2 de 4.** Fonte de requisitos:
> `docs/00-briefing-v2-reorientacao_1.md`. Fonte do modelo:
> `docs/Modelo-de-Dominio.md`. Mapa de telas: `docs/Mapa-de-Telas.md`.
> `docs/PRD-PIPELINE.md` é o PRD histórico da V1 e fica como referência —
> **este documento o substitui como PRD vigente.**

---

## 1. Visão de produto

Um **painel de orçamento para marceneiros**: rápido, direto, sem exigir
modelagem 3D. O marceneiro entra, monta o orçamento do móvel que **realmente
será feito**, enxerga plano de corte, custos, lista de material (pré-pedido de
compra) e gera uma proposta bonita com a marca dele — tudo em telas separadas
e fluidas, não numa página única sobrecarregada.

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
| RF-02 | Perfil da organização: marca/logo, unidade, alturas padrão, modo de precificação e montagem padrão | [N] |
| RF-03 | Catálogo de produtos editável (chapas, ferragens, LEDs, acessórios) — cópia no signup | [P] |
| RF-04 | Biblioteca de módulos por categoria — base global read-only + fork na edição | [P] |
| RF-05 | Editor de item dirigido por capacidade: módulo-caixa (carcaça+vãos+portas+gavetas) e placa | [P] |
| RF-06 | Primitiva Placa: espessura, material, orientação, borda por lado, engrossamento/dobra, ripado | [N] |
| RF-07 | Ambiente com parede(s): dimensões + elementos de parede + posicionamento 1D com faixas | [N] |
| RF-08 | Validação de encaixe Tier 1 (cabe, não sobrepõe) + Tier 2 (faixas não colidem, respeita elementos de parede) | [N] |
| RF-09 | Detecção automática de conjuntos adjacentes + quebra/união manual (handle de junção na elevação) | [N] |
| RF-10 | Elementos contínuos unificados (tampo/rodapé/tamponamento) com dimensão derivada | [N] |
| RF-11 | Motor de BOM + plano de corte com restrição de veio de chapa | [P] |
| RF-12 | Precificação: 4 modos (um no 1º corte) + resumo de 6 campos | [P] |
| RF-13 | Rateio de preço por custo alocado, segregado por material, com congelamento | [N] |
| RF-14 | Frete (proporcional) e montagem (3 modos, rateio acompanha base), diluídos na proposta | [N] |
| RF-15 | Lista de material (pré-pedido) editável + adição manual + congelamento + extração texto/CSV | [P] |
| RF-16 | Linha de Proposta: agrupamento comercial, render automático de conjunto, override manual com rebalanceamento | [N] |
| RF-17 | Proposta em PDF com marca, sem custos internos, valor à vista/parcelado (texto livre) | [P] |
| RF-18 | Persistência real de todo o estado (orçamento, ambiente, itens, linhas) por tenant | [N] |

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

## 6. Escopo negativo — recorte do primeiro cliente pagante (briefing Seção 9)

**Dentro do primeiro corte:** auth multi-tenant + perfil com marca; catálogo
de produtos editável; biblioteca de módulos com categorias; primitiva Placa;
**uma parede por ambiente** com validação Tier 1; elementos contínuos; plano
de corte com veio; resumo de 6 campos com **um** modo de precificação; lista de
material; linhas de proposta com rateio; PDF com marca.

**Fora do primeiro corte:** múltiplas paredes + planta baixa L/U/quadrado;
validação Tier 2 e 3; os outros 3 modos de precificação; override manual de
rateio (avaliar — briefing trata como 1º corte, mas é o item mais adiável se
prazo apertar); versionamento de orçamento (D-12); cobrança automatizada
(D-18: faturar manual no início); rastreio de "sobra aproveitável".

> Nota: o briefing marca "uma parede por ambiente" e "um modo de precificação"
> como recorte. O modelo de domínio já é desenhado para N paredes/N modos, para
> não haver migração ao expandir — só a UI e a validação começam no corte
> menor.

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
