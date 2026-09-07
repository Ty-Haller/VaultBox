#!/usr/bin/env bash
# Install and run VaultBox with Docker (single container: UI + API + SQLite).
# From a clone:  ./scripts/bootstrap.sh
# Repo is private — clone with access, then run this script.
set -euo pipefail

REPO_DEFAULT="https://github.com/Ty-Haller/VaultBox.git"
IMAGE="${VAULTBOX_IMAGE:-vaultbox:local}"
CONTAINER="${VAULTBOX_CONTAINER:-vaultbox}"
PORT="${VAULTBOX_HTTP_PORT:-8000}"
HOSTNAME_DEFAULT="${VAULTBOX_HOSTNAME:-localhost}"
USE_HTTPS_DEFAULT="${VAULTBOX_USE_HTTPS:-false}"
SEED_DEFAULT="${VAULTBOX_SEED_DATA:-}"

say() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing $1. Install it and re-run."
}

find_repo_root() {
  local dir="$PWD"
  while [ "$dir" != / ]; do
    if [ -f "$dir/Dockerfile" ] && [ -f "$dir/backend/manage.py" ]; then
      printf '%s' "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

prompt() {
  local q="$1" def="$2" ans
  if [ -n "${VAULTBOX_NONINTERACTIVE:-}" ]; then
    printf '%s' "$def"
    return
  fi
  if [ -t 0 ]; then
    read -r -p "$q [$def]: " ans || true
    printf '%s' "${ans:-$def}"
  else
    printf '%s' "$def"
  fi
}

need_cmd docker
docker info >/dev/null 2>&1 || die "Docker is installed but not usable (daemon running? your user in the docker group?)."

ROOT="$(find_repo_root || true)"
if [ -z "$ROOT" ]; then
  need_cmd git
  ROOT="$PWD/VaultBox"
  if [ ! -d "$ROOT/.git" ]; then
    say "==> Cloning $REPO_DEFAULT"
    git clone "$REPO_DEFAULT" "$ROOT"
  fi
  cd "$ROOT"
else
  cd "$ROOT"
fi

say "==> VaultBox bootstrap (Docker)"
HOSTNAME_VAL="$(prompt "Public hostname (WebAuthn RP ID)" "$HOSTNAME_DEFAULT")"
USE_HTTPS="$(prompt "Use HTTPS for generated URLs? (true/false)" "$USE_HTTPS_DEFAULT")"
PORT="$(prompt "Host port to publish" "$PORT")"
SEED_ANS="$(prompt "Load demo holdings? (1/empty)" "$SEED_DEFAULT")"

if [ ! -f "$ROOT/.env" ]; then
  say "==> Writing $ROOT/.env"
  umask 077
  {
    printf 'SECRET_KEY=%s\n' "$(openssl rand -base64 48 2>/dev/null || python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
    printf 'VAULTBOX_ENCRYPTION_KEY=%s\n' "$(python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())' 2>/dev/null || openssl rand -base64 32)"
    printf 'VAULTBOX_HOSTNAME=%s\n' "$HOSTNAME_VAL"
    printf 'VAULTBOX_USE_HTTPS=%s\n' "$USE_HTTPS"
  } > "$ROOT/.env"
  chmod 600 "$ROOT/.env"
else
  say "==> Using existing $ROOT/.env"
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  say "==> Removing existing container $CONTAINER"
  docker rm -f "$CONTAINER" >/dev/null
fi

say "==> Building image $IMAGE (first run takes a few minutes)"
docker build -t "$IMAGE" "$ROOT"

SCHEME="http"
case "$USE_HTTPS" in
  true|TRUE|1|yes|on) SCHEME="https" ;;
esac
ORIGIN="$SCHEME://$HOSTNAME_VAL"
if [ "$SCHEME" = http ] && [ "$PORT" != 80 ]; then
  ORIGIN="$ORIGIN:$PORT"
elif [ "$SCHEME" = https ] && [ "$PORT" != 443 ]; then
  ORIGIN="$ORIGIN:$PORT"
fi

say "==> Starting $CONTAINER"
docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  --env-file "$ROOT/.env" \
  -e VAULTBOX_DATA_DIR=/data \
  -e VAULTBOX_ENV_FILE=/data/.env \
  -e VAULTBOX_SINGLE_ORIGIN=true \
  -e "VAULTBOX_HTTP_PORT=$PORT" \
  -e "VAULTBOX_SEED_DATA=$SEED_ANS" \
  -p "127.0.0.1:${PORT}:8000" \
  -v vaultbox-data:/data \
  "$IMAGE" >/dev/null

say "==> Waiting for API"
ok=0
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/auth/csrf/" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 1
done
[ "$ok" = 1 ] || die "Container started but /api/auth/csrf/ did not respond. Check: docker logs $CONTAINER"

say ""
say "VaultBox is running."
say "  App URL:  $ORIGIN"
say "  Login:    $ORIGIN/login"
say "  Data:     Docker volume vaultbox-data"
say ""
say "Open the App URL (not 127.0.0.1) and register an admin passkey."
say "Logs:  docker logs -f $CONTAINER"
say "Stop:  docker stop $CONTAINER"
