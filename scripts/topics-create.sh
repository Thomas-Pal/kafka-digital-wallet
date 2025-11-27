#!/usr/bin/env bash
set -euo pipefail
BROKER="127.0.0.1:29092"

if command -v podman >/dev/null 2>&1 && podman ps >/dev/null 2>&1; then
  RUNTIME="podman"
elif command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
  RUNTIME="docker"
else
  echo "Podman or Docker must be running to create topics" >&2
  exit 1
fi

TOPICS=(
  "nhs.raw.prescriptions"
  "nhs.enriched.prescriptions"
  "nhs.audit.events"
  "dwp.consent.requests"
  "nhs.consent.decisions"
  "consent.events"
  "dwp.filtered.prescriptions"
  "dwp.blocked.prescriptions"
)

for topic in "${TOPICS[@]}"; do
  "$RUNTIME" exec kafka kafka-topics --bootstrap-server "$BROKER" \
    --create --topic "$topic" --partitions 1 --replication-factor 1 || true
done

# Consent topics act as a table for joins, so compact them to keep the latest decision per patient ID.
COMPACT_TOPICS=("nhs.consent.decisions" "consent.events")
for topic in "${COMPACT_TOPICS[@]}"; do
  "$RUNTIME" exec kafka kafka-configs --bootstrap-server "$BROKER" \
    --alter --entity-type topics --entity-name "$topic" \
    --add-config cleanup.policy=compact,min.cleanable.dirty.ratio=0.01,delete.retention.ms=1000 || true
done

"$RUNTIME" exec kafka kafka-topics --bootstrap-server "$BROKER" --list
