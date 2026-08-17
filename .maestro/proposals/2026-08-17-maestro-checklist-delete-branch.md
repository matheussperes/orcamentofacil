# Proposta: checklist de verificação antes de deletar branch de feature

**Origem**: `docs/Lessons-Learned.md`, entrada 2026-08-16 (Task 5.10-front, Lote 5)
— incidente registrado sem proposta correspondente até esta retrospectiva de
fase (2026-08-17), que fecha a lacuna.

**Agente afetado**: `maestro:maestro`, protocolo de merge/limpeza de branch
ao final de uma task.

## Evidência

Durante a Task 5.10-front, o Maestro executou `git checkout main && git merge
--no-ff feature/5.10-front` e o merge reportou "Already up to date" — a
branch feature nunca teve commit próprio, as mudanças do executor ficaram
como working tree não commitado. A branch foi deletada antes de confirmar a
existência de commits próprios nela. Recuperado sem perda porque nada tinha
sido descartado de fato (o working tree sobreviveu ao checkout), mas o
protocolo de verificação antes de uma operação destrutiva (delete de branch)
não foi seguido.

## Proposta

Adicionar ao protocolo do Maestro um passo obrigatório antes de deletar
qualquer branch de feature: confirmar `git log <branch-feature>` contra
`git log main` e verificar a existência de commits próprios da feature
(divergência de SHA, não só de data/hora) — nunca assumir que "executor
reportou pronto" implica "commitou na branch". Se a branch não tiver commits
próprios, interromper e investigar antes de prosseguir com merge/delete.

## Por que é candidata a melhoria do framework

É um item de checklist de segurança contra perda acidental de trabalho
(mesmo quando recuperável) aplicável a qualquer esteira que automatize
merge+delete de branch de feature ao fim de uma task — não é peculiar à
estrutura deste projeto.

## Decisão

Aguardando decisão humana. Este agente não altera o diretório do plugin.
