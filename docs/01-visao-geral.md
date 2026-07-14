# 01 — Visão Geral do Produto

## Nome do Produto

**Budget Planner AI** (nome provisório) — repositório `orcamentofacil`.

## Objetivo

Criar uma plataforma web capaz de gerar orçamentos completos de móveis planejados em
poucos minutos, sem necessidade de modelar previamente o projeto no SketchUp.

A plataforma transforma informações simples (ambiente, medidas, materiais e ferragens)
em um orçamento preciso, considerando:

- consumo estimado de MDF;
- fitas de borda;
- ferragens e acessórios;
- mão de obra, frete e custos indiretos;
- margem de lucro e impostos;
- proposta comercial em PDF.

## Problema Atual

```
Cliente solicita orçamento
  → Criar projeto completo no SketchUp
  → Gerar cálculo pelo Dinabox
  → Anotar manualmente placas, fita, corrediças, dobradiças, puxadores, ferragens
  → Calcular custo e adicionar margem
  → Preencher planilha Google manualmente
  → Gerar PDF e enviar ao cliente
```

**Dores:** processo de 1–3 horas, perda de vendas pela demora, trabalho repetitivo,
erros de digitação e de cálculo, orçamento não padronizado.

## Objetivos

### Primários

- Reduzir o tempo de orçamento em mais de 90%.
- Aumentar precisão e padronizar o cálculo.
- Eliminar planilhas e o SketchUp na fase comercial.
- Gerar PDF profissional.

### Secundários

- Histórico e versionamento de orçamentos, duplicação e comparação de versões.
- Indicadores de lucro, CRM básico, funil de vendas.

## Público-alvo

Empresas de móveis planejados, marcenarias, projetistas, arquitetos e representantes
comerciais.

## Conceito Principal

Em vez de desenhar o móvel, o usuário **responde perguntas**:

| Pergunta | Exemplo de resposta |
|---|---|
| Ambiente | Cozinha |
| Medidas | Parede A: 3,20 m · Parede B: 2,10 m · Altura: 2,70 m · Tipo: Em L |
| Portas | MDF Louro Freijó |
| Caixas | Branco TX |
| Ferragens | Blum, corrediça oculta |
| Quantidades | 8 gavetas, 14 portas |
| Puxador | Perfil |

O sistema calcula automaticamente peças, chapas, fitas, ferragens, custos e preço.

## Requisitos Funcionais (RF)

| RF | Descrição |
|---|---|
| RF-001 | Gestão de clientes (CRUD + busca) |
| RF-002 | Gestão de orçamentos (múltiplos por cliente, versionamento, duplicação) |
| RF-003 | Múltiplos ambientes por orçamento, com medidas e móveis independentes |
| RF-004 | Biblioteca paramétrica de módulos com regras de engenharia |
| RF-005 | Motor de cálculo (chapas, fitas, ferragens, mão de obra, frete, perdas, custo, preço) |
| RF-006 | Simulação comercial em tempo real (margem, lucro, desconto com validação de margem mínima) |
| RF-007 | Proposta comercial em PDF com imagens e condições comerciais |
| RF-008 | Cadastros paramétricos (MDF, ferragens, acessórios, fornecedores, montagem, frete, impostos, comissões) |
| RF-009 | Histórico de alterações e recuperação de versões |
| RF-010 | Dashboard com indicadores comerciais e financeiros |

## Requisitos Não Funcionais (RNF)

- Aplicação 100% responsiva (desktop e tablet).
- **Cálculo completo em menos de 2 segundos.**
- Arquitetura modular e extensível; banco de dados relacional.
- Versionamento das regras de engenharia.
- Exportação de PDF em alta qualidade; backup automático.

## Escopo do MVP (Versão 1)

1. Login e autenticação.
2. Cadastro de clientes, orçamentos e ambientes.
3. Biblioteca inicial de módulos (cobre cozinha, guarda-roupa e banheiro).
4. Cadastro de materiais e ferragens (com base pré-carregada — ver doc 07).
5. Motor paramétrico de cálculo (ver doc 04).
6. Simulação de margem (ver doc 05).
7. Geração de proposta comercial em PDF.
8. Histórico de orçamentos.

**Fora do escopo do MVP:** editor de fórmulas, importação de plantas, IA de
reconhecimento, integrações SketchUp/Dinabox, app mobile, multiempresa (ver doc 08).
