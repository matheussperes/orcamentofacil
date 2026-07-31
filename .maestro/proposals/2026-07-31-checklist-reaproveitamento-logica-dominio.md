# Proposta — Checklist de reaproveitamento de lógica de domínio no contrato de execução

**Origem**: Retrospectiva da Pipeline Stage 13 (`orcamentofacil`, 2026-07-31), Padrão 1 de `docs/Lessons-Learned.md`.

## Problema observado

Em uma mesma Stage (13), três funções de domínio/cálculo/resolução foram implementadas
inline dentro do primeiro componente que precisou delas, e só viraram módulo
compartilhado em `lib/` quando um **segundo** componente passou a precisar da mesma
lógica — nunca antecipado na primeira implementação:

- `resolverAlvoElemento`: inline em `AmbientesLab` (Task 13.2c) → extraída para
  `lib/ambiente/resolverAlvo.ts` só na Task 13.4 (`CorteMaterialLab` precisou).
- `calcularEngineOrcamento`: inline em `CorteMaterialLab.tsx` (Task 13.4) → extraída
  para `lib/ambiente/calcularEngineOrcamento.ts` só na Task 13.5 (`FinanceiroLab`
  precisou).
- Seletor de modo de precificação/montagem: inline em `FinanceiroLab` (Task 13.5) →
  extraído para `components/precificacao/SeletorModoPrecificacao.tsx`/
  `SeletorModoMontagem.tsx` só na Task 13.7a (`/perfil` precisou).

O padrão se repetiu 3 vezes com a mesma forma, sempre descoberto reativamente.

## Causa estrutural

Nenhum contrato de execução do framework Maestro pede ao executor para checar,
antes de implementar lógica de cálculo/resolução de domínio nova, se uma função
equivalente já existe e é reaproveitável em `lib/` (escrita para uma tela irmã do
mesmo Épico/domínio). A extração vira trabalho reativo de refatoração em vez de
decisão antecipada.

## Mudança proposta

Adicionar ao `Task-Execution-Contract` (ou equivalente) um item de checklist
explícito, algo como:

> Antes de implementar lógica de cálculo/validação/resolução de domínio nova,
> buscar (`grep`/leitura de `lib/`) por uma função equivalente já existente que
> resolva o mesmo problema para outra tela do mesmo domínio. Se existir mas estiver
> inline num componente específico, extrair para um módulo compartilhado ANTES de
> duplicar a lógica na nova tela, em vez de duplicar e extrair depois.

Isso não elimina 100% dos casos (a segunda tela consumidora às vezes ainda não
existe quando a primeira é escrita), mas reduz a janela entre a duplicação
acontecer e ser corrigida.

## Qual agente/contrato muda

- `Task-Execution-Contract` (ou o contrato equivalente usado pelos executores —
  Frontend/Backend/Motor Engineer) ganha o item de checklist acima.
- Possivelmente a persona `frontend-engineer`/`backend-engineer` também referencia
  esse checklist na seção de boas práticas.

## Decisão

Aguardando decisão humana. Esta proposta não altera nenhum arquivo do plugin.
