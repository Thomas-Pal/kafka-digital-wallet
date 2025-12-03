#!/usr/bin/env bash
set -euo pipefail

RUN_ID="${RUN_ID:-$(date +%s)}"
export RUN_ID
echo "▶ Preconditions (RUN_ID=$RUN_ID)"
command -v podman >/dev/null || { echo "Podman is required"; exit 1; }
command -v podman-compose >/dev/null || { echo "podman-compose is required"; exit 1; }
command -v jq >/dev/null || { echo "jq is required"; exit 1; }

OS=$(uname -s || echo unknown)
if [[ "$OS" == "Darwin" ]]; then
  if ! podman machine list --format json 2>/dev/null | jq -e '.[] | select(.Name=="podman-machine-default")' >/dev/null; then
    echo "▶ Creating Podman machine 'podman-machine-default'..."
    podman machine init podman-machine-default --now
  elif ! podman machine list --format json 2>/dev/null | jq -e '.[] | select(.Name=="podman-machine-default" and .Running==true)' >/dev/null; then
    echo "▶ Starting Podman machine 'podman-machine-default'..."
    podman machine start podman-machine-default
  fi
fi

echo "▶ Starting Kafka + UI (Podman compose)..."
# Clean up orphaned containers/pods that can block new runs (common after crashes or manual stops)
COMPOSE_PROJECT_NAME=gov-wallet-consent-demo podman-compose down -v --remove-orphans >/dev/null 2>&1 || true
for c in kafka kafka-ui; do
  podman rm -f "$c" >/dev/null 2>&1 || true
done
# Some Podman Desktop versions leave a compose pod behind; remove both legacy and current names
for p in gov-wallet-consent-demo kafka-digital-wallet; do
  podman pod rm -f "$p" >/dev/null 2>&1 || true
done

COMPOSE_PROJECT_NAME=gov-wallet-consent-demo podman-compose up -d
echo "   Kafka UI: http://localhost:8080"

echo "▶ Waiting for kafka health..."
healthy=""
for _ in {1..40}; do
  status=$(podman inspect -f '{{.State.Health.Status}}' kafka 2>/dev/null || echo "")
  if [[ "$status" == "healthy" ]]; then healthy=1; break; fi
  sleep 1
done
if [[ -z "$healthy" ]]; then
  echo "Kafka did not become healthy; check podman logs for 'kafka' and retry." >&2
  exit 1
fi

echo "▶ Creating topics..."
chmod +x scripts/*.sh
bash scripts/topics-create.sh

echo "▶ Installing dependencies..."
( cd services && npm i >/dev/null )
( cd wallet-ui && npm i >/dev/null )
( cd dwp-portal && npm i >/dev/null )

echo "▶ Starting backend services (background)..."
pkill -f mock-consent-api.js || true
pkill -f gatekeeper.js || true
pkill -f dwp-service.js || true
mkdir -p logs
( cd services && RUN_ID=$RUN_ID nohup npm run consent-api >../logs/consent-api.log 2>&1 & echo $! >../logs/consent-api.pid )
( cd services && RUN_ID=$RUN_ID nohup npm run gatekeeper  >../logs/gatekeeper.log 2>&1 & echo $! >../logs/gatekeeper.pid )
( cd services && RUN_ID=$RUN_ID nohup npm run dwp        >../logs/dwp.log 2>&1 & echo $! >../logs/dwp.pid )
sleep 2
# Sanity-check the three services are still alive
for name in consent-api gatekeeper dwp; do
  pid_file="logs/${name}.pid"
  if [[ ! -f $pid_file ]] || ! kill -0 "$(cat $pid_file 2>/dev/null)" 2>/dev/null; then
    echo "Service $name failed to start. Check logs/${name}.log" >&2
    exit 1
  fi
done

echo "▶ Starting UIs (Wallet 5173, DWP 5174) ..."
pkill -f "vite.*5173" || true
pkill -f "vite.*5174" || true
( cd wallet-ui && nohup npm run dev -- --port 5173 >/tmp/wallet.log 2>&1 & )
( cd dwp-portal && nohup npm run dev -- --port 5174  >/tmp/portal.log 2>&1 & )
sleep 2

echo ""
echo "📺 Open:"
echo "  - Wallet:     http://localhost:5173"
echo "  - DWP Portal: http://localhost:5174"
echo "  - Kafka UI:   http://localhost:8080"
echo ""
read -p "Press ENTER to send a DWP consent REQUEST (case 9001 / citizen nhs-999)..." _

curl -s -X POST http://localhost:4000/consent/request \
  -H 'content-type: application/json' \
  -d '{"rp":"dwp","caseId":"9001","citizenId":"nhs-999","scopes":["prescriptions"]}' | jq . || true

echo ""
echo "🔔 In the Wallet, approve the request (Allow for 3 months)."
read -p "Press ENTER AFTER you APPROVE in the Wallet..." _

echo "▶ Publishing RAW now (post-consent so the view fills)..."
bash scripts/seed-raw.sh

echo ""
echo "🔎 Checking DWP case view..."
sleep 2
curl -s http://localhost:5001/api/case/9001/view | jq . | head -n 40 || true

echo ""
echo "✅ Demo ready. In DWP Portal:"
echo "   - Case 9001 status should be 'granted'"
echo "   - Opening Case 9001 shows filtered prescription rows"
echo ""
echo "Troubleshoot logs:"
echo "  tail -n +1 logs/consent-api.log logs/gatekeeper.log logs/dwp.log"
