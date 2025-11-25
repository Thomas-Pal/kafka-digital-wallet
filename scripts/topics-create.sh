#!/usr/bin/env bash
set -euo pipefail
BROKER="127.0.0.1:29092"

podman exec kafka kafka-topics --bootstrap-server $BROKER \
  --create --topic nhs.raw.prescriptions --partitions 1 --replication-factor 1 || true

podman exec kafka kafka-topics --bootstrap-server $BROKER --list

