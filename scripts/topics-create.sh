#!/usr/bin/env bash
set -euo pipefail
BROKER="127.0.0.1:29092"

TOPICS=(
  "nhs.raw.prescriptions"
  "nhs.enriched.prescriptions"
  "nhs.audit.events"
  "dwp.consent.requests"
  "nhs.consent.decisions"
)

for topic in "${TOPICS[@]}"; do
  podman exec kafka kafka-topics --bootstrap-server "$BROKER" \
    --create --topic "$topic" --partitions 1 --replication-factor 1 || true
done

podman exec kafka kafka-topics --bootstrap-server "$BROKER" --list
