# 10 — Ajustes da V2 (backlog anotado, rodar após as 3 etapas)

> **Nota de stack.** O material de referência destes ajustes veio descrito em
> **F# / Fable / Elmish / Feliz**. O projeto `orcamentofacil` é **TypeScript +
> Next.js + React**. Os conceitos abaixo estão **traduzidos para a nossa stack**
> (Canvas 2D nativo via `ref` + `useEffect`, tipos TS, estado React). O
> resultado funcional é o mesmo; nada de F# entra no repositório.

Estes itens **não** fazem parte das 3 etapas atuais (elementos contínuos, PDF,
persistência/auth). Ficam registrados para implementar depois que tudo estiver
finalizado, conforme combinado.

---

## V2-1 — Configuração de cor/material por módulo

Hoje a cor é herdada do ambiente (níveis 1–3, doc 03). A V2 expõe a escolha
**por módulo**, com partes independentes.

**Modelo (TS):**

```ts
interface MDFConfig { espessura: 6 | 15 | 18; acabamento: string; } // "Branco TX", "Madeirado"…
interface ConfiguracaoMaterialModulo {
  interno: MDFConfig;   // caixaria
  externo: MDFConfig;   // laterais/tampo aparentes
  portas: MDFConfig;    // frentes
  temFundo: boolean;    // toggle
}
```

- Cada módulo instanciado ganha `configMaterial?` que **sobrescreve** a herança.
- UI: dropdowns de acabamento+espessura para interno/externo/portas + toggle
  "Tem fundo".
- Engine: `espessuraDe`/`corDe` passam a ler `configMaterial` do módulo antes da
  herança de ambiente; `temFundo=false` remove as peças de fundo do template.

## V2-2 — Pré-visualização 2D do módulo (Canvas)

Mini-preview (~120×120px) acima do editor de cada módulo, desenhado em Canvas
2D nativo (sem biblioteca). Escala para caber na caixa, desenha caixaria
externa, base/tampo e linhas internas conforme nº de prateleiras/gavetas/portas.

```tsx
function ModuleMicroPreview({ modulo }: { modulo: ModuloUI }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, 120, 120);
    const escala = 100 / Math.max(modulo.largura_mm, modulo.altura_mm);
    // desenha retângulo externo + divisórias internas…
  }, [modulo]);
  return <canvas ref={ref} width={120} height={120} />;
}
```

## V2-3 — Aba de layout das paredes (Canvas)

Aba dedicada com seletor de vista: **Parede A · Parede B · Ambas · Planta baixa**.

```ts
type TipoVista = "ParedeA" | "ParedeB" | "Ambas" | "PlantaBaixa";
```

- **Elevação (A/B):** módulos lado a lado no eixo X por largura acumulada
  (`xAtual += largura*escala`), altura no eixo Y a partir da linha do chão.
  Cor de preenchimento vinda do acabamento externo do módulo.
- **Planta baixa:** largura no eixo X, **profundidade** no eixo Y (visto de
  cima); linha da parede ao fundo; arco opcional da porta abrindo.
- Canvas nativo redesenhado por `useEffect` com deps `[modulos, vistaAtiva]`.

## V2-4 — Configurador de engenharia dos módulos

Tela para o usuário **dizer ao sistema o que cada medida representa e como o
módulo é montado** (hoje isso vive fixo nos templates JSON — doc 04). É a ponte
para a "Engine Configurável" da V2 (doc 08).

- Editor visual das `RegraPeca` de um template: por peça, `tipo`,
  `qtdFormula`, `larguraFormula`, `alturaFormula`, `espessuraAlvo`
  (interno/externo/portas/fundo).
- Salva como o mesmo `formulas_json` já usado pela engine → **nenhuma mudança no
  motor**, só uma UI que edita os templates (respeitando versionamento, doc 03).
- Validação reaproveita `variaveisDaFormula` + `evalFormula` (já existentes).

## V2-5 — Saída unificada: pré-orçamento do fornecedor (BOM + custo)

Ao clicar em **Criar orçamento**, fundir "Composição do custo" e "Lista de
materiais" numa **única tabela**, no formato de nota de compra de insumos:

| Item / Insumo | Categoria | Qtd | Unidade | Custo unit. | Total |
|---|---|---|---|---|---|
| MDF Branco TX 15mm | Chapas | 3 | chapa | R$ 285 | R$ 855 |
| MDF Louro Freijó 18mm | Chapas | 1 | chapa | R$ 315 | R$ 315 |
| Corrediça (par) | Ferragem | 4 | par | R$ 45 | R$ 180 |
| … | | | | | Subtotal |

Depois da tabela, o slider de margem aplica o preço de venda. A base já existe
(`consolidado.mdf`, `consolidado.ferragens` + `pricing.ts`); é trabalho de
apresentação (juntar num único grid com custo unitário por linha).

> A proposta/PDF da etapa atual (etapa 2) já adota esse formato unificado, então
> parte deste item sai "de graça".

## V2-6 — Cadastro de materiais e produtos (Configurações)

Aba em Configurações para cadastrar insumos com preço, alimentando o motor de
custos (hoje os preços são a tabela de referência `lib/engine/prices.ts`).

| Categoria | Item | Fornecedor | Espessura | Preço custo | Unidade |
|---|---|---|---|---|---|
| MDF | Branco TX | Leo Madeiras | 15mm | R$ 280 | chapa (5,06m²) |
| MDF | Louro Freijó | Duratex | 18mm | R$ 420 | chapa |
| Ferragem | Dobradiça | Blum | – | R$ 14,50 | unidade |

- Modelo já existe no schema (doc 03): `CatalogoItem → Fornecedor → Preco`.
- MVP pode persistir em `localStorage`; a versão final usa as tabelas Prisma
  (persistência da etapa 3) e o motor de custos passa a ler o catálogo do tenant
  em vez de `prices.ts`.

---

## Ordem sugerida de implementação da V2

1. **V2-6** (cadastro de materiais) → destrava dados reais de preço.
2. **V2-1** (cor/material por módulo) → precisa dos acabamentos do catálogo.
3. **V2-5** (BOM unificada) → consome V2-1 e V2-6.
4. **V2-2 / V2-3** (previews Canvas) → puramente visual, independente.
5. **V2-4** (configurador de engenharia) → o mais avançado; fecha a Engine
   Configurável.
