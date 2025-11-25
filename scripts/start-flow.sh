#!/usr/bin/env bash
set -euo pipefail

# Simple one-shot starter for the end-to-end PoC.
# Brings up Kafka via podman-compose, creates topics, installs Node deps,
# launches the consent dashboard + consumer, and then publishes sample events.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT_DIR/app"

cd "$ROOT_DIR"

if ! command -v podman-compose >/dev/null 2>&1; then
  echo "podman-compose is required and was not found in PATH" >&2
  exit 1
fi

# 1) Infra
echo "[1/6] Starting Kafka + Kafka UI with podman-compose..."
podman-compose up -d

# 2) Topics
echo "[2/6] Ensuring required topics exist..."
bash "$ROOT_DIR/scripts/topics-create.sh"

# 3) Dependencies
echo "[3/6] Installing Node dependencies..."
cd "$APP_DIR"
npm install

# 4) Run consent dashboard (keeps UI available)
echo "[4/6] Starting consent dashboard on http://localhost:3000 ..."
KAFKA_BROKER="127.0.0.1:29092" npm run consent:service &
CONSENT_PID=$!

# 5) Run multi-topic consumer
sleep 2
echo "[5/6] Starting consumer for nhs + consent topics..."
TOPICS="nhs.raw.prescriptions,nhs.enriched.prescriptions,dwp.consent.requests,nhs.consent.decisions,nhs.audit.events" npm run consume &
CONSUMER_PID=$!

# 6) Produce demo events
sleep 2
echo "[6/6] Producing sample NHS + DWP events..."
npm run produce:nhs
npm run produce:dwp

echo "---"
echo "Consent UI:   http://localhost:3000"
echo "Kafka UI:     http://localhost:8080"
echo "Kafka broker: 127.0.0.1:29092"
echo "Press Ctrl+C to stop the consumer + consent service" 

trap 'echo "Stopping background services..."; kill $CONSUMER_PID $CONSENT_PID 2>/dev/null || true' INT TERM
wait $CONSUMER_PID $CONSENT_PID
