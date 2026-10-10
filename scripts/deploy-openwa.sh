#!/usr/bin/env bash
# Coloca o OpenWA + Caddy (HTTPS) a funcionar numa VPS Linux. Idempotente: pode correr-se várias vezes.
#   OPENWA_DOMAIN=wa.kwanzaflow.com ACME_EMAIL=voce@exemplo.com ./scripts/deploy-openwa.sh
# Nunca regenera a API_MASTER_KEY se o .env já existir (mudá-la desligaria a app do OpenWA).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../deploy/openwa" && pwd)"
ENV_FILE="$DIR/.env"
say() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!! \033[0m%s\n' "$*" >&2; }
die() { printf '\033[1;31mxx \033[0m%s\n' "$*" >&2; exit 1; }

# ── 1. Validar o ambiente ────────────────────────────────────────────────────────────────────────
[ "$(uname -s)" = "Linux" ] || die "Corra isto na VPS (Linux), não no seu computador."
command -v docker >/dev/null || die "Docker não instalado. Instale: curl -fsSL https://get.docker.com | sh"
docker compose version >/dev/null 2>&1 || die "Falta o plugin 'docker compose' (Docker 20.10+ / Compose v2)."
docker info >/dev/null 2>&1 || die "Sem permissão para usar o Docker. Use sudo ou adicione o utilizador ao grupo 'docker'."
command -v openssl >/dev/null || die "openssl não instalado."
command -v curl >/dev/null || die "curl não instalado."

MEM_KB=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
[ "${MEM_KB:-0}" -ge 1800000 ] || warn "Menos de 2 GB de RAM: o OpenWA pode ser morto por falta de memória."

for port in 80 443; do
  if (ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null) | grep -qE "[:.]$port\s"; then
    # Se já for o nosso Caddy, está bem.
    docker ps --format '{{.Names}}' | grep -q '^openwa-caddy$' || die "A porta $port já está em uso por outro serviço."
  fi
done

# ── 2. Configuração e chaves ─────────────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  DOMAIN="${OPENWA_DOMAIN:-}"
  [ -n "$DOMAIN" ] || read -r -p "Subdomínio do OpenWA (ex.: wa.kwanzaflow.com): " DOMAIN
  echo "$DOMAIN" | grep -qE '^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' || die "Domínio inválido: '$DOMAIN'"
  umask 077
  cat > "$ENV_FILE" <<ENV
OPENWA_DOMAIN=$DOMAIN
ACME_EMAIL=${ACME_EMAIL:-}
API_MASTER_KEY=$(openssl rand -hex 32)
OPENWA_VERSION=${OPENWA_VERSION:-latest}
OPENWA_MEM_LIMIT=${OPENWA_MEM_LIMIT:-2g}
TZ=${TZ:-UTC}
ENV
  chmod 600 "$ENV_FILE"
  say "Criado $ENV_FILE (chave gerada, permissões 600)."
else
  say "Reutilizo $ENV_FILE (a chave existente NÃO é alterada)."
fi
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a
[ "${#API_MASTER_KEY}" -ge 32 ] || die "API_MASTER_KEY com menos de 32 caracteres."

# ── 3. Diretórios de dados (sessões e certificados) ──────────────────────────────────────────────
mkdir -p "$DIR/data/openwa" "$DIR/data/caddy"
chmod 700 "$DIR/data"

# ── 4. DNS: o domínio tem de apontar para este servidor, senão o HTTPS não emite o certificado ────
PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"
DNS_IP="$(getent hosts "$OPENWA_DOMAIN" 2>/dev/null | awk '{print $1; exit}' || true)"
if [ -z "$DNS_IP" ]; then
  warn "$OPENWA_DOMAIN ainda não resolve. Crie um registo A para ${PUBLIC_IP:-o IP deste servidor} e volte a correr."
elif [ -n "$PUBLIC_IP" ] && [ "$DNS_IP" != "$PUBLIC_IP" ]; then
  warn "$OPENWA_DOMAIN aponta para $DNS_IP, mas este servidor é $PUBLIC_IP. O certificado pode falhar."
fi

# ── 5. Arrancar ───────────────────────────────────────────────────────────────────────────────────
cd "$DIR"
say "A descarregar a imagem do OpenWA (${OPENWA_VERSION:-latest})…"
docker compose pull
say "A arrancar os contentores…"
docker compose up -d

say "A aguardar o OpenWA ficar saudável (até 2 min)…"
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{.State.Health.Status}}' openwa 2>/dev/null || echo starting)"
  [ "$status" = "healthy" ] && break
  sleep 2
done
[ "$status" = "healthy" ] || { docker compose logs --tail 40 openwa >&2; die "O OpenWA não ficou saudável."; }

say "A testar o HTTPS (o certificado pode demorar ~30 s na primeira vez)…"
ok=""
for _ in $(seq 1 15); do
  if curl -fsS --max-time 8 "https://$OPENWA_DOMAIN/api/health" >/dev/null 2>&1; then ok=1; break; fi
  sleep 4
done
[ -n "$ok" ] && say "https://$OPENWA_DOMAIN/api/health responde." || warn "O HTTPS ainda não responde: confirme o DNS e as portas 80/443 abertas na firewall (ufw allow 80,443/tcp)."

# ── 6. Resumo ─────────────────────────────────────────────────────────────────────────────────────
cat <<SUMMARY

Pronto. Valores para a Vercel (guarde a chave num gestor de palavras-passe; não a cole em chats):
  OPENWA_URL     = https://$OPENWA_DOMAIN
  OPENWA_API_KEY = (está em $ENV_FILE → API_MASTER_KEY)

Mostrar a chave uma vez:   grep '^API_MASTER_KEY=' "$ENV_FILE" | cut -d= -f2
Testar a ligação:          OPENWA_URL=https://$OPENWA_DOMAIN OPENWA_API_KEY=<chave> node scripts/check-openwa.mjs
Fazer backup das sessões:  tar czf openwa-backup.tgz -C "$DIR" data/openwa
SUMMARY
