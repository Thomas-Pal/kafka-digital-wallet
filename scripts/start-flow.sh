#!/usr/bin/env bash
set -euo pipefail

# Simple one-shot starter for the end-to-end PoC.
# Brings up Kafka via podman-compose, creates topics, installs Node deps,
# launches the consent dashboard + consumer, and then publishes sample events.

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

# 1) Infra
echo "[1/7] Starting Kafka + Kafka UI with $RUNTIME compose..."
"${COMPOSE_CMD[@]}" up -d

# 2) Topics
echo "[2/7] Ensuring required topics exist..."
bash "$ROOT_DIR/scripts/topics-create.sh"

# 3) Dependencies
echo "[3/7] Installing Node dependencies..."
cd "$APP_DIR"
npm install

# 4) Run consent dashboard (keeps UI available)
echo "[4/7] Starting consent dashboard on http://localhost:3000 ..."
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run consent:service &
CONSENT_PID=$!

# 5) Run multi-topic consumer
sleep 2
echo "[5/7] Starting consumer for nhs + consent topics..."
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" TOPICS="nhs.raw.prescriptions,nhs.enriched.prescriptions,dwp.consent.requests,nhs.consent.decisions,nhs.audit.events" npm run consume &
CONSUMER_PID=$!

# 6) Run consent gatekeeper (stream-table join)
sleep 2
echo "[6/7] Starting consent gatekeeper on http://localhost:3100/state ..."
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run consent:gatekeeper &
GATEKEEPER_PID=$!

# 6) Produce demo events
sleep 2
echo "[7/7] Producing sample NHS + DWP events..."
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run produce:nhs
KAFKA_BROKERS="127.0.0.1:29092,kafka:9092" npm run produce:dwp

echo "---"
echo "Consent UI:   http://localhost:3000"
echo "Gatekeeper:   http://localhost:3100/state"
echo "Kafka UI:     http://localhost:8080"
echo "Kafka broker: 127.0.0.1:29092"
echo "Press Ctrl+C to stop the consumer + consent service"

trap 'echo "Stopping background services..."; kill $CONSUMER_PID $CONSENT_PID $GATEKEEPER_PID 2>/dev/null || true' INT TERM
wait $CONSUMER_PID $CONSENT_PID $GATEKEEPER_PID
