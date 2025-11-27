#!/usr/bin/env bash
set -euo pipefail

echo "▶ Preconditions"
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
COMPOSE_PROJECT_NAME=gov-wallet-consent-demo podman-compose up -d
echo "   Kafka UI: http://localhost:8080"

echo "▶ Waiting for kafka health..."
for _ in {1..30}; do
  status=$(podman inspect -f '{{.State.Health.Status}}' kafka 2>/dev/null || echo "")
  [[ "$status" == "healthy" ]] && break
  sleep 1
done

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
( cd services && nohup npm run consent-api >/tmp/consent-api.log 2>&1 & )
( cd services && nohup npm run gatekeeper  >/tmp/gatekeeper.log 2>&1 & )
( cd services && nohup npm run dwp        >/tmp/dwp.log 2>&1 & )
sleep 1

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
echo "  tail -n +1 /tmp/consent-api.log /tmp/gatekeeper.log /tmp/dwp.log"
