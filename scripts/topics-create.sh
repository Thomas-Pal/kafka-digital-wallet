#!/usr/bin/env bash
set -euo pipefail
BROKER="127.0.0.1:29092"

# Clean any stale VIEW topics from previous runs so we only see consent-driven ones
for topic in $(podman exec kafka kafka-topics --bootstrap-server $BROKER --list | tr '\r' '\n' | grep '^views.permitted.dwp.' || true); do
  podman exec kafka kafka-topics --bootstrap-server $BROKER --delete --topic "$topic" || true
done

podman exec kafka kafka-topics --bootstrap-server $BROKER --create --topic nhs.prescriptions --partitions 1 --replication-factor 1 || true
podman exec kafka kafka-topics --bootstrap-server $BROKER --create --topic employment.termination --partitions 1 --replication-factor 1 || true
podman exec kafka kafka-topics --bootstrap-server $BROKER --create --topic consent.events --partitions 1 --replication-factor 1 || true

# VIEW topics will be created dynamically when first written by Gatekeeper
podman exec kafka kafka-topics --bootstrap-server $BROKER --list
