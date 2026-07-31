# 07 — Onboarding e Estratégia de Preços

O maior risco de adoção não é aprender o sistema — é o usuário abrir a plataforma e
perceber que precisa cadastrar centenas de itens antes do primeiro orçamento
(o "Problema do Copo Vazio" / cold start). Estratégia em **3 níveis**.

## Nível 1 — Biblioteca pronta (padrão)

A conta nasce com um catálogo de referência pré-carregado:

- **MDF:** Duratex, Arauco, Guararapes, Berneck — espessuras 6 / 15 / 18 mm, cores
  mais vendidas (Branco TX, cinzas, amadeirados).
- **Ferragens:** Blum, FGVTN, Häfele — corrediças, dobradiças, puxadores, pistões,
  cabideiros.
- **Insumos:** fitas de borda, parafusos, cavilhas.

Preços marcados como `referencia = true`, com aviso discreto na UI:

> *Valores de referência. Ajuste conforme seus fornecedores.*

O usuário consegue gerar o primeiro orçamento **minutos após criar a conta**.

## Nível 2 — Wizard de ajuste rápido (primeira utilização, ~2 min)

1. **Fornecedor principal de MDF:** Duratex / Arauco / Guararapes / Berneck.
2. **Região:** SP, MG, PR, SC, RS… (ajusta a base de preços de referência regional).
3. **Margem média:** 30 / 35 / 40 / 45%.
4. **Perda de MDF:** 10 / 12 / 15%.
5. Parâmetros de fábrica essenciais: espessura de caixa, tipo de fundo, folga de porta.

Saída: `parametros_fabrica` + fornecedor padrão preenchidos.

## Nível 3 — Tabela própria (uso contínuo)

Qualquer preço pode ser sobrescrito pontualmente:

```
Duratex Branco TX 18 mm
Preço de referência: R$ 315   →   Meu fornecedor: R$ 298
```

O override cria um registro de `preco` do tenant (com `referencia = false`) que passa
a ter prioridade sobre o preço de referência.

## Modelagem: Catálogo → Fornecedor → Preço

Em vez de `Produto → Preço`, a cadeia completa:

```
catalogo_item (MDF Branco TX 18)
   ├── Fornecedor A → R$ 285 · prazo 5d · frete X · cidade Y
   ├── Fornecedor B → R$ 298 · prazo 2d
   └── Fornecedor C → R$ 312 · prazo 1d
```

Regras de resolução de preço em um orçamento:

1. Fornecedor **escolhido no orçamento** (se houver), senão
2. Fornecedor **padrão do tenant** para aquele tipo de item, senão
3. **Preço de referência** regional do sistema.

Benefícios habilitados por essa modelagem:

- Cotador automático futuro ("qual fornecedor está mais barato esta semana").
- Comparação de custo do mesmo orçamento entre fornecedores.
- Catálogo com atualização de preços por fornecedores (Fase 3).
- Preços congelados por snapshot de versão (doc 05) — trocar tabela não altera
  orçamentos emitidos.

## Visão de Produto: ERP Comercial para Marcenarias

O sistema não é um "calculador de orçamento" — o motor de orçamento é o **núcleo** de
uma plataforma que cresce em módulos conectados a ele:

```
Motor de Orçamento (núcleo)
 ├── CRM de clientes            ├── Ordens de produção
 ├── Gestão de fornecedores     ├── Lista de corte
 ├── Tabelas de materiais       ├── Compras
 ├── Biblioteca de módulos      ├── Controle financeiro
 ├── Propostas + aprovação      ├── Integração CNC
 └── Dashboard de lucratividade └── Integração SketchUp/Dinabox
```

O MVP lança apenas o núcleo, mas a modelagem de dados (tenant, catálogo, fornecedor,
versões, auditoria) já suporta essa expansão sem reescrever os fundamentos.
