#!/usr/bin/env bash
# Coach JP · activa la nube (Supabase) del Nutrition Builder en un solo paso.
# Uso:  ./setup-cloud.sh            → te pide el token de Supabase, crea/configura todo y hace commit + push
#       ./setup-cloud.sh --github   → además carga las variables en GitHub con `gh` y corre el deploy
# Token personal de Supabase: https://supabase.com/dashboard/account/tokens
set -euo pipefail
cd "$(dirname "$0")/nutrition-system"
command -v node >/dev/null || { echo "Necesitás Node.js 18 o más nuevo: https://nodejs.org"; exit 1; }
if [[ " $* " == *" --github "* ]] && command -v gh >/dev/null && ! gh auth status >/dev/null 2>&1; then
  echo "Iniciá sesión en GitHub (una sola vez):"
  gh auth login
fi
exec node scripts/setup-cloud.mjs --commit "$@"
