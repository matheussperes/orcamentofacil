# 05 — Pipeline Financeiro (Custos, Markup e Simulador)

Recebe o consolidado de insumos do motor de engenharia (doc 04) e produz o preço de
venda e os indicadores de lucro.

## Passo 1 — Área Requerida de MDF (com perda)

Para cada combinação (cor × espessura):

```
AreaRequerida = Σ(altura_peça × largura_peça) × (1 + perda_mdf)
```

`perda_mdf` é o fator de desperdício de chapa configurado pelo tenant (ex.: 0,12).

## Passo 2 — Conversão em Chapas Comerciais

Chapa padrão 2750 × 1840 mm = 5,06 m²:

```
QtdChapas = teto( AreaRequerida / 5,06 )
```

O arredondamento é **por cor × espessura** (não se mistura Branco TX 15 mm com Louro
Freijó 18 mm na mesma chapa).

## Passo 3 — Custo Direto (Cd)

```
Cd = Σ(QtdChapas × PreçoChapa)
   + Σ(MetrosFita × PreçoMetro)
   + Σ(Ferragens × PreçoUnitário)
   + Σ(Acessórios × PreçoUnitário)
   + Vidros/Espelhos (por m²)
   + Montagem (tabela: R$/m² ou % sobre material)
   + Usinagem / Pintura / Terceiros
   + Frete (tabela por região/km)
```

Os preços vêm da cadeia **Catálogo → Fornecedor → Preço** (doc 07), usando o
fornecedor padrão do tenant ou o escolhido no orçamento.

## Passo 4 — Preço de Venda (Markup Divisor)

Custos indiretos percentuais (impostos, comissão) e a margem entram como divisor, para
que a margem incida sobre o **preço de venda**, não sobre o custo:

```
PreçoFinal = (Cd + CustosFixosIndiretos) / (1 − (%Margem + %Impostos + %Comissão))
```

**Validação obrigatória:** `%Margem + %Impostos + %Comissão < 1`, com trava de
segurança (ex.: soma máxima 0,85) para evitar divisão explosiva.

### Indicadores derivados

```
LucroBruto   = PreçoFinal × %Margem
Margem%      = LucroBruto / PreçoFinal
```

## Passo 5 — Simulador de Margem (tempo real)

```
[Slider de %Margem] ──▶ recalcula PreçoFinal ──▶ atualiza Lucro e Margem%
```

- Roda **inteiramente no cliente**: `Cd` e custos indiretos já estão no estado do
  React após o cálculo da engenharia. Mover o slider é só reaplicar a fórmula do
  Passo 4 — nenhuma chamada ao backend, resposta instantânea.
- **Margens configuradas por tenant:** padrão, mínima, desejada, premium.
- **Desconto:** aplicado sobre o `PreçoFinal`; o sistema recalcula a margem efetiva e
  **bloqueia** (ou exige aprovação de admin) se ficar abaixo da margem mínima (RF-006).
- Vendedor não visualiza `Cd` detalhado (RBAC) — apenas preço, lucro permitido e faixa
  de desconto.

## Persistência do Resultado

Ao salvar/enviar o orçamento, grava-se um snapshot em `orcamento_versao`:

```json
{
  "entrada": { "ambientes": [...], "parametros": {...} },
  "bom": { "consolidado": {...} },
  "custos": { "cd": 18432.10, "indiretos": {...} },
  "comercial": { "margem": 0.35, "impostos": 0.08, "comissao": 0.03,
                 "desconto": 0.05, "precoFinal": 34120.00 },
  "precos_utilizados": [ { "item": "...", "fornecedor": "...", "valor": 0 } ]
}
```

Os **preços utilizados são congelados** no snapshot: alterações futuras de tabela não
mudam orçamentos já emitidos (reprodutibilidade + histórico).

## Saídas para o Dashboard

Cada versão alimenta os indicadores: valor vendido, valor em negociação, taxa de
conversão, ticket médio, lucro médio e margem média.
