# VaultBox: Vite UI baked into Django, served by Gunicorn.
# Build from the repo root: docker build -t vaultbox .

FROM node:22-bookworm-slim AS frontend
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM python:3.12-slim-bookworm
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VAULTBOX_DEBUG=false \
    VAULTBOX_SINGLE_ORIGIN=true \
    VAULTBOX_HTTP_PORT=8000 \
    VAULTBOX_DATA_DIR=/data \
    VAULTBOX_ENV_FILE=/data/.env

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY --from=frontend /src/dist /app/backend/frontend_dist
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh \
    && mkdir -p /data

EXPOSE 8000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/api/auth/csrf/ >/dev/null || exit 1

WORKDIR /app/backend
ENTRYPOINT ["/app/docker-entrypoint.sh"]
