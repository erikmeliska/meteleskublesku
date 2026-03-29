#!/bin/bash
# VPS Deployment Script for MeteleskuBlesku
# Usage: ./deploy.sh [user@host]
#
# Prerequisites on VPS:
#   - Docker & Docker Compose installed
#   - Git installed
#   - .env.production file configured in APP_DIR

set -e

HOST="${1:-ericsko@webs.ixy.sk}"
APP_DIR="~/docker/meteleskublesku"

echo "==> Deploying to $HOST..."

# Push current branch to remote
echo "==> Pushing to git remote..."
git push origin main

# Deploy on VPS
echo "==> Deploying on VPS..."
ssh "$HOST" << 'ENDSSH'
  set -e
  APP_DIR=~/docker/meteleskublesku

  # Clone or pull
  if [ ! -d "$APP_DIR" ]; then
    git clone git@github.com:erikmeliska/meteleskublesku.git "$APP_DIR"
  fi
  cd "$APP_DIR"
  git fetch origin
  git checkout main
  git pull origin main

  # Ensure data and cache dirs exist with correct ownership (uid 1001 = nextjs in container)
  mkdir -p data cache
  sudo chown -R 1001:1001 data cache

  # Run pending migrations
  for migration in prisma/migrations/*/migration.sql; do
    name=$(basename $(dirname "$migration"))
    # Check if already applied by looking for marker file
    if [ ! -f "data/.migration_${name}" ]; then
      echo "==> Running migration: $name"
      docker run --rm -v "$(pwd)/data:/data" -v "$(pwd)/prisma:/prisma" \
        --entrypoint "" node:24-slim \
        sh -c "apt-get update -qq && apt-get install -y -qq sqlite3 > /dev/null 2>&1 && sqlite3 /data/meteleskublesku.db < /prisma/migrations/${name}/migration.sql" \
        && touch "data/.migration_${name}" \
        && echo "==> Migration $name applied" \
        || echo "==> Migration $name skipped (may already be applied)"
    fi
  done

  # Build and deploy
  docker compose down
  docker compose build --no-cache
  docker compose up -d

  echo "==> Deployed! Checking health..."
  sleep 5
  curl -sf https://meteleskublesku.ixy.sk > /dev/null && echo "==> Health check OK!" || echo "==> Warning: health check failed"
ENDSSH

echo "==> Deployment complete!"
