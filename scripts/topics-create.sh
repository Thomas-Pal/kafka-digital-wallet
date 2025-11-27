#!/usr/bin/env bash
set -euo pipefail
BROKER="127.0.0.1:29092"
podman exec kafka kafka-topics --bootstrap-server $BROKER --create --topic nhs.raw.prescriptions --partitions 1 --replication-factor 1 || true
podman exec kafka kafka-topics --bootstrap-server $BROKER --create --topic consent.events --partitions 1 --replication-factor 1 || true
podman exec kafka kafka-topics --bootstrap-server $BROKER --create --topic views.permitted.dwp.4711.nhs-999 --partitions 1 --replication-factor 1 --config retention.ms=604800000 || true
podman exec kafka kafka-topics --bootstrap-server $BROKER --create --topic views.permitted.dwp.4712.nhs-123 --partitions 1 --replication-factor 1 --config retention.ms=604800000 || true
podman exec kafka kafka-topics --bootstrap-server $BROKER --list
