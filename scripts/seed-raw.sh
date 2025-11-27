#!/usr/bin/env bash
set -euo pipefail
( cd services && npm run produce:nhs )
