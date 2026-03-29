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

  # Build and deploy
  docker compose down
  docker compose build --no-cache
  docker compose up -d

  echo "==> Deployed! Checking health..."
  sleep 5
  curl -sf https://meteleskublesku.ixy.sk > /dev/null && echo "==> Health check OK!" || echo "==> Warning: health check failed"
ENDSSH

echo "==> Deployment complete!"
