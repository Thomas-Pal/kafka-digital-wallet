#!/usr/bin/env bash
set -euo pipefail
BROKER="127.0.0.1:29092"

if command -v podman >/dev/null 2>&1 && podman ps >/dev/null 2>&1; then
  RUNTIME="podman"
elif command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
  RUNTIME="docker"
else
  echo "Podman or Docker must be running to list topics" >&2
  exit 1
fi

"$RUNTIME" exec kafka kafka-topics --bootstrap-server $BROKER --list

