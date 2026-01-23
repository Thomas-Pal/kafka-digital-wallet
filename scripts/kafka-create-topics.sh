#!/usr/bin/env bash
set -euo pipefail
BOOT=${1:-127.0.0.1:29092}
topics=(
  consent.events
  nhs.prescriptions
  employment.termination
  hmrc.p45.summary
  views.permitted.dwp.uc
  views.permitted.dwp.disability
  views.permitted.coach.basic
)
if [[ "${RESET_TOPICS:-0}" == "1" ]]; then
  for t in "${topics[@]}"; do
    podman exec kafka kafka-topics --bootstrap-server "$BOOT" --delete --topic "$t" >/dev/null 2>&1 || true
  done
fi
for t in "${topics[@]}"; do
  podman exec kafka kafka-topics --bootstrap-server "$BOOT" --create --if-not-exists --topic "$t" --partitions 3 --replication-factor 1 || true
done
podman exec kafka kafka-topics --bootstrap-server "$BOOT" --list
