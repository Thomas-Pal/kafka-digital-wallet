#!/usr/bin/env bash
set -euo pipefail
pkill -f "orchestration-api" >/dev/null 2>&1 || true
pkill -f "gatekeeper" >/dev/null 2>&1 || true
pkill -f "dwp-api" >/dev/null 2>&1 || true
pkill -f "vite.*5173" >/dev/null 2>&1 || true
pkill -f "vite.*5174" >/dev/null 2>&1 || true
