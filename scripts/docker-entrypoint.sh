#!/bin/sh
set -eu

DATA_DIR="${VAULTBOX_DATA_DIR:-/data}"
mkdir -p "$DATA_DIR/media" "$DATA_DIR/backups"
# Persist generated SECRET_KEY / encryption key on the data volume.
export VAULTBOX_ENV_FILE="${VAULTBOX_ENV_FILE:-$DATA_DIR/.env}"
export VAULTBOX_SINGLE_ORIGIN="${VAULTBOX_SINGLE_ORIGIN:-true}"
export VAULTBOX_DEBUG="${VAULTBOX_DEBUG:-false}"

cd /app/backend
python3 manage.py migrate --noinput
python3 manage.py seed_roles
python3 manage.py seed_admin
python3 manage.py seed_notifications
if [ "${VAULTBOX_SEED_DATA:-}" = "1" ]; then
  python3 manage.py seed_data
fi
python3 manage.py collectstatic --noinput

exec gunicorn vaultbox.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 1 \
  --threads 8 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
