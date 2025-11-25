#!/usr/bin/env bash
set -euo pipefail
BROKER="127.0.0.1:29092"
podman exec kafka kafka-topics --bootstrap-server $BROKER --list

