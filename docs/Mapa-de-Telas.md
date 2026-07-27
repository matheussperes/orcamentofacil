# Mapa de Telas / IA — orcamentofacil V2

> **Fase A (Discovery) — artefato 3 de 4.** Derivado de
> `docs/Modelo-de-Dominio.md` e da jornada do `docs/PRD.md` Seção 3.
> Regra do briefing: o mapa de telas deriva do modelo de dados, nunca o
> inverso. A ordem de construção destas telas está no `docs/Backlog.md`
> (Fase C).

---

## 1. Princípios de navegação

1. **Telas separadas, não uma página só.** O problema central relatado pelo
   operador é "tudo misturado numa página". Cada responsabilidade tem sua
   tela/aba.
2. **Desktop-first**, sem quebrar mobile/tablet (Design System Seção 7).
3. **O orçamento é o contêiner de trabalho.** Depois do login, quase tudo
   acontece dentro do contexto de um orçamento aberto, organizado em abas.
4. **Configuração dirigida por capacidade** aparece na UI: o Editor de Item só
   mostra as seções que o tipo de item declara.

---

## 2. Árvore de navegação

```
/login                      Autenticação (Supabase)
/signup                     Cadastro de organização + cópia de catálogo

(app autenticado)
/                           Dashboard: lista de orçamentos (por status) + "Novo orçamento"
/perfil                     Área pessoal / organização
/biblioteca                 Biblioteca de módulos e placas (gabaritos)
/catalogo                   Catálogo de produtos (chapas, ferragens, LEDs, acessórios)

/orcamento/[id]             Orçamento aberto — SHELL com abas:
   ├─ aba "Ambientes"       Paredes + posicionamento 1D + validação + conjuntos + elementos contínuos
   ├─ aba "Corte & Material" Plano de corte (com veio) + lista de material (pré-pedido)
   ├─ aba "Financeiro"      Resumo de 6 campos + modo de precificação/montagem/frete
   └─ aba "Proposta"        Linhas de proposta (render + rateio) → gerar PDF

/orcamento/[id]/item/[itemId]   Editor de Item (módulo-caixa ou placa) — modal ou rota dedicada
/proposta/[id]/pdf              Render imprimível da proposta (marca do marceneiro)
```

---

## 3. Telas — o que vive em cada uma

### 3.1 `/login` e `/signup` (novo)
- Login via Supabase Auth. Signup cria a **Organização** (tenant, D-13) e
  dispara a **cópia do catálogo de produtos** (D-15).
- Substitui `app/api/auth/*` (auth próprio Prisma) — ver plano de remoção.

### 3.2 `/` — Dashboard de orçamentos
- Lista de orçamentos da organização por status (rascunho / fechado / enviado).
- Ação primária: **"Novo orçamento"** → formulário curto com os **dados do
  cliente** (nome, telefone, endereço) + **prazo de entrega** → abre
  `/orcamento/[id]`.
  > Capturar aqui é o que faz a proposta (3.8) sair pré-preenchida sem
  > retrabalho — requisito explícito do operador. Cliente já existente pode ser
  > selecionado em vez de redigitado.
- Reaproveita padrão de tabela/lista do Design System (Seção 6.9).

### 3.3 `/perfil` — Área pessoal / organização
- Marca/logo, unidade global (mm/cm, D-05), alturas padrão das faixas
  (rodapé, bancada, aéreo, pé-direito — alimentam o Y derivado do
  posicionamento 1D), modo de precificação padrão, modo de montagem padrão.
- Dados de perfil: nome, e-mail, telefone, endereço.

### 3.4 `/catalogo` — Catálogo de produtos
- CRUD de chapas (com flag `temVeio`), ferragens, LEDs, acessórios. Preço
  local por org. Cópia inicial no signup, depois editável.
- Sucede a tela atual de materiais (`app/configuracoes/materiais`).

### 3.5 `/biblioteca` — Biblioteca de gabaritos
- Módulos-caixa **e** placas, por categoria. Base global read-only + fork na
  edição (D-15). "Abrir no editor" → Editor de Item.
- Evolução da `/biblioteca` atual (que hoje só lista módulos-caixa); a tela
  atual já está próxima e é reaproveitável como ponto de partida.

### 3.6 `/orcamento/[id]` — o shell com abas (coração do produto)

O orçamento aberto é o contexto de trabalho, com 4 abas. O resumo financeiro
(6 campos) e o mini-plano-de-corte podem ficar **persistentes numa faixa
lateral/inferior** visível em todas as abas (briefing Seção 3 passo 6:
"acompanhar em paralelo").

#### Aba "Ambientes"
- Lista de ambientes do orçamento; por ambiente, a(s) parede(s).
- **Elevação 2D da parede** (feedback visual): régua de largura, faixas
  (inferior/bancada/aéreo/torre), elementos de parede (janela/porta/tomada/
  ponto hidráulico) desenhados.
- Posicionar itens: escolher da biblioteca (módulo/placa) e colocar na faixa/x.
- **Validação em tempo real** Tier 1+2 (cabe, não sobrepõe, respeita elementos).
- **Conjuntos**: contorno/colchete acima dos módulos adjacentes detectados;
  **handle de junção** clicável entre módulos (unido ↔ separado).
- Ao selecionar um conjunto: painel lateral com seus **elementos contínuos**
  (tampo/rodapé/tamponamento), com tamponamento oferecido só nas extremidades
  expostas (capacidade).
- **Canvas crítico**: esta é a tela que exige o render aceitando **lista de
  itens posicionados** (não um por vez) — ver `docs/Modelo-de-Dominio.md` 6.

