# 12 — Fase 3: Laboratório de Engenharia × Linha de Produção (backlog)

> Anotado para implementar **depois** de fechar as 3 implementações em curso
> (plugar o box no orçamento → paredes 90º com obstáculos → persistência Prisma).
> Conceitos do material de referência traduzidos para a stack TypeScript/Next.js/Canvas.

Ideia central: separar **Definição de Catálogo** (o editor `/modulo` = "Laboratório",
onde se calibra a física do móvel e valida o plano de corte) da **Instanciação
Comercial** (a página principal = "Produção", onde o vendedor escolhe o gabarito,
ajusta medidas/cores/tamponamento e arruma os módulos na parede).

## Novo modelo mental (gabarito × instância)

```
[Categoria/Biblioteca] ──< [Módulo Gabarito (template salvo)]
                                   │  (instanciação na parede)
                                   ▼
                          [Módulo Instanciado]
                            ├─ medidas (L,H,P)
                            ├─ cores/espessura (caixa, frentes)
                            ├─ tamponamento (lados ativos, espessura, material)
                            └─ posição linear na parede (índice do array)
```

- **`Categoria`**: id + nome (Cozinha, Banheiro, Quarto, Área Gourmet…).
- **`ModuloGabarito`**: o `BoxModule` salvo + `categorias: string[]` (multi-select).
- **`ModuloInstanciado`**: referência ao gabarito + overrides comerciais (dims, cores,
  espessuras, `temFundo`, tamponamento por lado, `paredeId`, índice de posição).

## Etapa 1 — Laboratório + Plano de Corte gráfico ✅ concluída

- `lib/engine/box/cutting.ts`: `empacotarChapas` (shelf-first bin packing, com
  giro de peça quando necessário para caber, e detecção de peças maiores que a
  chapa em qualquer orientação) + `planoDeCorte` (agrupa por cor×espessura e
  empacota cada grupo). 7 testes golden (sem sobreposição, dentro dos limites,
  rotação, múltiplas chapas, aproveitamento).
- `PlanoCorteCanvas`: desenha cada chapa 2750×1840mm em escala 1:10, com o
  aproveitamento (%) abaixo.
- `/modulo` ganhou duas seções novas: **"Peças (lista técnica)"** (nome,
  material, qtd, dimensões — **sem preço**) e **"Plano de corte"** (uma chapa
  por grupo cor×espessura, com aviso para peças que não cabem).
- A seção "Custo ao vivo" (comercial) permanece na mesma página por ora — a
  separação completa em duas áreas/rotas fica para quando a Etapa 3
  (instanciação) definir melhor o que é "laboratório" vs. "produção".

## Etapa 2 — Cadastro de Bibliotecas (Categorias) ✅ concluída (versão enxuta)

- `lib/categorias.ts`: lista padrão (Cozinha, Quarto, Sala, Banheiro, Lavanderia,
  Closet, Home Office, Área Gourmet) + `adicionarCategoria` persistida no localStorage.
- **Categoria única por preset** (não multi-select) — decisão simplificadora: no fluxo
  Ambiente → Tipo → Modelo o usuário escolhe um ambiente por vez; um preset pode ser
  duplicado e salvo noutra categoria se precisar aparecer em mais de uma. Multi-select
  fica para se a necessidade real aparecer.
- `/modulo`: campo "Categoria/ambiente" (select + "+ nova categoria" inline) no card de
  Presets; obrigatório ao salvar.
- Não construída uma aba CRUD dedicada em Configurações — a criação de categoria
  acontece inline no fluxo de salvar preset, que é onde ela é necessária.

## Etapa 3 — Instanciação simplificada na Produção ✅ concluída

- **`+ Novo módulo`** na coluna esquerda (card "Módulos", acima da lista) abre o
  assistente `NovoModuloWizard`: **Ambiente → Tipo → Modelo**, com as opções lidas
  dinamicamente dos presets salvos (só aparecem tipos/modelos que de fato existem
  naquele ambiente). Escolher o modelo já instancia o item na lista unificada.
- Ao instanciar, o `BoxModuloCard` expõe os overrides de instância: dimensões (L/H/P),
  **cor/espessura interna**, e o **tamponamento** (`TamponamentoConfig`): toggle por
  lado (esquerdo/direito/superior/inferior), inteiriça ou sarrafo, cor e espessura.
  O gabarito salvo no editor não é alterado — apenas a cópia instanciada.
- Preview ao vivo: `BoxCanvas` (mesmo componente do laboratório) embutido no card,
  em modo somente-leitura.
- O toolbar antigo ("+ Adicionar módulo (template)" direto e o select "+ Adicionar
  caixa (preset)") foi removido — o assistente é agora o único caminho de entrada.
  O botão "Recarregar preset Cozinha em L" permanece como demonstração do motor de
  templates legado.
- Presets padrão (seed) carregados no primeiro uso (`seedPresetsPadrao`, 6 módulos em
  Cozinha/Quarto) para o assistente já ter conteúdo sem exigir que o usuário construa
  tudo do zero no laboratório antes do primeiro orçamento.

## Etapa 4 — Organizador linear (mover & trocar)

- No `LayoutVisualizer`, identificar o módulo clicado e mostrar setas
  **[Mover Esquerda] / [Mover Direita]**.
- Ação = *swap* de índices no array de módulos daquela parede; Canvas redesenha.
- **Cota de início** por parede (ex.: inferiores começam a 150 mm da quina por causa de
  uma coluna) → offset do primeiro módulo do array.
- Critério: clicar num aéreo, "Mover para a Direita" e ver a troca no Canvas.

## Decisão resolvida — comportamento do tamponamento

**Decisão: (A) placa colada por fora, soma à largura de instalação.** O módulo mantém a
largura de fabricação (`box.largura`); o tamponamento é um painel externo que soma sua
espessura à largura de instalação nos lados esquerdo/direito ativos.

- `lib/engine/box/types.ts`: `TamponamentoInstancia` (campo de instância, distinto do
  `BayContent` "tamponamento" que é estrutural/gabarito) + `larguraInstalacaoBox(box)`
  somando a espessura dos lados ativos.
- `lib/engine/box/explode.ts`: `gerarTamponamentoInstancia` gera os painéis (inteiriça
  ou quadro de sarrafos) sem alterar nenhuma peça da carcaça — confirmado por teste
  (`comNomesCarcaca` idêntico ao caso sem tamponamento).
- `lib/orcamento.ts`: `larguraDoItem` usa `larguraInstalacaoBox` para módulos-caixa, o
  que propaga corretamente para a barra/Canvas de ocupação da parede.
- Verificado via Playwright: guarda-roupa 900mm + tamponamento direito 18mm →
  "Largura de instalação: 918mm" exibido corretamente na UI.

## Etapa 4 — Organizador linear (mover & trocar) — pendente

- No `LayoutVisualizer`, identificar o módulo clicado e mostrar setas
  **[Mover Esquerda] / [Mover Direita]**.
- Ação = *swap* de índices no array de módulos daquela parede; Canvas redesenha.
- **Cota de início** por parede (ex.: inferiores começam a 150 mm da quina por causa de
  uma coluna) → offset do primeiro módulo do array.
- Critério: clicar num aéreo, "Mover para a Direita" e ver a troca no Canvas.

## Status

1. ~~Etapa 1 (plano de corte)~~ ✅
2. ~~Etapa 2 (categorias)~~ ✅ (versão enxuta: categoria única, sem aba CRUD dedicada)
3. ~~Etapa 3 (instanciação + tamponamento)~~ ✅
4. Etapa 4 (organizador linear) — próxima
