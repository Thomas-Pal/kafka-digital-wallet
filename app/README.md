# NHS → Kafka PoC (Podman)

A slightly richer corporate PoC showing NHS prescription flows, DWP consent requests, and a simple consent management UI built on Kafka.

### Scenario (UK digital wallet placeholder)
- The consent service models the UK digital wallet (mobile-first, web UI for this PoC).
- A patient attends a GP appointment and their NHS prescription changes (RAW + ENRICHED events).
- The patient then starts a benefits change with DWP. DWP sends a consent/access request to view updated prescription data.
- The consent service evaluates the request, records an audit event, and publishes the decision back to Kafka for downstream systems and UI display.

## 0) Start infra
```bash
podman-compose up -d
# UI at http://localhost:8080 (cluster: local)
```

## 1) Create topics
```bash
bash ../scripts/topics-create.sh
# creates nhs.raw.prescriptions, nhs.enriched.prescriptions, nhs.audit.events, dwp.consent.requests, nhs.consent.decisions
```

## 2) Install deps
```bash
cd app && npm i
```

## 3) Run a consumer (multi-topic view)
```bash
npm run consume
# set TOPICS="nhs.consent.decisions" npm run consume   # optional override
```

## 4) Produce mock NHS prescription events
```bash
npm run produce:nhs
```
Emits both `nhs.raw.prescriptions` and `nhs.enriched.prescriptions` events per patient.

## 5) Run consent management service + UI
```bash
npm run consent:service
# UI/API defaults to http://localhost:3000; set PORT=3001 npm run consent:service to avoid port clashes
```
Consumes DWP requests, publishes decisions to `nhs.consent.decisions` and audit entries to `nhs.audit.events`. The dashboard
auto-refreshes every few seconds and shows a waiting state until requests arrive.

## 6) Produce DWP consent requests
Open a second terminal while the service is running:
```bash
npm run produce:dwp
```
This triggers consent decisions and populates the UI/API.

## One-step demo (bootstrap everything)
From the repo root:
```bash
bash scripts/start-flow.sh
```
This brings up Kafka, creates topics, installs Node deps, starts the consent dashboard + consumer, and sends sample NHS and DWP events. The script chooses the first free port from 3000 for the consent UI (override with `CONSENT_PORT=3001 bash scripts/start-flow.sh`).

## Expected
* Producer logs show RAW + ENRICHED prescription events.
* Consent service logs `✅ consent decision ...` for each inbound DWP request.
* Consumer displays traffic across all configured topics.
* Kafka UI shows topic growth; the consent UI at `http://localhost:3000` lists recent decisions.

## To stop
```bash
podman-compose down -v
```
