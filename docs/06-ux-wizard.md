# 06 — UX: Wizard Inteligente de Orçamento

Objetivo: ser **mais rápido que abrir o SketchUp**. Nem lista totalmente manual, nem
editor visual — um wizard guiado com sugestão automática e uma barra linear de
ocupação da parede. Sem canvas, sem drag-and-drop no MVP (CSS/HTML básico).

## Fluxo Principal

```
Novo orçamento → Selecionar cliente → Adicionar ambiente → Informar medidas
 → Perguntas rápidas → Sugestão automática de módulos → Editar módulos
 → Motor calcula → Visualizar custos → Aplicar margem → Gerar proposta → PDF
```

## As 6 Etapas do Wizard

### Etapa 1 — Dados do ambiente

Tipo (Cozinha, Dormitório…), medidas das paredes (A: 3,20 m, B: 2,10 m), altura
(2,70 m), formato (reta / em L / em U), aberturas (janelas, portas), obstáculos
(pilares, vigas).

### Etapa 2 — Perguntas rápidas (checkboxes)

```
☑ Possui armários inferiores      ☑ Possui armários superiores
☑ Possui torre quente             ☐ Possui ilha
☐ Possui cristaleira
```

### Etapa 3 — Sugestão automática (motor de heurísticas)

Regras estáticas simples (sem IA no MVP). Exemplo para parede A = 3200 mm em L:

1. Reservar 650 mm para o módulo de canto.
2. Espaço útil restante: 2550 mm.
3. Inserir por padrão: `Pia Base 1200` + `Gaveteiro 450` + `Porta Pano 200` + `Base 700`.

O usuário **edita uma sugestão**, nunca começa do zero.

### Etapa 4 — Editor de módulos (lista interativa)

Cada módulo em um card com: largura / altura / profundidade, nº de portas/gavetas,
material (herdado, com override), ferragem, e ações **Editar · Duplicar · Excluir**.

**Duplicar é recurso essencial:** cozinhas têm muita repetição
(`Base 800 → duplicar → duplicar → ajustar largura`).

### Etapa 5 — Barra linear de ocupação da parede

```
Parede A (3,20 m)
[  Base Pia 1200  ][ Gaveteiro 450 ][ Base 800 ][ Canto L 650 ]  Total: 3100 mm
[██████████████████████████████████████████████████████░░░░]     Sobra: 100 mm ✓
```

Cálculo no frontend:

```
EspaçoLivre = L_parede − ( Σ L_módulos + DescontoDeCanto )
```

- `EspaçoLivre ≥ 0` → barra verde com sobra indicada.
- `EspaçoLivre < 0` → barra vermelha piscando: incompatibilidade física **antes** de
  gerar o orçamento.
- Uma barra por parede e por tipologia (inferiores e superiores separados).

Entrega o mesmo valor de um 3D ("o móvel cabe?") com custo de implementação mínimo.

### Etapa 6 — Resumo e simulação

```
Inferiores: 2,25 m   Superiores: 1,60 m   Torres: 1
Área MDF: 18,3 m²    Chapas: 5            Ferragens: …
[Slider de margem] ──▶ Preço final em tempo real
```

Warnings do motor (doc 04) aparecem aqui como alertas acionáveis.

## Herança de Materiais na UI

- **Configurações da conta:** padrão da fábrica (nível 1).
- **Cabeçalho do ambiente:** "Caixas: Branco TX 15 mm · Frentes: Louro Freijó 18 mm"
  (nível 2, sobrescreve o 1).
- **Card do módulo:** badge "material customizado" quando houver override (nível 3).

## Roadmap de Interface

| Versão | Interface |
|---|---|
| **V1 (MVP)** | Wizard + lista de módulos + barra linear de ocupação |
| **V2** | Arrastar e soltar módulos em planta linear 2D |
| **V3** | Composição automática por IA a partir das dimensões do ambiente |

A arquitetura do motor não muda entre versões — só a forma de montar a lista de
módulos.
