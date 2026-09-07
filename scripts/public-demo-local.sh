#!/usr/bin/env bash
# Local public-demo stack. Isolated data dir — never the local-beta sqlite/.env.
# Usage: scripts/public-demo-local.sh {start|stop|status|reset}
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/backend/demo-data"
LOG_DIR="$ROOT/logs"
BACKEND_LOG="$LOG_DIR/public-demo-backend.log"
FRONTEND_LOG="$LOG_DIR/public-demo-frontend.log"
BACKEND_PID_FILE="$DATA/backend.pid"
FRONTEND_PID_FILE="$DATA/frontend.pid"

export VAULTBOX_PUBLIC_DEMO=1
export VAULTBOX_DATA_DIR="$DATA"
export VAULTBOX_ENV_FILE="$DATA/.env"
export VAULTBOX_HOSTNAME="${VAULTBOX_HOSTNAME:-localhost}"
export VAULTBOX_USE_HTTPS="${VAULTBOX_USE_HTTPS:-false}"
export VAULTBOX_DEMO_RESET_SECONDS="${VAULTBOX_DEMO_RESET_SECONDS:-300}"
export VAULTBOX_DEBUG="${VAULTBOX_DEBUG:-true}"

mkdir -p "$DATA/media" "$LOG_DIR"

port_busy() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn | grep -qE ":${port}\\b"
  else
    fuser "${port}/tcp" >/dev/null 2>&1
  fi
}

cmd="${1:-status}"

case "$cmd" in
  status)
    echo "Public demo local"
    echo "  data:   $DATA"
    echo "  reset:  ${VAULTBOX_DEMO_RESET_SECONDS}s"
    if port_busy 8000; then echo "  :8000   busy"; else echo "  :8000   free"; fi
    if port_busy 5173; then echo "  :5173   busy"; else echo "  :5173   free"; fi
    if [[ -f "$DATA/db.sqlite3" ]]; then echo "  db:     present"; else echo "  db:     missing"; fi
    ;;
  stop)
    if [[ -f "$BACKEND_PID_FILE" ]]; then
      kill "$(cat "$BACKEND_PID_FILE")" 2>/dev/null || true
      rm -f "$BACKEND_PID_FILE"
    fi
    if [[ -f "$FRONTEND_PID_FILE" ]]; then
      kill "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null || true
      rm -f "$FRONTEND_PID_FILE"
    fi
    echo "Stopped public-demo pids (did not fuser-kill ports)."
    ;;
  reset)
    cd "$ROOT/backend"
    python3 manage.py reset_public_demo
    ;;
  start)
    if port_busy 8000 || port_busy 5173; then
      echo "Port 8000 or 5173 is already in use. Stop the other instance (or /clean-launch stop) first." >&2
      echo "This script will not kill ports." >&2
      exit 1
    fi
    cd "$ROOT/backend"
    python3 manage.py migrate --noinput
    python3 manage.py seed_roles
    python3 manage.py reset_bootstrap
    python3 manage.py seed_notifications
    python3 manage.py seed_data --flush
    python3 manage.py runserver 127.0.0.1:8000 >>"$BACKEND_LOG" 2>&1 &
    echo $! >"$BACKEND_PID_FILE"
    cd "$ROOT"
    npm run dev >>"$FRONTEND_LOG" 2>&1 &
    echo $! >"$FRONTEND_PID_FILE"
    echo "Public demo starting."
    echo "  UI:    http://localhost:5173  (not 127.0.0.1 — passkeys)"
    echo "  API:   http://127.0.0.1:8000/api/"
    echo "  data:  $DATA"
    echo "  wipe:  every ${VAULTBOX_DEMO_RESET_SECONDS}s (or: $0 reset)"
    echo "  logs:  $BACKEND_LOG"
    echo "         $FRONTEND_LOG"
    echo "  stop:  $0 stop"
    ;;
  *)
    echo "Usage: $0 {start|stop|status|reset}" >&2
    exit 2
    ;;
esac
