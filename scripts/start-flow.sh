#!/usr/bin/env bash
set -euo pipefail

# Simple one-shot starter for the end-to-end PoC.
# Brings up Kafka via podman-compose, creates topics, installs Node deps,
# launches the consent dashboard + consumer, and then publishes sample events.

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts=30

  for i in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "✓ ${label} is responding at ${url}"
      return 0
    fi
    sleep 1
  done

  echo "${label} did not become ready after ${attempts}s: ${url}" >&2
  return 1
}

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
COMPOSE_FILE="$ROOT_DIR/podman-compose.yml"

cd "$ROOT_DIR"

# Decide which container runtime + compose command to use.
if command -v podman-compose >/dev/null 2>&1; then
  RUNTIME="podman"
  COMPOSE_CMD=(podman-compose -f "$COMPOSE_FILE")
elif command -v docker-compose >/dev/null 2>&1; then
  RUNTIME="docker"
  COMPOSE_CMD=(docker-compose -f "$COMPOSE_FILE")
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  RUNTIME="docker"
  COMPOSE_CMD=(docker compose -f "$COMPOSE_FILE")
else
  echo "podman-compose or docker compose is required to start Kafka" >&2
  exit 1
fi

# Fail fast if the container runtime is installed but not running (common on macOS with Podman).
if [[ "$RUNTIME" == "podman" ]]; then
  if ! podman ps >/dev/null 2>&1; then
    echo "Podman is installed but not running. Start it first (e.g. 'podman machine start' on macOS)." >&2
    exit 1
  fi
else
  if ! docker ps >/dev/null 2>&1; then
    echo "Docker is installed but not running. Start Docker Desktop or the daemon, then re-run this script." >&2
    exit 1
  fi
fi

echo "[1/11] Stopping any previously running demo Node processes..."
pkill -f 'consent-service.js' 2>/dev/null || true
pkill -f 'consent-gatekeeper.js' 2>/dev/null || true
pkill -f 'dwp-portal.js' 2>/dev/null || true
pkill -f 'simple-consumer.js' 2>/dev/null || true

# 2) Infra
echo "[2/11] Starting Kafka + Kafka UI with $RUNTIME compose..."
"${COMPOSE_CMD[@]}" up -d

# 3) Topics
echo "[3/11] Ensuring required topics exist..."
bash "$ROOT_DIR/scripts/topics-create.sh"

# 4) Dependencies
echo "[4/11] Installing Node dependencies..."
cd "$APP_DIR"
npm install

# 5) Run consent dashboard (keeps UI available)
echo "[5/11] Starting consent dashboard on http://localhost:3000 ..."
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run consent:service &
CONSENT_PID=$!
wait_for_http "http://localhost:3000/healthz" "Consent dashboard"

# 6) Run multi-topic consumer
sleep 2
echo "[6/11] Starting consumer for nhs + consent topics..."
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" TOPICS="nhs.raw.prescriptions,nhs.enriched.prescriptions,dwp.consent.requests,nhs.consent.decisions,nhs.audit.events" npm run consume &
CONSUMER_PID=$!

# 7) Run consent gatekeeper (stream-table join)
sleep 2
echo "[7/11] Starting consent gatekeeper on http://localhost:3100/state ..."
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run consent:gatekeeper &
GATEKEEPER_PID=$!
wait_for_http "http://localhost:3100/state" "Consent gatekeeper"

# 8) Run DWP portal (filtered view)
sleep 2
echo "[8/11] Starting DWP portal on http://localhost:4000 ..."
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run dwp:portal &
DWP_PORTAL_PID=$!
wait_for_http "http://localhost:4000/healthz" "DWP portal"

# 9) Produce consent requests from DWP
sleep 2
echo "[9/11] Producing demo consent requests (DWP)..."
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run produce:dwp

# 10) Auto-approve/reject using the wallet bot so data can flow without manual clicks
echo "[10/11] Auto-deciding demo consent requests via wallet bot..."
CONSENT_URL="http://localhost:3000" npm run decision:bot

# 11) Produce NHS prescription events (will be filtered by gatekeeper)
sleep 2
echo "[11/11] Producing sample NHS prescriptions..."
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run produce:nhs

echo "---"
echo "Consent UI:   http://localhost:3000"
echo "Gatekeeper:   http://localhost:3100/state"
echo "DWP portal:   http://localhost:4000"
echo "Kafka UI:     http://localhost:8080"
echo "Kafka broker: 127.0.0.1:29092"
echo "Press Ctrl+C to stop the consumer + consent service"

trap 'echo "Stopping background services..."; kill $CONSUMER_PID $CONSENT_PID $GATEKEEPER_PID $DWP_PORTAL_PID 2>/dev/null || true' INT TERM
wait $CONSUMER_PID $CONSENT_PID $GATEKEEPER_PID $DWP_PORTAL_PID
