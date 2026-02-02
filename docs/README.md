# Kafka Digital Wallet (Monorepo)

This repo is a local, consent-driven demo of a digital wallet where Kafka is the backbone. The citizen wallet grants consent and triggers RAW events; the gatekeeper emits permitted VIEW topics; the DWP portal shows cases only when consent and evidence align. The architecture docs include forward-ready plans for coach-facing services and additional VIEW topics.

## Quick start (3 commands)

```bash
npm run bootstrap
npm run dev
npm run stop
```

## Repo map

- `apps/`
  - `wallet/` — Ionic React citizen wallet + Scenario Lab
  - `dwp-portal/` — Caseworker portal UI
- `services/`
  - `orchestration-api/` — Consent CRUD + mock triggers (Kafka producer)
  - `gatekeeper/` — Consent-enforcing consumer that writes VIEW topics
  - `dwp-api/` — Subscribes to VIEW topics, exposes REST for portal
  - `shared/` — Kafka config, schemas, validators, shared types
- `infra/`
  - `compose/` — Podman Kafka + Kafka UI
  - `kafka/` — Topic declarations + init script
  - `env/` — Local and hosted environment templates
- `docs/` — Architecture, topics, flows, demo, operations

## Run steps (manual)

```bash
npm run up:kafka
npm run topics
npm run start:services
npm run wallet
npm run portal
```

## Troubleshooting shortcuts

```bash
npm run kill-ports
npm run reset:kafka
npm run dev:fresh
```

## URLs

- Wallet: http://localhost:5173
- DWP Portal: http://localhost:5174
- Kafka UI: http://localhost:8080
- Orchestration API: http://localhost:4000
- DWP API: http://localhost:5001
- Gatekeeper health: http://localhost:5002/healthz
