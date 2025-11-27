#!/usr/bin/env bash
set -euo pipefail
podman exec kafka kafka-topics --bootstrap-server 127.0.0.1:29092 --list
