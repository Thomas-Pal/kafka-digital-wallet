#!/usr/bin/env bash
set -euo pipefail
lsof -ti:4000,5001,5002,5173,5174 | xargs -r kill -9 || true
podman compose down || true
echo "Stopped."
