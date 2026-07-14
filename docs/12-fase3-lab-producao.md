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

## Etapa 2 — Cadastro de Bibliotecas (Categorias)

- Aba "Bibliotecas" nas configurações (CRUD simples, localStorage → Prisma).
- No editor de módulo, multi-select para vincular o gabarito a 1+ categorias.
- Critério: criar "Área Gourmet" e associar um balcão a ela.

## Etapa 3 — Instanciação simplificada na Produção

- "Adicionar módulo" → primeiro **filtra por categoria/biblioteca**.
- Formulário de **instância** (não mexe no gabarito): dimensões, cor/espessura da caixa,
  toggle de fundo e **seletor de tamponamento** (esquerdo/direito/superior/inferior).
- O motor calcula pelo gabarito **injetando os overrides** da instância.
- Critério: adicionar "Balcão Standard" e mudar só a cor externa para "Madeirado" sem
  alterar o gabarito.

## Etapa 4 — Organizador linear (mover & trocar)

- No `LayoutVisualizer`, identificar o módulo clicado e mostrar setas
  **[Mover Esquerda] / [Mover Direita]**.
- Ação = *swap* de índices no array de módulos daquela parede; Canvas redesenha.
- **Cota de início** por parede (ex.: inferiores começam a 150 mm da quina por causa de
  uma coluna) → offset do primeiro módulo do array.
- Critério: clicar num aéreo, "Mover para a Direita" e ver a troca no Canvas.

## Decisão em aberto — comportamento do tamponamento

Quando o usuário ativa o tamponamento (ex.: lado direito, 25 mm, amadeirado), o painel:

- **(A)** é uma **placa colada por fora** da carcaça → **soma** à largura total de
  instalação (móvel fica 25 mm mais largo); ou
- **(B)** **"engole" a lateral** existente → mantém a largura externa idêntica (a lateral
  da carcaça é substituída/recuada pelo tamponamento).

> Definir antes de implementar a Etapa 3. Hoje o box trata tamponamento como painel de
> `profundidade + 25 mm` (comportamento tipo A na profundidade); a regra de **largura**
> precisa desta decisão. Perguntar ao usuário na hora.

## Ordem sugerida

1. Etapa 1 (plano de corte) — isolada, alto valor de validação.
2. Etapa 2 (categorias) — destrava o filtro da Produção.
3. Etapa 3 (instanciação + tamponamento) — depende da decisão A/B acima.
4. Etapa 4 (organizador linear) — puramente de UX sobre o array de parede.
