# Kafka Digital Consent Wallet PoC

Quick start for a local NHS prescription → Kafka demo, now modelled as a digital wallet where citizens approve or reject DWP data access. For full details see [app/README.md](app/README.md). Host clients should connect to Kafka at **127.0.0.1:29092** (or `kafka:9092` inside containers); the scripts accept a comma-separated `KAFKA_BROKERS` list and now default to `127.0.0.1:29092,kafka:9092` so either listener works out of the box.

## Usage
```bash
cd kafka-nhs-poc
podman-compose up -d   # or: docker compose -f podman-compose.yml up -d
bash scripts/topics-create.sh
cd app && npm i
npm run consume            # terminal A (keep open)
npm run consent:service    # terminal B (serves UI at http://localhost:3000)
npm run produce:nhs        # terminal C
npm run consent:gatekeeper # terminal D performs stream-table join + publishes filtered view
npm run dwp:portal         # terminal E shows filtered NHS view for DWP at http://localhost:4000
# From the portal, send consent requests to the wallet and approve/reject in the wallet UI.
# The gatekeeper caches raw prescriptions and replays them to the DWP filtered topic as soon as consent is approved.
# (Optional UI) open http://localhost:8080 for Kafka UI
```

Or run the whole sequence (infra, topics, install, dashboard, consumer, gatekeeper, portal) with a single helper:
```bash
bash scripts/start-flow.sh   # requires Podman (podman machine up) or Docker running
# consent UI at http://localhost:3000, Kafka UI at http://localhost:8080
# DWP portal at http://localhost:4000 (filtered by consent via gatekeeper service)
# Flow: the script publishes NHS prescriptions first (as if a GP visit already happened), then you send/approve consent from the portal/wallet to unlock the cached record for the DWP caseworker. Sample GP events are produced for nhs-999, nhs-123, and nhs-777 so they match the caseworker buttons.
```

The DWP filtered view intentionally starts empty: the gatekeeper now withholds publishing until a consent decision is received. Approvals replay the cached NHS prescription into `dwp.filtered.prescriptions`, and explicit rejections are the only time a record appears in `dwp.blocked.prescriptions`.