#### Aba "Corte & Material"
- Plano de corte do orçamento inteiro, com restrição de veio, mostrando
  chapas compradas, área consumida e **sobra** (info operacional).
- **Lista de material / pré-pedido**: agrupada, editável, com adição manual de
  itens, frete e montagem. Ao fechar o orçamento, congela e fica extraível
  (texto/CSV, D-08).
- Reaproveita `PlanoCorteCanvas` e `montarLinhasInsumos` (existentes).

#### Aba "Financeiro"
- Resumo de 6 campos (preço final, custo material, montagem, frete, lucro
  final, margem). Seleção do modo de precificação e de montagem (override do
  default do perfil). Frete editável.
- Reaproveita o painel de KPIs já convertido (Task 6.5), com os campos novos.

#### Aba "Proposta"
- **Linhas de Proposta**: default = um ambiente por linha. Cada linha com
  render automático do conjunto de itens, descrição pré-preenchida e valor
  rateado. Ações: dividir/mesclar linhas, **override manual do valor com
  rebalanceamento** das demais.
- Alerta de UI: "remover um ambiente aumenta o preço dos demais; regenere a
  proposta" (briefing 5.2).
- "Gerar proposta" → congela os `valorRateado` e abre `/proposta/[id]/pdf`.

### 3.7 `/orcamento/[id]/item/[itemId]` — Editor de Item
- **Base direta**: o laboratório `/modulo` já convertido (Tasks 7.1/7.2 —
  accordion Caixa→Divisões→Portas→Gavetas→Puxador + canvas de seleção).
- **Dirigido por capacidade**: para módulo-caixa mostra o accordion atual;
  para placa mostra dimensões/material/orientação/borda-por-lado/
  engrossamento/ripado. O schema de capacidades decide as seções.
- **Seletor de lados do engrossamento** (requisito do operador — Modelo de
  Domínio 2.1.1): escolhida a espessura (30/45/60), o usuário clica nos lados
  da referência visual da placa para engrossar só o que quer (ex.: só os dois
  maiores), com confirmação. O BOM e a fita recalculam ao vivo.
- **Sentido do veio visível e alterável** (Modelo de Domínio 8): ao adicionar
  uma placa, mostrar graficamente em qual dimensão o veio corre e permitir
  inverter. Módulos-caixa usam os defaults (altura/largura → 2720; profundidade
  → 1820) sem exigir escolha.
- Custo ao vivo + peças + mini plano de corte do item (painel direito, Task
  7.3 — ainda pendente da esteira visual antiga, reaproveitável aqui).

### 3.8 `/proposta/[id]/pdf` — Proposta imprimível

> **Ampliado em 2026-07-24 pela auditoria do operador**: a proposta precisa de
> muito mais que a marca.

**Cabeçalho — dados do emitente** (vêm da Organização, `/perfil`):
marca/logo · **CNPJ** · **endereço** · **telefone**.

**Dados do cliente** (vêm do Cliente vinculado ao orçamento, capturados na
criação — ver 3.2): **nome** · **telefone** · **endereço**.

**Corpo:**
- **Ambientes orçados** — uma linha por Linha de Proposta, com render
  automático do conjunto, descrição e valor.
- **Prazo de entrega** (campo do orçamento).
- Total, à vista/parcelado (texto livre, D-09).
- **Sem custos internos** — o cliente nunca vê custo de material, montagem ou
  frete separados (D-25: diluídos no valor por ambiente).

Todos os campos pré-preenchidos a partir dos cadastros, **com opção de editar**
na hora de gerar.

- Evolução de `/proposta` atual + `proposta.css` (a base de impressão A4 é
  reaproveitável; a novidade é imagem + valor por linha e o bloco de dados
  emitente/cliente).

---

## 4. Mapa Tela → Entidade (rastreabilidade)

| Tela | Entidade(s) principal(is) do modelo |
|---|---|
| `/perfil` | Organização, Usuário/Perfil |
| `/catalogo` | Produto |
| `/biblioteca` | Módulo/Gabarito, Placa |
| `/orcamento/[id]` (Ambientes) | Orçamento, Ambiente, Parede, ItemPosicionado, **Conjunto*, ElementoContinuo |

\* **Conjunto não é entidade persistida** (decisão consciente da Task 11.2 —
`elemento_continuo.alvo` referencia `conjuntoId` como jsonb solto, sem FK).
É derivado em runtime por `detectarConjuntos()` (Task 12.3) a partir de
`Parede.itens` + `Parede.elementos`; só o **override manual** do handle de
junção (união/quebra) precisa de persistência própria — decisão de schema
em aberto, ver nota da Task 13.2 no Backlog.
| `/orcamento/[id]` (Corte & Material) | Plano de corte (motor), Lista de material fechada |
| `/orcamento/[id]` (Financeiro) | ModoPrecificacao, resumo de 6 campos |
| `/orcamento/[id]` (Proposta) | LinhaProposta |
| Editor de Item | ItemOrcamento (BoxModule | Placa) |
| `/proposta/[id]/pdf` | LinhaProposta (congelada) |

---

## 5. O que sai do mapa atual

- **`app/page.tsx` (página única de produção)**: decomposta nas abas de
  `/orcamento/[id]`. Não sobrevive como uma página só.
- **`app/configuracoes/engenharia`** (editor de fórmulas do V1): **removida** —
  sem equivalente no modelo V3/placa (não há fórmula editável a expor).
- **`app/api/calcular`, `app/api/templates`** (V1): removidas/reconstruídas
  (ver plano de remoção no Backlog).
