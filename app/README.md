# Digital Consent Wallet → Kafka PoC (Podman)

A slightly richer corporate PoC showing NHS prescription flows, DWP consent requests, and a digital wallet UI where citizens approve or deny data sharing before messages are published back to Kafka.

## 0) Start infra
```bash
podman-compose up -d                             # Podman (ensure podman machine is running on macOS)
# or: docker compose -f ../podman-compose.yml up -d   # Docker
# UI at http://localhost:8080 (cluster: local)
```

> If you run the Node scripts inside a container, set `KAFKA_BROKER=kafka:9092` (or the reachable listener for your broker). The scripts default to `127.0.0.1:29092` for host execution and also accept a comma-separated `KAFKA_BROKERS` list (e.g. `127.0.0.1:29092,kafka:9092`).

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

## 5) Run consent wallet service + UI
```bash
npm run consent:service
# UI/API at http://localhost:3000
```
Consumes DWP requests, queues them for wallet approval, and publishes citizen decisions to `nhs.consent.decisions` plus audit entries to `nhs.audit.events`. The dashboard auto-refreshes every few seconds and shows a waiting state until requests arrive.

## 6) Produce DWP consent requests
Open a second terminal while the service is running:
```bash
npm run produce:dwp
```
This triggers consent decisions and populates the UI/API.

From the wallet dashboard you can approve or reject each inbound request. Approvals and rejections are streamed back to Kafka for downstream consumers and audit capture.

## One-step demo (bootstrap everything)
From the repo root:
```bash
bash scripts/start-flow.sh
```
This brings up Kafka, creates topics, installs Node deps, starts the consent dashboard + consumer, and sends sample NHS and DWP events. Open `http://localhost:3000` to watch the decisions arrive.

## Expected
* Producer logs show RAW + ENRICHED prescription events.
* Wallet UI lists pending DWP requests until you approve or reject them.
* Consent service logs `✅ user decision captured ...` once you take action from the wallet.
* Consumer displays traffic across all configured topics.
* Kafka UI shows topic growth; the consent UI at `http://localhost:3000` lists recent decisions.

## To stop
```bash
podman-compose down -v
```
