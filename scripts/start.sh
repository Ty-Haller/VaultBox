#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export PATH="$HOME/.local/share/fnm:$PATH"
eval "$(fnm env)" 2>/dev/null || true

echo "==> Stopping stale VaultBox dev servers..."
for port in 5173 5174 5175 8000; do
  fuser -k "${port}/tcp" 2>/dev/null || true
done
pkill -f "vite" 2>/dev/null || true
pkill -f "manage.py runserver" 2>/dev/null || true
sleep 1

echo "==> Starting Django backend on http://127.0.0.1:8000"
cd "$ROOT/backend"
python3 manage.py migrate --noinput
python3 manage.py seed_admin 2>/dev/null || true
python3 manage.py runserver 127.0.0.1:8000 &
BACKEND_PID=$!

echo "==> Waiting for API..."
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:8000/api/sites/" >/dev/null 2>&1; then
    echo "    Backend ready."
    break
  fi
  sleep 0.5
done

echo "==> Starting Vite frontend on http://127.0.0.1:5173"
cd "$ROOT"
npm run dev &
FRONTEND_PID=$!

for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:5173/" >/dev/null 2>&1; then
    echo "    Frontend ready."
    break
  fi
  sleep 0.5
done

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null' EXIT

echo ""
echo "VaultBox is running:"
echo "  Frontend: http://localhost:5173  (use localhost for passkey login)"
echo "  Backend:  http://127.0.0.1:8000/api/"
echo "  Admin:    http://localhost:5173/admin"
echo ""
echo "Press Ctrl+C to stop both servers."

wait