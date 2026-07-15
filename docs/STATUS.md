# Status Atual, Decisões, Pendências e Próximos Passos

> Atualizado em 2026-07-15. Este arquivo é o ponto de partida de qualquer sessão
> nova — leia antes de assumir o que já existe. Complementa `docs/PRD-PIPELINE.md`
> (visão de produto) com o estado real do código.

## 1. Onde estamos agora (resumo de uma linha)

O motor de caixa (V3) e o fluxo Laboratório × Produção (Fase 3) estão
funcionalmente completos e testados, mas a **UI do card de configuração do módulo
na tela principal não está boa** — é o problema em aberto agora. Decisão do
usuário: parar de mexer em como o módulo aparece na tela principal e primeiro
resolver a tela de configuração do módulo.

## 2. O que está construído e funcionando

### Motor de cálculo
- Motor de templates V1 (`lib/engine/*`): parser de fórmulas, explosão de peças,
  consolidação, custos/margem. 17 testes.
- Motor de caixa V3 (`lib/engine/box/*`): `types.ts` (modelo de dados),
  `explode.ts` (caixa+vãos → peças), `tree.ts` (operações puras na árvore +
  layout geométrico), `cutting.ts` (plano de corte, bin packing), `migrate.ts`
  (migração de dados antigos salvos no navegador). 20+9+7 testes.
- `lib/orcamento.ts`: unifica os dois motores num único array
  `ModuloOrcamento[]` via discriminated union (`origem: "template" | "custom_box"`)
  com funções de acesso puras (`idDoItem`, `larguraDoItem`, etc.) — elimina a
  duplicação de lista que existia antes ("Frankenstein").

### Laboratório (`/modulo`)
- Editor completo: monta caixa vazia, divide vãos (vertical/horizontal, N
  divisórias), define conteúdo por vão-folha (frente vazio/portas/gaveta +
  prateleiras + fundo independentes), salva como preset numa categoria.
- Custo ao vivo, lista técnica de peças, plano de corte visual (Canvas 2D, escala
  1:10, uma chapa por grupo cor×espessura).
- CRUD de presets (aplicar/excluir) — "o editor é a fonte da verdade".

### Produção (página principal `/`)
- Assistente **Ambiente → Tipo → Modelo** (`NovoModuloWizard`) lê presets salvos
  dinamicamente — único caminho de entrada para novos módulos-caixa.
- `BoxModuloCard`: overrides de instância sem alterar o gabarito — dimensões
  (L/H/P), cor/espessura interna, tamponamento por lado (`TamponamentoConfig`,
  4 mini-formulários independentes), override rápido de cor/espessura das portas
  e de "tem fundo", tudo atrás de um botão colapsável **"Outras configurações"**.
- `BoxCanvas`: mesmo componente usado no laboratório e na produção, com um modo
  `comercial` (visual limpo — linhas finas + marcas de puxador, sem bordas
  técnicas/rótulos) para os cards da produção, vs. o modo laboratório (bordas +
  rótulo + clique para selecionar vão).
- Card colapsável: botão "Salvar" reduz para `ResumoModulo` (preview + dados-chave);
  "Editar" reabre. Aplica-se aos dois tipos de módulo.
- Plano de corte do **orçamento inteiro** (todos os módulos agregados), além do
  plano por módulo que já existia no laboratório.
- Categorias (`lib/categorias.ts`): 8 categorias padrão + criação inline no
  laboratório ao salvar preset (sem tela de CRUD dedicada — decisão consciente de
  simplificação).

### Correções de bugs reais (não cosméticos) já resolvidas
1. **Travessa do módulo `inferior`**: estava sendo tratada como peça "de pé" (70mm
   de profundidade viravam altura visível), comendo 55mm do vão útil de
   portas/gavetas. Corrigido no motor (`explode.ts`) numa sessão anterior, mas o
   fix **não tinha sido replicado no `BoxCanvas.tsx`** apesar da mensagem do commit
   afirmar isso — bug persistiu visualmente até esta sessão. Corrigido agora nos
   dois lugares e verificado ao vivo (o vão selecionado no laboratório preenche
   quase toda a caixa, sem sobra de 70mm no topo).
2. Prateleiras/fundo não podiam coexistir com portas no mesmo vão sem dividir a
   caixa — corrigido tornando `frente`/`prateleiras`/`fundo` atributos
   independentes de `BayContent`.
3. Tamponamento de instância era uma config única para todos os lados ativos —
   corrigido para 4 configs independentes (um lado em sarrafo/Madeirado, outro
   inteiriço/Branco, por exemplo).
4. Overrides rápidos de portas e fundo direto no card (sem reabrir o editor).
5. Preview do Canvas não tinha feedback de cor dinâmico — corrigido (recolore ao
   vivo, inclusive tiras de tamponamento por lado).
6. Card sem opção de colapsar/organizar a tela quando há muitos módulos —
   resolvido com Salvar/Editar.

## 3. Decisões tomadas (não reabrir sem motivo novo)

- **Tamponamento soma à largura de instalação** (não altera a carcaça pronta) —
  decisão explícita do usuário, resposta "Soma à largura (Recomendado)".
- **Categoria única por preset** (não multi-select) — simplificação consciente;
  duplicar o preset resolve o caso de precisar em duas categorias.
- **Motor de caixa não substitui o motor de templates** (por ora) — convivem via
  `ModuloOrcamento`. Não há decisão de deprecar o motor de templates.
- **O laboratório é a fonte da verdade da engenharia** — a produção só faz
  overrides comerciais de instância, nunca edita a estrutura interna de vãos.

## 4. Lacuna importante vs. o PRD original

O orçamento montado na tela principal **não é persistido em banco** — é
`useState` puro em `app/page.tsx`, sem chamada a `/api/orcamentos`. Só os
gabaritos/presets do laboratório são salvos (em `localStorage`, não no Prisma).
Recarregar a página perde o orçamento em edição. O backend de auth/clientes/
orçamentos (Prisma + rotas `/api/*`) existe mas não está conectado a este fluxo.
Isso não bloqueia o trabalho de UX/engenharia em andamento, mas é uma pendência
real de RF-002/RF-009 do PRD original quando chegar a hora.

## 5. Pendência em aberto agora (prioridade atual)

**A tela de configuração do módulo não está boa** (feedback do usuário: "não está
ficando bom"). Antes de mexer em como o módulo aparece na tela principal
(produção), o trabalho agora é **redesenhar a tela/fluxo de configuração do
módulo**. Ainda não há um diagnóstico específico do que exatamente está errado —
próximo passo é levantar isso com o usuário (o quê especificamente incomoda: o
laboratório `/modulo`? o card na produção? os dois?) antes de propor solução.

Combinado com o usuário: **primeiro** fechar a tela de configuração, **depois**
voltar para como isso é exibido na tela principal.

## 6. Próximos passos

1. Entender com o usuário o que exatamente não está bom na configuração do
   módulo — não presumir e sair implementando.
2. Redesenhar a tela/fluxo de configuração a partir desse diagnóstico.
3. Só depois disso, retomar a exibição/organização dos módulos na tela principal.
4. Etapa 4 da Fase 3, ainda pendente e não relacionada ao item acima: organizador
   linear (mover módulo esquerda/direita na parede) no `LayoutVisualizer`.
5. Registrado como lacuna (item 4 acima), sem prazo definido: persistência real do
   orçamento (ligar a tela principal a `/api/orcamentos` via Prisma).
