# NHS → Kafka PoC (Podman)

## 0) Start infra
```bash
podman-compose up -d
# UI at http://localhost:8080 (cluster: local)

1) Create topic
bash ../scripts/topics-create.sh

2) Install deps
cd app && npm i

3) Run a consumer (to show events arriving)
npm run consume

4) Produce mock NHS events

Open a second terminal:

cd app
npm run produce:nhs


Expected:

Producer logs ✅ sent nhs-999 Sumatriptan, etc.

Consumer logs 📥 nhs.raw.prescriptions ... lines with the JSON payloads.

Kafka UI shows the topic and message count increasing.

To stop:

podman-compose down -v
```

