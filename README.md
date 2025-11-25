# Kafka NHS PoC

Quick start for the local NHS prescription → Kafka demo. For full details see [app/README.md](app/README.md). Host clients should connect to Kafka at **127.0.0.1:29092**.

## Usage
```bash
cd kafka-nhs-poc
podman-compose up -d
bash scripts/topics-create.sh
cd app && npm i
npm run consume            # terminal A (keep open)
npm run produce:nhs        # terminal B
# (Optional UI) open http://localhost:8080
```
