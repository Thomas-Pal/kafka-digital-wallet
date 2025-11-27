#!/usr/bin/env bash
# One-hit demo runner: brings up Kafka, creates topics, installs deps, starts services and dev servers.
# It pauses for manual actions (wallet consent) and streams logs to ./logs/*.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

pids=()
cleanup() {
  echo "\nStopping demo processes..."
  for pid in "${pids[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT

run_bg() {
  local name="$1"
  local cmd="$2"
  echo "Starting $name (logs -> $LOG_DIR/$name.log)"
  bash -c "$cmd" >"$LOG_DIR/$name.log" 2>&1 &
  local pid=$!
  pids+=("$pid")
}

cd "$ROOT_DIR"

echo "1) Bring up Kafka and Kafka UI"
if ! command -v podman >/dev/null 2>&1; then
  echo "podman is required for this demo. Install podman and podman-compose."
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for this demo. Install jq (e.g., brew install jq)."
  exit 1
fi

# On macOS podman needs a VM; create+start it if it doesn't exist yet to avoid exit 125
if [[ "$(uname -s)" == "Darwin" ]] && podman machine ls >/dev/null 2>&1; then
  machines_json=$(podman machine ls --format json 2>/dev/null || echo '[]')
  machine_count=$(echo "$machines_json" | jq 'length' 2>/dev/null || echo 0)
  if [ "$machine_count" -eq 0 ]; then
    echo "No podman machine found. Creating 'podman-machine-default' and starting it..."
    # macOS podman 4.x expects the machine name without --name
    podman machine init podman-machine-default --now
  else
    state=$(podman machine inspect --format '{{.State}}' 2>/dev/null || true)
    if [ "$state" != "running" ]; then
      echo "Starting podman machine (was: ${state:-unknown})..."
      podman machine start
    fi
  fi
fi

podman-compose up -d

until podman exec kafka kafka-topics --bootstrap-server 127.0.0.1:29092 --list >/dev/null 2>&1; do
  echo "Waiting for Kafka to become healthy..."
  sleep 2
done

echo "2) Create demo topics"
bash "$ROOT_DIR/scripts/topics-create.sh"

echo "3) Install npm deps (services, wallet-ui, dwp-portal)"
(cd services && npm install)
(cd wallet-ui && npm install)
(cd dwp-portal && npm install)

echo "4) Start backend services"
run_bg consent-api "cd '$ROOT_DIR/services' && npm run consent-api"
run_bg gatekeeper "cd '$ROOT_DIR/services' && npm run gatekeeper"
run_bg dwp-api "cd '$ROOT_DIR/services' && npm run dwp"

sleep 2
echo "5) Start UIs (Vite dev servers)"
run_bg wallet-ui "cd '$ROOT_DIR/wallet-ui' && npm run dev -- --host --port 5173"
run_bg dwp-portal "cd '$ROOT_DIR/dwp-portal' && npm run dev -- --host --port 5174"

echo "6) Seed RAW prescriptions"
(cd services && npm run produce:nhs)

cat <<'MSG'
---
Next manual steps:
- Open wallet UI:   http://localhost:5173
  - Click "Allow" (grant) or "Revoke" for case #4711 / nhs-999.
- Open DWP portal:  http://localhost:5174
  - Send a consent request for a case, watch the indicator flip when approved.
Logs live under ./logs/*.log. Hit Ctrl+C to stop and tear down the background processes.
MSG

wait
