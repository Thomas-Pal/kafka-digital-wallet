#!/usr/bin/env bash
set -euo pipefail
(cd services && npm run produce:nhs)
(sleep 1; curl -s -X POST localhost:4000/consent/grant -H 'content-type: application/json' \
 -d '{"rp":"dwp","caseId":"4711","citizenId":"nhs-999","scopes":["prescriptions"],"ttlDays":90}' | jq .)
