# Kafka NHS PoC

Quick start for the local NHS prescription → Kafka demo, now with DWP consent requests and an embedded consent UI. For full details see [app/README.md](app/README.md). Host clients should connect to Kafka at **127.0.0.1:29092**.

## Usage
```bash
cd kafka-nhs-poc
podman-compose up -d
bash scripts/topics-create.sh
cd app && npm i
npm run consume            # terminal A (keep open)
npm run consent:service    # terminal B (serves UI at http://localhost:3000)
npm run produce:nhs        # terminal C
npm run produce:dwp        # terminal D triggers consent flow
# (Optional UI) open http://localhost:8080 for Kafka UI
```
