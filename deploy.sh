#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
    cat <<'EOF'
Usage: ./deploy.sh [--seed]

Options:
  --seed      Charge les données de démonstration après le démarrage.
  -h, --help  Affiche cette aide.
EOF
}

seed=false
case "${1:-}" in
    "") ;;
    --seed) seed=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ERROR: unsupported argument: $1" >&2; usage >&2; exit 2 ;;
esac

if [ "$#" -gt 1 ]; then
    echo "ERROR: only one argument is accepted." >&2
    usage >&2
    exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Copy .env.example to .env and replace its placeholders." >&2
    exit 1
fi

APP_PORT="${APP_PORT:-$(sed -n 's/^APP_PORT=//p' .env | tail -n 1)}"
APP_PORT="${APP_PORT:-8000}"

echo "==> Validating Docker Compose configuration..."
docker compose config --quiet

echo "==> Building images..."
docker compose build --pull

echo "==> Starting services..."
docker compose up -d

echo "==> Waiting for the API container to become healthy..."
api_healthy=false
for attempt in $(seq 1 30); do
    container_id="$(docker compose ps -q api)"
    if [ -n "$container_id" ]; then
        health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
        if [ "$health_status" = "healthy" ]; then
            api_healthy=true
            break
        fi
    fi
    echo "    attempt ${attempt}/30: ${health_status:-not started}"
    sleep 2
done

if [ "$api_healthy" != "true" ]; then
    echo "ERROR: API container did not become healthy after 30 attempts." >&2
    docker compose ps || true
    docker compose logs --tail=150 api || true
    exit 1
fi

health_url="http://localhost:${APP_PORT}/api/v1/health"
echo "==> Verifying public health endpoint..."
curl --fail --show-error --silent "$health_url"
echo

if [ "$seed" = "true" ]; then
    echo "==> Running seed data..."
    docker compose exec -T api python seed.py
fi

echo "InnDesk is running at http://localhost:${APP_PORT}"
echo "Login page: http://localhost:${APP_PORT}/app/index.html"
