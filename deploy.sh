#!/usr/bin/env bash
set -euo pipefail

# InnDesk — deployment script
# Usage: ./deploy.sh [--seed]
#
# Prerequisites: Docker, docker compose, a .env file at project root
# with at minimum POSTGRES_PASSWORD and JWT_SECRET set.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Copy .env.example to .env and fill in the values."
    exit 1
fi

echo "==> Pulling / building images..."
docker compose build --pull

echo "==> Starting services..."
docker compose up -d

echo "==> Waiting for API to be ready..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/api/v1/health > /dev/null 2>&1; then
        break
    fi
    sleep 2
done

if [ "${1:-}" = "--seed" ]; then
    echo "==> Running seed data..."
    docker compose exec api python -m backend.seed
fi

echo ""
echo "InnDesk is running at http://localhost:8000"
echo "Login page: http://localhost:8000/app/index.html"
