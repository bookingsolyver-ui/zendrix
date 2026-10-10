#!/usr/bin/env bash
# Define OPENWA_URL e OPENWA_API_KEY no projeto da Vercel (Production) com a Vercel CLI e faz redeploy.
# Corre no SEU computador, na pasta do projeto. A chave é pedida sem eco (não fica no histórico do terminal).
#   ./scripts/vercel-openwa-env.sh https://wa.kwanzaflow.com
set -euo pipefail
URL="${1:-}"
[ -n "$URL" ] || { echo "Uso: $0 https://wa.o-seu-dominio.com" >&2; exit 1; }
case "$URL" in https://*) ;; *) echo "O URL tem de ser https://" >&2; exit 1 ;; esac
command -v vercel >/dev/null || { echo "Instale a CLI: npm i -g vercel" >&2; exit 1; }

# Liga a pasta ao projeto (só na primeira vez; escolha o projeto do kwanzaflow.com).
[ -f .vercel/project.json ] || vercel link

read -r -s -p "OPENWA_API_KEY (API_MASTER_KEY do servidor): " KEY; echo
[ "${#KEY}" -ge 32 ] || { echo "Chave demasiado curta." >&2; exit 1; }

for name in OPENWA_URL OPENWA_API_KEY; do
  vercel env rm "$name" production --yes >/dev/null 2>&1 || true   # substitui se já existir
done
printf '%s' "$URL" | vercel env add OPENWA_URL production
printf '%s' "$KEY" | vercel env add OPENWA_API_KEY production --sensitive 2>/dev/null \
  || printf '%s' "$KEY" | vercel env add OPENWA_API_KEY production
unset KEY

echo "Variáveis definidas. A fazer redeploy de produção…"
vercel --prod
