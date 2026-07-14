# 03 — Modelo de Dados

## Visão Geral (Schema Relacional)

```
┌──────────┐      ┌───────────┐      ┌───────────┐      ┌────────────────────┐
│ Cliente  │ ──<  │ Orçamento │ ──<  │ Ambiente  │ ──<  │ Módulo Instanciado │
└──────────┘      └───────────┘      └───────────┘      └────────────────────┘
                        │                                        │
                        ▼                                        ▼
                 ┌────────────┐                        ┌─────────────────┐
                 │  Versão    │                        │ Módulo Template │
                 │ (snapshot) │                        │ (fórmulas JSON) │
                 └────────────┘                        └─────────────────┘
                                                                 ▲
┌──────────────────────┐      ┌───────────────┐                  │
│ Parâmetros de Fábrica│      │   Catálogo    │ ──< Fornecedor ──< Preço
│ (por tenant)         │      │ (MDF/Ferragem)│
└──────────────────────┘      └───────────────┘
```

## Tabelas Principais

### `tenant`
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| nome, cnpj, logo_url | | |
| criado_em | timestamptz | |

### `usuario`
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid FK | |
| nome, email | | |
| papel | enum | `admin`, `projetista`, `vendedor`, `financeiro` |

### `cliente`
| Campo | Tipo |
|---|---|
| id, tenant_id | uuid |
| nome, telefone, email, endereco | text |
| origem, arquiteto, observacoes | text |
| status | enum (`lead`, `ativo`, `inativo`) |

### `orcamento`
| Campo | Tipo | Nota |
|---|---|---|
| id, tenant_id, cliente_id | uuid | |
| responsavel_id | uuid FK usuario | |
| data, validade, prazo_entrega | date | |
| forma_pagamento, observacoes | text | |
| desconto_pct | numeric | validado contra margem mínima |
| status | enum | `rascunho`, `enviado`, `negociacao`, `aprovado`, `perdido` |
| versao_atual | int | |

### `orcamento_versao`
Snapshot imutável de todo o orçamento (entrada + BOM + custos + preço) em JSONB, com
`autor_id`, `criado_em` e `motivo`. Suporta RF-009 (histórico e recuperação de versões)
e comparação entre versões.

### `ambiente`
| Campo | Tipo | Nota |
|---|---|---|
| id, orcamento_id | uuid | |
| nome, tipo | text/enum | cozinha, dormitório, closet, banheiro, lavanderia, home office, área gourmet… |
| observacoes | text | |
| medidas | jsonb | paredes (largura/altura/profundidade), pé direito, rodapé, forro, janelas, portas, pilares, vigas |
| materiais_padrao | jsonb | herança nível 2 (cor caixa, cor porta, espessuras) |
| fotos | via `upload` | |

### `modulo_template` (Biblioteca de Engenharia — global no MVP)
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| codigo | text unique | ex.: `BASE_PORTAS`, `GAVETEIRO`, `AEREO_PORTAS`, `TORRE_QUENTE`, `CANTO_RETO`, `NICHO` |
| nome, categoria | text | categoria: `inferior`, `superior`, `torre`, `complemento` |
| versao | int | regras de engenharia são versionadas (RNF) |
| formulas_json | jsonb | componentes, dimensões, fitas, ferragens (ver `engine/templates/SCHEMA.md`) |
| limites | jsonb | mín/máx de L, H, P para validação física |
| ativo | bool | |

> Um orçamento referencia `modulo_template.id + versao`. Alterar um template gera nova
> versão — orçamentos antigos continuam reproduzíveis.

### `modulo_instanciado`
| Campo | Tipo | Nota |
|---|---|---|
| id, ambiente_id | uuid | |
| template_id, template_versao | FK | |
| parede | text | `A`, `B`, `C`… para a barra linear de ocupação |
| posicao | int | ordem na parede |
| largura_mm, altura_mm, profundidade_mm | int | medidas customizadas |
| config | jsonb | nº de portas, gavetas, prateleiras, nichos, cabideiros, sapateiras, basculantes, vidros, espelhos, iluminação |
| overrides_material | jsonb | herança nível 3 (sobrescreve o ambiente) |
| resultado_bom | jsonb | cache da última explosão (peças, fitas, ferragens) |

### `parametros_fabrica` (por tenant — Camada 2 da engine)
| Campo | Exemplo |
|---|---|
| espessura_caixa_mm | 15 ou 18 |
| espessura_frente_mm | 18 |
| espessura_fundo_mm | 6 |
| tipo_fundo | `sobreposto` ou `rasgo` |
| folga_porta_mm | 2 / 3 / 4 |
| folga_superior_mm, folga_inferior_mm | 4 |
| perda_mdf_pct | 10 / 12 / 15 |
| dobradicas_por_porta | `auto` ou valor fixo |
| altura_max_porta_2_dobradicas_mm | 900 |
| recuo_rodape_mm | 50 |

### Catálogo e Preços (`catalogo_item`, `fornecedor`, `preco`)

```
catalogo_item (id, tenant_id NULL p/ base global, tipo, marca, modelo, descricao, atributos jsonb)
   tipo: mdf | fita | dobradica | corrediça | puxador | acessorio | parafuso | servico
   atributos: espessura, cor, dimensao_chapa, peso_suportado, comprimento, amortecimento…

fornecedor (id, tenant_id, nome, cidade, prazo_dias, frete_padrao)

preco (id, catalogo_item_id, fornecedor_id, valor, unidade, vigencia_inicio, referencia bool)
   referencia=true → preço médio pré-carregado pelo sistema (ver doc 07)
```

O tenant define o **fornecedor padrão** por tipo de item; um orçamento pode escolher
outro fornecedor pontualmente.

### Tabelas de custo comercial (por tenant)
`tabela_montagem` (R$/m² ou % do custo), `tabela_frete` (por região/km),
`tabela_comissao` (%), `tabela_imposto` (%), `margens` (padrão, mínima, desejada,
premium).

### `upload`
| Campo | Nota |
|---|---|
| id, tenant_id, orcamento_id?, ambiente_id? | vínculo flexível |
| tipo | foto_ambiente, croqui, pdf, dwg, render, sketchup, referencia |
| url, nome_arquivo, criado_por | |

### `auditoria`
`entidade`, `entidade_id`, `acao`, `diff jsonb`, `usuario_id`, `criado_em` — alimenta o
módulo Histórico ("todas as alterações, quem alterou, quando").

## Herança em Cascata de Materiais

Resolução de material de qualquer peça, na ordem:

1. **Nível 3 — Módulo** (`modulo_instanciado.overrides_material`) — ex.: "este gaveteiro
   usa MDF Branco 15 mm".
2. **Nível 2 — Ambiente** (`ambiente.materiais_padrao`) — ex.: "nesta cozinha, caixas em
   Cinza Sagrado 18 mm".
3. **Nível 1 — Fábrica** (`parametros_fabrica`) — padrão da marcenaria.

O primeiro nível que definir o atributo vence.

## Índices e Integridade

- Índices por `tenant_id` em todas as tabelas (preparação multiempresa).
- `orcamento_versao` é append-only (nunca sofre UPDATE/DELETE).
- FKs com `ON DELETE RESTRICT` para catálogo/fornecedor referenciados por orçamentos;
  exclusão lógica (`ativo=false`) em vez de física.
