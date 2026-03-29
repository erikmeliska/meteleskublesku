#!/bin/bash
# VPS Deployment Script for MeteleskuBlesku
# Usage: ./deploy.sh [user@host]
#
# Prerequisites on VPS:
#   - Docker & Docker Compose installed
#   - Git installed
#   - .env.production file configured

set -e

HOST="${1:-}"

if [ -z "$HOST" ]; then
  echo "Usage: ./deploy.sh user@host"
  echo ""
  echo "This script deploys the app to your VPS via SSH."
  echo "Make sure .env.production is configured on the VPS."
  exit 1
fi

APP_DIR="/opt/meteleskublesku"

echo "==> Deploying to $HOST..."

# Push current branch to remote
echo "==> Pushing to git remote..."
git push origin feature/modernization

# Deploy on VPS
echo "==> Deploying on VPS..."
ssh "$HOST" << 'ENDSSH'
  set -e
  APP_DIR="/opt/meteleskublesku"

  # Clone or pull
  if [ ! -d "$APP_DIR" ]; then
    git clone https://github.com/erikmeliska/meteleskublesku.git "$APP_DIR"
  fi
  cd "$APP_DIR"
  git fetch origin
  git checkout feature/modernization
  git pull origin feature/modernization

  # Build and deploy
  docker compose down
  docker compose build --no-cache
  docker compose up -d

  echo "==> Deployed! Checking health..."
  sleep 5
  curl -sf http://localhost:3700 > /dev/null && echo "==> Health check OK!" || echo "==> Warning: health check failed"
ENDSSH

echo "==> Deployment complete!"
