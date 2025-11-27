# Digital Consent Wallet → Kafka PoC (Podman)

A slightly richer corporate PoC showing NHS prescription flows, DWP consent requests, and a digital wallet UI where citizens approve or deny data sharing before messages are published back to Kafka.

## 0) Start infra
```bash
podman-compose up -d                             # Podman (ensure podman machine is running on macOS)
# or: docker compose -f ../podman-compose.yml up -d   # Docker
# UI at http://localhost:8080 (cluster: local)
```

> If you run the Node scripts inside a container, set `KAFKA_BROKER=kafka:9092` (or the reachable listener for your broker). The scripts default to `127.0.0.1:29092` for host execution and also accept a comma-separated `KAFKA_BROKERS` list (e.g. `127.0.0.1:29092,kafka:9092`).

## 1) Create topics (with compacted consent streams)
```bash
bash ../scripts/topics-create.sh
# creates nhs.raw.prescriptions, nhs.enriched.prescriptions, nhs.audit.events, dwp.consent.requests, nhs.consent.decisions
```
Consent streams (`nhs.consent.decisions` and `consent.events`) are compacted so the gatekeeper can treat them like a KTable keyed by patient ID.

## 2) Install deps
```bash
cd app && npm i
```

## 3) Run a consumer (multi-topic view)
```bash
npm run consume
# set TOPICS="nhs.consent.decisions" npm run consume   # optional override
```

## 4) Run consent wallet service + UI
```bash
npm run consent:service
# UI/API at http://localhost:3000
```
Consumes DWP requests, queues them for wallet approval, and publishes citizen decisions to `nhs.consent.decisions` plus audit entries to `nhs.audit.events`. The dashboard auto-refreshes every few seconds and shows a waiting state until requests arrive.
Send consent requests from the DWP portal to populate the wallet queue for testing.

## 6) Start the consent gatekeeper (Kafka Streams-style join)
```bash
npm run consent:gatekeeper
# HTTP state at http://localhost:3100/state
```
This service performs a stream-table join: it builds an in-memory table of consent decisions from `nhs.consent.decisions` and `consent.events`, reads `nhs.raw.prescriptions`, and publishes approved rows to `dwp.filtered.prescriptions` while sending blocked rows to `dwp.blocked.prescriptions` with a rejection reason.

## 7) Produce DWP consent requests
Open a second terminal while the service is running:
```bash
npm run produce:dwp
npm run dwp:portal
```
This simulates the GP logging a prescription before DWP has asked for consent. The gatekeeper will hold the latest raw event per patient and evaluate it once consent arrives. Sample events are emitted for `nhs-999`, `nhs-123`, and `nhs-777` so they line up with the caseworker buttons in the portal.

## 7) Use the DWP caseworker portal to request consent
Run `npm run dwp:portal` to open http://localhost:4000. Send a consent request for the patient, then switch to the wallet UI to approve or reject access (and set the retention). When an approval arrives, the gatekeeper replays the cached raw prescription into `dwp.filtered.prescriptions`; rejections move the record into `dwp.blocked.prescriptions`.

The mock DWP portal (`npm run dwp:portal`) listens on http://localhost:4000 and reads the pre-filtered topics from the gatekeeper: approved events from `dwp.filtered.prescriptions` and blocked attempts from `dwp.blocked.prescriptions`. It still displays the latest consent decisions for context.

## One-step demo (bootstrap everything)
From the repo root:
```bash
bash scripts/start-flow.sh
```
This brings up Kafka, creates topics, installs Node deps, starts the consent dashboard + consumer + gatekeeper + DWP portal, and sends sample NHS and DWP events. Open `http://localhost:3000` for the wallet and `http://localhost:4000` for the DWP filtered view.

## Expected
* Producer logs show RAW + ENRICHED prescription events.
* Wallet UI lists pending DWP requests until you approve or reject them.
* DWP portal only surfaces NHS records for patients with an approved consent; others are shown as blocked.
* Consent service logs `✅ user decision captured ...` once you take action from the wallet.
* Consumer displays traffic across all configured topics.
* Kafka UI shows topic growth; the consent UI at `http://localhost:3000` lists recent decisions.

## To stop
```bash
podman-compose down -v
```
