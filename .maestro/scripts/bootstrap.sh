#!/usr/bin/env bash
#
# bootstrap.sh
#
# Garante que o ambiente local possui as ferramentas necessárias para
# rodar os scripts TypeScript do .maestro (ex: seed-qa-user.ts).
#
# Uso:
#   .maestro/scripts/bootstrap.sh

set -euo pipefail

REQUIRED_DEV_DEPS=("@supabase/supabase-js" "typescript" "ts-node" "dotenv")

echo "[bootstrap] Verificando node e npm..."

if ! command -v node >/dev/null 2>&1; then
  echo "[bootstrap] Erro: 'node' não está instalado. Instale Node.js (https://nodejs.org) antes de continuar." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[bootstrap] Erro: 'npm' não está instalado. Instale Node.js/npm antes de continuar." >&2
  exit 1
fi

echo "[bootstrap] node $(node --version) / npm $(npm --version) detectados."

if [ ! -f package.json ]; then
  echo "[bootstrap] package.json não encontrado. Executando 'npm init -y'..."
  npm init -y >/dev/null
else
  echo "[bootstrap] package.json já existe."
fi

is_dep_installed() {
  node -e "
    const pkg = require('./package.json');
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    process.exit(deps[process.argv[1]] ? 0 : 1);
  " "$1"
}

MISSING_DEPS=()
for dep in "${REQUIRED_DEV_DEPS[@]}"; do
  if ! is_dep_installed "$dep"; then
    MISSING_DEPS+=("$dep")
  fi
done

if [ "${#MISSING_DEPS[@]}" -gt 0 ]; then
  echo "[bootstrap] Instalando devDependencies ausentes: ${MISSING_DEPS[*]}"
  npm install --save-dev "${MISSING_DEPS[@]}"
else
  echo "[bootstrap] Todas as devDependencies necessárias já estão presentes."
fi

echo "✅ Ambiente de runtime do .maestro pronto!"
