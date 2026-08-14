# Proposta — checklist do memory-manager: sincronizar tabela-resumo e histórico de execução simultaneamente

**Origem**: `docs/Lessons-Learned.md`, entrada 2026-08-14 (Lote 2, incremento da Task 2.27). Padrão identificado durante sincronização de fechamento do lote.

## Evidência

Durante sincronização de estado do Lote 2 (Task 2.27, esta sessão de 2026-08-14), foi descoberto que **8 de 18 tarefas do lote tinham desync entre dois locais** onde o mesmo status deveria estar registrado:

- **Bullet do histórico de execução** (`docs/Backlog.md`, seção "Histórico de execução" de cada task): já estava `✅` desde 2026-08-06/07/08
- **Tag da tabela-resumo** (coluna "Tag" na tabela do lote em `docs/Backlog.md`): permanecia `🟡 LACUNA` até esta sessão (2026-08-14)

Tasks afetadas: 2.3–2.6, 2.7, 2.8–2.11 (back), 2.7–2.11 (front), 2.12 (back), 2.12 (front), 2.13, 2.19–2.23. A divergência mais antiga datava de **8 dias atrás** (2026-08-06).

## Problema estrutural

O agente `memory-manager` tem instruções que dizem "Localize a entrada pelo Task ID e troque **apenas o campo Status**" — referindo-se exclusivamente ao bullet do histórico de execução. Nenhuma checklist ou passo explícito pediu para também atualizar a tag correspondente na tabela-resumo simultaneamente. O resultado: duas estruturas mantêm o mesmo estado (status de uma task), mas apenas uma é atualizada confiável e consistentemente a cada sincronização.

Este é um caso genérico de **redundância de estado em documentação** — quando o mesmo fato (conclusão de uma task) é registrado em dois formatos diferentes (narrativo/bullet + estruturado/tabela), é fácil que um seja atualizado enquanto o outro fica obsoleto, especialmente se a checklist do agente menciona apenas um deles.

## Mudança proposta

Adicionar ao protocolo do agente `memory-manager` um **checklist explícito de duas localizações**:

Ao sincronizar qualquer task (após merge), o agente deve:
1. ✅ Atualizar o bullet de status no "Histórico de execução" da task (já faz)
2. ✅ **[NOVO]** Atualizar a tag (`🔴 BLOQ` → `✅ Completo`, ou equivalente) na linha correspondente da tabela-resumo do pipeline stage, **no mesmo commit**
3. ✅ **[NOVO]** Verificar **antes de fechar o commit** que ambas as localizações foram tocadas — exemplo: "Confirmado: Task 2.19-2.23 tem bullet E tag da tabela atualizados"

Exemplo concreto de diff esperado: quando Task 2.19-2.23 é sincronizada, o mesmo commit deve tocar:
- Linha do bullet de histórico: `- **Task 2.19–2.23** ✅ (2026-08-14) — ...`
- Linha da tabela: `| 2.19–2.23 | ... | ✅ Completo | ... |`

## Por que é candidata a framework

O padrão de **dois locais de registro para o mesmo estado** (narrativo + estruturado) é comum em qualquer framework de documentação que mantenha histórico legível por humanos (prosa) combinado com tabelas/resumos estruturados. A lição de "atualizar ambos os locais no mesmo commit" é reutilizável.

Qualquer projeto com Backlog narrativo + tabela-resumo, seja em Maestro ou em outro framework de gerenciamento de tasks, tira proveito dessa prática.

## Decisão

Aguardando decisão humana. O agente `memory-manager` (ou quem o define) pode:
- (A) Adicionar este item ao checklist permanente do agente, ou
- (B) Restruturar `docs/Backlog.md` para ter apenas *uma* fonte de verdade (ex.: gerar a tabela-resumo a partir do histórico via script, em vez de mantê-la manual), eliminando a redundância na raiz.

Este agente não alterou o framework por conta própria.
