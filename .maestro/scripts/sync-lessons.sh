#!/usr/bin/env bash
#
# sync-lessons.sh
#
# Faz commit e push de docs/Lessons-Learned.md de volta ao repositório
# template principal, para que aprendizados de uma sprint fiquem
# disponíveis em novos projetos criados a partir do template .maestro.
#
# Uso:
#   .maestro/scripts/sync-lessons.sh
#
# Variáveis de ambiente opcionais:
#   MAESTRO_TEMPLATE_REMOTE  - nome do remote do repositório template
#                              (default: origin)
#   MAESTRO_TEMPLATE_BRANCH  - branch de destino no template
#                              (default: branch atual)

set -euo pipefail

LESSONS_FILE="docs/Lessons-Learned.md"
REMOTE="${MAESTRO_TEMPLATE_REMOTE:-origin}"

if [ ! -f "$LESSONS_FILE" ]; then
  echo "[sync-lessons] Erro: $LESSONS_FILE não encontrado. Rode este script a partir da raiz do repositório." >&2
  exit 1
fi

if git diff --quiet -- "$LESSONS_FILE" && git diff --cached --quiet -- "$LESSONS_FILE"; then
  echo "[sync-lessons] Nenhuma alteração pendente em $LESSONS_FILE. Nada a sincronizar."
  exit 0
fi

BRANCH="${MAESTRO_TEMPLATE_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"

git add "$LESSONS_FILE"
git commit -m "docs: sync Lessons-Learned.md from retrospective"

echo "[sync-lessons] Commit criado. Enviando para $REMOTE/$BRANCH..."
git push "$REMOTE" "$BRANCH"

echo "[sync-lessons] Sincronização concluída com sucesso."
