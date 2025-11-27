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

wait_for_decision() {
  local attempts=600
  local url="http://localhost:3000/api/decisions"

  for i in $(seq 1 "$attempts"); do
    local count
    count=$(curl -fsS "$url" 2>/dev/null | node -e "let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>{try{const parsed=JSON.parse(data||'[]');if(Array.isArray(parsed)){console.log(parsed.length);}else if(parsed && typeof parsed==='object'){console.log(Object.keys(parsed).length);}else{console.log(0);}}catch(e){console.log(0);}});")
    if [[ "$count" -ge 1 ]]; then
      echo "✓ Wallet has recorded at least one decision (${count} total)"
      return 0
    fi
    sleep 1
  done

  echo "Wallet decisions did not arrive after ${attempts}s; you can still run 'npm run produce:nhs' later once approved." >&2
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

DEMO_RUN_ID=$(date +%s)

echo "[1/9] Stopping any previously running demo Node processes..."
pkill -f 'consent-service.js' 2>/dev/null || true
pkill -f 'consent-gatekeeper.js' 2>/dev/null || true
pkill -f 'dwp-portal.js' 2>/dev/null || true
pkill -f 'simple-consumer.js' 2>/dev/null || true
kill_port 3000
kill_port 3100
kill_port 4000

# 2) Infra
echo "[2/9] Starting Kafka + Kafka UI with $RUNTIME compose..."
"${COMPOSE_CMD[@]}" up -d

# 3) Topics
echo "[3/9] Ensuring required topics exist..."
bash "$ROOT_DIR/scripts/topics-create.sh"

# 4) Dependencies
echo "[4/9] Installing Node dependencies..."
cd "$APP_DIR"
npm install

# 5) Run consent dashboard (keeps UI available)
echo "[5/9] Starting consent dashboard on http://localhost:3000 ..."
DEMO_RUN_ID="$DEMO_RUN_ID" KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run consent:service &
CONSENT_PID=$!
wait_for_http "http://localhost:3000/healthz" "Consent dashboard"

# 6) Run multi-topic consumer
sleep 2
echo "[6/9] Starting consumer for nhs + consent topics..."
DEMO_RUN_ID="$DEMO_RUN_ID" KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" TOPICS="nhs.raw.prescriptions,nhs.enriched.prescriptions,dwp.consent.requests,nhs.consent.decisions,nhs.audit.events" npm run consume &
CONSUMER_PID=$!

# 7) Run consent gatekeeper (stream-table join)
sleep 2
echo "[7/9] Starting consent gatekeeper on http://localhost:3100/state ..."
DEMO_RUN_ID="$DEMO_RUN_ID" KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run consent:gatekeeper &
GATEKEEPER_PID=$!
wait_for_http "http://localhost:3100/healthz" "Consent gatekeeper"

# 8) Run DWP portal (filtered view)
sleep 2
echo "[8/9] Starting DWP portal on http://localhost:4000 ..."
DEMO_RUN_ID="$DEMO_RUN_ID" KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run dwp:portal &
DWP_PORTAL_PID=$!
wait_for_http "http://localhost:4000/healthz" "DWP portal"

# 9) Wait for a wallet decision, then produce NHS records that will be gated by consent
sleep 2
echo "[9/9] Waiting for a consent decision (approve/reject) before publishing NHS prescriptions..."
if wait_for_decision; then
  KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run produce:nhs
else
  echo "Skipping automatic NHS publish; re-run 'npm run produce:nhs' once a consent decision exists."
fi

echo "---"
echo "Consent UI:    http://localhost:3000"
echo "Gatekeeper:    http://localhost:3100/state"
echo "DWP portal:    http://localhost:4000"
echo "Kafka UI:      http://localhost:8080"
echo "Kafka broker:  127.0.0.1:29092"
echo "Demo run ID:   ${DEMO_RUN_ID}"
echo "Use the DWP portal to send a consent request to the wallet, then approve/reject it in the consent UI."
echo "Press Ctrl+C to stop the consumer + consent service"

trap 'echo "Stopping background services..."; kill $CONSUMER_PID $CONSENT_PID $GATEKEEPER_PID $DWP_PORTAL_PID 2>/dev/null || true' INT TERM
wait $CONSUMER_PID $CONSENT_PID $GATEKEEPER_PID $DWP_PORTAL_PID
