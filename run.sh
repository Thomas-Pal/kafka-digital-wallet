#!/usr/bin/env bash
set -euo pipefail

echo "▶ Starting Podman machine (rootless ok)..."
podman machine start >/dev/null 2>&1 || true

echo "▶ Compose up Kafka + UI..."
podman compose up -d

mkdir -p logs

echo "▶ Wait for Kafka health..."
./scripts/kafka-wait.sh 127.0.0.1:29092

echo "▶ Create topics..."
./scripts/kafka-create-topics.sh 127.0.0.1:29092

echo "▶ Install Node deps (wallet, dwp, services)..."
( cd apps/wallet && rm -rf node_modules package-lock.json && npm i )
( cd dwp-portal && rm -rf node_modules package-lock.json && npm i || true )
( cd services && rm -rf node_modules package-lock.json && npm i )

echo "▶ Start backend services (bg)..."
# Clean any prior pids on 4000/5001/5002
lsof -ti:4000,5001,5002 | xargs -r kill -9 || true
( cd services && RUN_ID=$RANDOM nohup npm run orchestration-api > ../logs/orchestration-api.log 2>&1 & )
( cd services && RUN_ID=$RANDOM nohup npm run gatekeeper  > ../logs/gatekeeper.log  2>&1 & )
( cd services && RUN_ID=$RANDOM nohup npm run hmrc-api     > ../logs/hmrc-api.log     2>&1 & )
( cd services && RUN_ID=$RANDOM nohup npm run coach-api    > ../logs/coach-api.log    2>&1 & )

echo "▶ Start UIs (wallet 5173, dwp 5174)..."
lsof -ti:5173,5174 | xargs -r kill -9 || true
( cd apps/wallet && nohup npm run dev -- --port 5173 > ../../logs/wallet.log 2>&1 & )
( cd dwp-portal && nohup npm run dev -- --port 5174 > ../logs/dwp-ui.log 2>&1 & ) || true

echo
echo "📺 Open:"
echo "  Wallet:     http://localhost:5173"
echo "  DWP Portal: http://localhost:5174"
echo "  Kafka UI:   http://localhost:8080"
echo
echo "✅ Use the Wallet 'Scenarios' tab to drive the demo (no terminal steps)."
