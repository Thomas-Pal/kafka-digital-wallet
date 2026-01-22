#!/usr/bin/env bash
set -euo pipefail
BOOT=${1:-127.0.0.1:29092}
echo "Waiting for Kafka at $BOOT..."
for i in {1..60}; do
  if echo >/dev/tcp/127.0.0.1/29092 2>/dev/null; then
    # Try a quick admin request
    podman exec kafka kafka-topics --bootstrap-server $BOOT --list >/dev/null 2>&1 && {
      echo "Kafka ready."; exit 0;
    }
  fi
  sleep 1
done
echo "Kafka not ready in time" >&2
exit 1
