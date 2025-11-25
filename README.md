# Kafka Digital Consent Wallet PoC

Quick start for a local NHS prescription → Kafka demo, now modelled as a digital wallet where citizens approve or reject DWP data access. For full details see [app/README.md](app/README.md). Host clients should connect to Kafka at **127.0.0.1:29092**.

## Usage
```bash
cd kafka-nhs-poc
podman-compose up -d   # or: docker compose -f podman-compose.yml up -d
bash scripts/topics-create.sh
cd app && npm i
npm run consume            # terminal A (keep open)
npm run consent:service    # terminal B (serves UI at http://localhost:3000)
npm run produce:nhs        # terminal C
npm run produce:dwp        # terminal D triggers consent flow
# (Optional UI) open http://localhost:8080 for Kafka UI
```

Or run the whole sequence (infra, topics, install, dashboard, consumer, producers) with a single helper:
```bash
bash scripts/start-flow.sh   # requires Podman (podman machine up) or Docker running
# consent UI at http://localhost:3000, Kafka UI at http://localhost:8080
```
