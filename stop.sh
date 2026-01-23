#!/usr/bin/env bash
set -euo pipefail
lsof -ti:4000,5001,5002,5173,5174 | xargs -r kill -9 || true
pkill -f "orchestration-api.js" >/dev/null 2>&1 || true
pkill -f "gatekeeper.js" >/dev/null 2>&1 || true
pkill -f "dwp-service.js" >/dev/null 2>&1 || true
pkill -f "hmrc-api.js" >/dev/null 2>&1 || true
pkill -f "coach-api.js" >/dev/null 2>&1 || true
podman compose down || true
echo "Stopped."
