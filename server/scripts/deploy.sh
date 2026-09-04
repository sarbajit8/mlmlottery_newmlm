#!/usr/bin/env bash
#
# One-shot deploy for the EC2 box. Run it from the server/ directory after the new code is on the
# machine (git pull, rsync, scp, CI artifact — however it gets there):
#
#   cd /var/www/mlmlottery/server && bash scripts/deploy.sh
#
# It installs deps, applies any pending DB migrations, builds server + client, and restarts the app
# under PM2. Safe to run repeatedly — `prisma migrate deploy` only applies migrations not yet run.

set -euo pipefail
cd "$(dirname "$0")/.."          # -> server/
SERVER_DIR="$PWD"
ROOT_DIR="$(dirname "$SERVER_DIR")"

APP_NAME="${APP_NAME:-mlmlottery-api}"

echo "==> [1/6] Installing server dependencies (npm ci)"
npm ci

echo "==> [2/6] Generating Prisma client"
npx prisma generate

echo "==> [3/6] Applying database migrations (prisma migrate deploy)"
npx prisma migrate deploy

echo "==> [4/6] Building server (TypeScript)"
npm run build

echo "==> [5/6] Building client (Vite)"
cd "$ROOT_DIR/client"
npm ci
npm run build
cd "$SERVER_DIR"

echo "==> [6/6] Restarting app under PM2 ($APP_NAME)"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 reload "$APP_NAME" --update-env
  else
    pm2 start npm --name "$APP_NAME" -- start
  fi
  pm2 save
else
  echo "    pm2 not found — start the app yourself with:  npm run start"
fi

echo "==> Deploy complete"
