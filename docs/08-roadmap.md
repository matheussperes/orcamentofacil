# 08 — Roadmap e Backlog do MVP

## Sprints do MVP (5 sprints × 2 semanas ≈ 10 semanas)

| Sprint | Foco | Entregáveis críticos |
|---|---|---|
| **1** | Infraestrutura & Dados | Modelagem PostgreSQL (doc 03); auth + RBAC; CRUD de clientes; seed do catálogo de referência (MDF, ferragens, montagem); parâmetros de fábrica |
| **2** | Formulários Paramétricos | Wizard de 6 etapas (doc 06); cadastro de orçamentos/ambientes/medidas; editor de módulos com duplicar; barra linear de ocupação; templates dos 6 módulos essenciais |
| **3** | Motor de Cálculo | Parser de fórmulas (interpretador seguro); pipeline de explosão + etapa global + consolidação (doc 04); integração com tabelas de preço; suíte de testes golden de precisão |
| **4** | Painel Comercial & PDF | Pipeline financeiro (doc 05); simulador de margem com slider em tempo real; validação de margem mínima; geração de PDF (Puppeteer) assíncrona; layout da proposta |
| **5** | Histórico & Ajustes Finos | Versionamento/snapshot de orçamentos; duplicação de orçamento; dashboard básico; auditoria; ajustes UI/UX tablet; deploy em staging; beta com marceneiros |

## Backlog Técnico Detalhado

### Frontend (Next.js + React + TailwindCSS)

- [ ] Autenticação + layout base responsivo (desktop e tablet).
- [ ] CRUD de clientes com busca.
- [ ] Wizard de onboarding da conta (Nível 2 — doc 07).
- [ ] Wizard de orçamento (Etapas 1–3): medidas, perguntas rápidas, sugestão.
- [ ] Editor de módulos: cards com editar / duplicar / excluir, overrides de material.
- [ ] Componente **Barra Linear de Ocupação** (por parede e tipologia, estado
      verde/vermelho).
- [ ] Tela de resumo com warnings do motor.
- [ ] Simulador de margem (slider client-side, sem chamada ao backend).
- [ ] Telas de configurações: parâmetros de fábrica, tabelas de preço, margens.
- [ ] Listagem de orçamentos com status, versões e duplicação.
- [ ] Dashboard com indicadores.

### Backend & Engine (Node.js + TypeScript)

- [ ] Migrações do schema (doc 03) + seeds do catálogo de referência.
- [ ] API REST/tRPC: clientes, orçamentos, ambientes, módulos, catálogo, preços.
- [ ] **Parser do motor paramétrico** (avaliador de fórmulas dos templates JSON).
- [ ] Pipeline de execução completo (resolução → validação → explosão → global →
      consolidação).
- [ ] Cadastro dos 6 templates de módulos de cozinha (`engine/templates/`).
- [ ] Motor de custos + markup + validações de margem.
- [ ] Snapshot/versionamento de orçamentos (append-only).
- [ ] Serviço assíncrono de PDF (Puppeteer + fila) e upload para storage.
- [ ] Auditoria de alterações.

### Conteúdo / Dados

- [ ] Levantamento dos preços de referência por região (MDF e ferragens).
- [ ] Validação das fórmulas dos templates com 2–3 marceneiros parceiros
      (comparar output do motor com orçamentos reais feitos via SketchUp/Dinabox).
- [ ] Layout da proposta comercial (capa, resumo, ambientes, condições, garantia,
      QR code, assinatura).

## Critérios de Aceite do MVP

1. Orçamento completo de uma cozinha em L (10+ módulos) criado em **< 5 minutos** por
   um usuário treinado.
2. Cálculo da engenharia + custos em **< 2 s** (P95).
3. Diferença ≤ **8%** entre o consumo de MDF estimado e o apurado via Dinabox nos
   casos de validação com marceneiros beta.
4. PDF gerado em < 30 s, com layout aprovado por 3 usuários beta.
5. Slider de margem com atualização perceptível como instantânea (< 100 ms).

## Fases Futuras

### Fase 2
- Importação de plantas (PDF/DWG) + IA de reconhecimento de ambientes e medidas.
- Biblioteca expandida de módulos (cristaleira, closet, painéis, racks, gabinetes).
- CRM comercial integrado (funil de vendas).
- Drag-and-drop na planta linear 2D (V2 da UI).
- **Engine Configurável (V2):** árvore de componentes com expressões editáveis pelo
  usuário — substitui a necessidade de DSL no MVP.

### Fase 3
- Integração SketchUp/Dinabox para conferência de estimativas.
- Catálogo de fornecedores com atualização automática de preços; cotador.
- App mobile para vendedores.

### Fase 4
- IA para sugerir layouts e otimizações de custo; IA comercial (margem, troca de
  ferragem, rentabilidade); IA de fotos e de engenharia (inconsistências).
- Renderizações conceituais automáticas.
- SaaS multiempresa com personalização por marcenaria.
- Módulos ERP: ordens de produção, lista de corte, compras, financeiro, CNC.
