# 04 — Motor Paramétrico de Engenharia

O coração do sistema. Substitui o desenho (SketchUp) por **fórmulas**: cada tipo de
móvel possui uma engenharia previamente cadastrada que "explode" o móvel em peças.

## Decisão de Arquitetura: Engine em 3 Camadas

**No MVP as fórmulas NÃO são editáveis pelo usuário.** Criar um editor de fórmulas
significaria desenvolver uma DSL própria (validação, versionamento, dependências,
testes) antes de validar o produto. Em vez disso:

### Camada 1 — Templates de Engenharia (fixos no MVP)

Cada tipo de módulo possui um template JSON com componentes e fórmulas
(ver [`engine/templates/SCHEMA.md`](../engine/templates/SCHEMA.md)). Exemplo conceitual:

```
Guarda-Roupa → Laterais, Tampo, Base, Fundo, Divisórias, Prateleiras, Portas, Gavetas
Lateral: quantidade=2, largura=PROFUNDIDADE, altura=ALTURA
Tampo:   quantidade=1, comprimento=LARGURA, profundidade=PROFUNDIDADE
```

Os templates vivem no repositório (`engine/templates/*.json`), são versionados e
carregados no banco (`modulo_template`) via seed/migração.

### Camada 2 — Parâmetros Configuráveis (por marcenaria)

O usuário altera apenas **variáveis de fabricação**, nunca as fórmulas:

| Parâmetro | Opções |
|---|---|
| Espessura da caixa | 15 mm / 18 mm |
| Espessura da frente | 15 mm / 18 mm |
| Espessura do fundo | 6 mm / 15 mm |
| Tipo de fundo | Sobreposto / Em rasgo |
| Folga da porta | 2 / 3 / 4 mm |
| Perda de MDF | 10% / 12% / 15% (livre) |
| Dobradiças por porta | Automático (por altura) ou manual |

Isso atende ~90% das diferenças construtivas entre marcenarias sem abrir as fórmulas.

### Camada 3 — Motor de Cálculo (função pura)

```
(tipo do móvel + medidas + parâmetros) → gera peças → agrupa materiais
  → calcula chapas → calcula ferragens → calcula custos → preço de venda
```

## Biblioteca de MÓDULOS (não de ambientes)

O ambiente é apenas um **agrupador** de módulos reutilizáveis:

```
Biblioteca
├── BASE_PORTAS      (módulo inferior com portas)
├── GAVETEIRO
├── AEREO_PORTAS     (módulo superior)
├── TORRE_QUENTE     (paneleiro / torre)
├── CANTO_RETO       (canto em L)
├── NICHO
└── (V1.1+: cristaleira, painel, guarda-roupa, closet, gabinete, espelheira…)
```

Uma cozinha vira: `Base 800 + Gaveteiro 450 + Base 800 + Torre Quente + Aéreo 800 + …`
O mesmo `BASE_PORTAS` serve para cozinha, lavanderia, banheiro, área gourmet e
escritório — a engenharia é escrita **uma única vez**.

**Ambiente prioritário para calibrar a biblioteca: Cozinha** — é o cenário mais
complexo (inferiores, superiores, torre, gavetas, basculantes, cantos, tampos,
rodapés, recortes de cuba/cooktop, várias espessuras). Se a engine resolve cozinha,
banheiro/lavanderia/guarda-roupa são subconjuntos.

## Pipeline de Execução do Motor

```
[Lista de Módulos do Ambiente]
      │
      ▼
┌── 1. RESOLUÇÃO DE CONTEXTO ─────────────────────────────────────────┐
│ Para cada módulo instanciado:                                       │
│  a. Busca o template (código + versão) na biblioteca                │
│  b. Injeta medidas do usuário (LARGURA, ALTURA, PROFUNDIDADE, config)│
│  c. Resolve parâmetros PARAM_* (fábrica → ambiente → módulo)        │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌── 2. VALIDAÇÃO FÍSICA ──────────────────────────────────────────────┐
│  - Medidas dentro dos limites do template (min/max)                 │
│  - Regras de sanidade (ex.: porta > 900 mm de altura exige 3ª        │
│    dobradiça; gaveta mais larga que a corrediça suporta → erro)     │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌── 3. EXPLOSÃO DE PEÇAS (BOM atômica, por módulo) ───────────────────┐
│  - Avalia as fórmulas de cada componente com interpretador           │
│    matemático seguro (sem eval)                                     │
│  - Saída por peça: dimensões, material resolvido (herança em         │
│    cascata), metros de fita por borda, ferragens e parafusos        │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌── 4. ETAPA GLOBAL (elementos contínuos do ambiente) ────────────────┐
│  - Agrega módulos vizinhos da mesma tipologia por parede            │
│  - Tampo contínuo:  L_total = Σ L_módulos_inferiores                │
│  - Rodapé contínuo: L_total − (2 × recuo_lateral_padrão)            │
│  - Evita 3 tampos/rodapés picados quando o marceneiro quer 1 peça   │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌── 5. CONSOLIDAÇÃO DE INSUMOS ───────────────────────────────────────┐
│  - Soma áreas de MDF por (cor × espessura)                          │
│  - Aplica perda configurada e converte em chapas comerciais         │
│  - Soma metros de fita por (cor × largura)                          │
│  - Conta ferragens, acessórios, parafusos                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
                 [Motor de Custos & Margem — doc 05]
```

## Exemplo de Explosão

Entrada: `Guarda-roupa — 3,00 m largura × 2,60 m altura × 0,60 m profundidade`

Saída do motor (ilustrativa):

| Item | Quantidade |
|---|---|
| Portas | 12 |
| Gavetas | 8 |
| Prateleiras | 18 |
| Chapas MDF | 5 |
| Fita de borda | 160 m |
| Dobradiças | 32 |
| Corrediças | 8 pares |

## Regras Automáticas (heurísticas embutidas nos templates)

- **Dobradiças por porta:** 2 até 900 mm de altura; 3 até 1600 mm; 4 até 2100 mm; 5
  acima (configurável em `parametros_fabrica`).
- **Prateleiras:** máximo de vão livre de 900 mm sem reforço; acima disso o template
  adiciona divisória.
- **Corrediças:** comprimento = maior medida comercial ≤ (profundidade do módulo − 10 mm).
- **Fundo em rasgo:** desconta a profundidade útil em `PARAM_PROFUNDIDADE_RASGO`.

## Validações da IA de Engenharia (Fase futura, mas com base no MVP)

O motor já emite **warnings estruturados** que a futura IA usará:
poucas dobradiças, MDF insuficiente, gaveta incompatível com corrediça, vão excessivo.
No MVP esses warnings aparecem na UI como alertas.

## Contrato do Motor (API interna)

```ts
type EngineInput = {
  ambiente: { tipo: string; medidas: Medidas };
  modulos: ModuloInstanciado[];       // template + L/H/P + config + overrides
  parametros: ParametrosFabrica;      // camada 2 resolvida
};

type EngineOutput = {
  porModulo: { moduloId: string; pecas: Peca[]; ferragens: ItemQtd[]; fitasM: FitaQtd[] }[];
  globais: { tampos: PecaLinear[]; rodapes: PecaLinear[] };
  consolidado: {
    mdf: { cor: string; espessuraMm: number; areaM2: number; chapas: number }[];
    fitas: { cor: string; larguraMm: number; metros: number }[];
    ferragens: ItemQtd[];
    parafusos: ItemQtd[];
  };
  warnings: EngineWarning[];
};
```

O motor é determinístico: mesma entrada ⇒ mesma saída. Isso é a base do pipeline de
testes (doc 09).
