#!/usr/bin/env bash
set -euo pipefail

RUN_ID="${RUN_ID:-$(date +%s)}"
export RUN_ID

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)

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

echo "▶ Killing stale processes on ports (4000,5001,5002,5173,5174)..."
for p in 4000 5001 5002 5173 5174; do
  pid=$(lsof -t -i tcp:$p) && kill -9 $pid || true
done
pkill -f "orchestration-api" >/dev/null 2>&1 || true
pkill -f "gatekeeper" >/dev/null 2>&1 || true
pkill -f "dwp-api" >/dev/null 2>&1 || true
pkill -f "vite.*5173" >/dev/null 2>&1 || true
pkill -f "vite.*5174" >/dev/null 2>&1 || true

wait_health() {
  local url="$1"
  local name="$2"
  for _ in {1..30}; do
    if curl -sf "$url" >/dev/null; then
      echo "✅ $name ready"
      return
    fi
    sleep 1
  done
  echo "❌ $name failed health check" >&2
  exit 1
}

echo "▶ Starting Kafka + UI (Podman compose)..."
COMPOSE_PROJECT_NAME=gov-wallet-consent-demo podman-compose down -v --remove-orphans >/dev/null 2>&1 || true
for c in kafka kafka-ui; do
  podman rm -f "$c" >/dev/null 2>&1 || true
done
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
podman exec kafka bash -lc '
  for t in views.permitted.dwp.uc views.permitted.dwp.pip employment.termination nhs.prescriptions consent.events; do
    kafka-topics --bootstrap-server localhost:9092 --delete --topic $t >/dev/null 2>&1 || true
  done
  for t in consent.events employment.termination nhs.prescriptions views.permitted.dwp.uc views.permitted.dwp.pip; do
    kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic $t --partitions 1 --replication-factor 1
  done
  kafka-topics --bootstrap-server localhost:9092 --list
'

echo "▶ Installing dependencies..."
( cd "$ROOT_DIR/services" && npm i >/dev/null )
( cd "$ROOT_DIR/apps/wallet" && npm i >/dev/null )
( cd "$ROOT_DIR/dwp-portal" && npm i >/dev/null )

echo "▶ Starting backend services (background)..."
( cd "$ROOT_DIR/services" && env RUN_ID="$RUN_ID" npm run orchestration-api & )
( cd "$ROOT_DIR/services" && env RUN_ID="$RUN_ID" npm run gatekeeper & )
( cd "$ROOT_DIR/services" && env RUN_ID="$RUN_ID" npm run dwp-api & )

wait_health "http://localhost:4000/healthz" "Orchestration API"
wait_health "http://localhost:5002/healthz" "Gatekeeper"
wait_health "http://localhost:5001/healthz" "DWP API"

echo "▶ Starting UIs (Wallet 5173, DWP 5174) ..."
( cd "$ROOT_DIR/apps/wallet" && npm run dev -- --port 5173 & )
( cd "$ROOT_DIR/dwp-portal" && npm run dev -- --port 5174 & )
sleep 2

echo
echo "📺 Open:"
echo "  - Wallet:     http://localhost:5173"
echo "  - DWP Portal: http://localhost:5174"
echo "  - Kafka UI:   http://localhost:8080"

echo
echo "✅ Demo is ready. Use Wallet → Scenario Lab to trigger mock events."

echo
echo "📺 Open (copy/paste):"
echo "  Wallet: http://localhost:5173"
echo "  DWP:    http://localhost:5174"
echo "  Kafka:  http://localhost:8080"
