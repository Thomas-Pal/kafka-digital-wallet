#!/usr/bin/env bash
set -euo pipefail

# Simple one-shot starter for the end-to-end PoC.
# Brings up Kafka via podman-compose, creates topics, installs Node deps,
# launches the consent dashboard + consumer, and then publishes sample events.

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts=60

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

wait_for_json_field_ge() {
  local url="$1"
  local field="$2"
  local threshold="$3"
  local label="$4"
  local attempts=40

  for i in $(seq 1 "$attempts"); do
    local body
    body=$(curl -fsS "$url" 2>/dev/null || true)
    if python - "$field" "$threshold" "$body" >/dev/null 2>&1 <<'PY'
import json, sys
try:
    field = sys.argv[1]
    threshold = float(sys.argv[2])
    raw = sys.argv[3] if len(sys.argv) > 3 else "{}"
    data = json.loads(raw)
    for part in field.split('.'):
        if isinstance(data, dict) and part in data:
            data = data[part]
        else:
            raise KeyError(part)
    value = float(data)
    if value >= threshold:
        sys.exit(0)
except Exception:
    pass
sys.exit(1)
PY
    then
      echo "✓ ${label} ready (${field} >= ${threshold})"
      return 0
    fi
    sleep 1
  done

  echo "${label} did not reach ${field} >= ${threshold} after ${attempts} attempts: ${url}" >&2
  return 1
}

kill_port() {
  local port="$1"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti tcp:"${port}" || true)
  elif command -v fuser >/dev/null 2>&1; then
    pids=$(fuser "${port}/tcp" 2>/dev/null || true)
  fi

  if [[ -n "$pids" ]]; then
    echo "Killing processes on port ${port}: ${pids}"
    kill ${pids} 2>/dev/null || true
    sleep 1
  fi
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

DEMO_RUN_ID=$(date +%s)

echo "[1/13] Stopping any previously running demo Node processes..."
pkill -f 'consent-service.js' 2>/dev/null || true
pkill -f 'consent-gatekeeper.js' 2>/dev/null || true
pkill -f 'dwp-portal.js' 2>/dev/null || true
pkill -f 'simple-consumer.js' 2>/dev/null || true
kill_port 3000
kill_port 3100
kill_port 4000

# 2) Infra
echo "[2/13] Starting Kafka + Kafka UI with $RUNTIME compose..."
"${COMPOSE_CMD[@]}" up -d

# 3) Topics
echo "[3/13] Ensuring required topics exist..."
bash "$ROOT_DIR/scripts/topics-create.sh"

# 4) Dependencies
echo "[4/13] Installing Node dependencies..."
cd "$APP_DIR"
npm install

# 5) Run consent dashboard (keeps UI available)
echo "[5/13] Starting consent dashboard on http://localhost:3000 ..."
DEMO_RUN_ID="$DEMO_RUN_ID" KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run consent:service &
CONSENT_PID=$!
wait_for_http "http://localhost:3000/healthz" "Consent dashboard"
wait_for_json_field_ge "http://localhost:3000/api/status" "kafkaReady" 1 "Consent dashboard (Kafka)"

# 6) Run multi-topic consumer
sleep 2
echo "[6/13] Starting consumer for nhs + consent topics..."
DEMO_RUN_ID="$DEMO_RUN_ID" KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" TOPICS="nhs.raw.prescriptions,nhs.enriched.prescriptions,dwp.consent.requests,nhs.consent.decisions,nhs.audit.events" npm run consume &
CONSUMER_PID=$!

# 7) Run consent gatekeeper (stream-table join)
sleep 2
echo "[7/13] Starting consent gatekeeper on http://localhost:3100/state ..."
DEMO_RUN_ID="$DEMO_RUN_ID" KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run consent:gatekeeper &
GATEKEEPER_PID=$!
wait_for_http "http://localhost:3100/healthz" "Consent gatekeeper"
wait_for_json_field_ge "http://localhost:3100/state" "kafkaReady" 1 "Consent gatekeeper (Kafka)"

# 8) Run DWP portal (filtered view)
sleep 2
echo "[8/13] Starting DWP portal on http://localhost:4000 ..."
DEMO_RUN_ID="$DEMO_RUN_ID" KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run dwp:portal &
DWP_PORTAL_PID=$!
wait_for_http "http://localhost:4000/healthz" "DWP portal"
wait_for_json_field_ge "http://localhost:4000/api/state" "kafkaReady" 1 "DWP portal (Kafka)"

# 9) Produce consent requests from DWP
sleep 2
echo "[9/13] Producing demo consent requests (DWP)..."
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run produce:dwp

echo "[10/13] Waiting for consent requests to register..."
wait_for_json_field_ge "http://localhost:3000/api/status" "pendingCount" 1 "Consent requests registered"

# 10) Auto-approve/reject using the wallet bot so data can flow without manual clicks
echo "[11/13] Auto-deciding demo consent requests via wallet bot..."
CONSENT_URL="http://localhost:3000" npm run decision:bot

echo "[12/13] Waiting for gatekeeper to cache consent decisions..."
wait_for_json_field_ge "http://localhost:3100/state" "consentCacheSize" 1 "Gatekeeper consent cache"

# 11) Produce NHS prescription events (will be filtered by gatekeeper)
sleep 2
echo "[13/13] Producing sample NHS prescriptions..."
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run produce:nhs

echo "[post] Waiting for the DWP portal to show delivered or blocked events..."
wait_for_json_field_ge "http://localhost:4000/api/state" "deliveredCount" 1 "DWP portal delivered view" || true
wait_for_json_field_ge "http://localhost:4000/api/state" "blockedCount" 1 "DWP portal blocked view" || true

echo "---"
echo "Consent UI:    http://localhost:3000"
echo "Gatekeeper:    http://localhost:3100/state"
echo "DWP portal:    http://localhost:4000"
echo "Kafka UI:      http://localhost:8080"
echo "Kafka broker:  127.0.0.1:29092"
echo "Demo run ID:   ${DEMO_RUN_ID}" 
echo "Press Ctrl+C to stop the consumer + consent service"

trap 'echo "Stopping background services..."; kill $CONSUMER_PID $CONSENT_PID $GATEKEEPER_PID $DWP_PORTAL_PID 2>/dev/null || true' INT TERM
wait $CONSUMER_PID $CONSENT_PID $GATEKEEPER_PID $DWP_PORTAL_PID
