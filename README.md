# Kafka Digital Wallet Demo

## Overview
This demo shows a consent-driven UK Digital Wallet that controls data sharing while Kafka stays the neutral backbone. The Wallet triggers scenarios, captures consent, and the DWP portal only lights up when a citizen grants access and RAW evidence matches. 

**Highlights**
- Wallet-driven consent and event triggers (no terminal steps).
- Gatekeeper emits VIEW topics only after consent + RAW match.
- DWP portal starts empty and updates on permitted evidence only.

## Repo layout
- `apps/wallet` — Ionic React wallet UI.
- `dwp-portal` — DWP caseworker portal UI.
- `services/apps/orchestration` — REST API for consents + scenario triggers.
- `services/apps/gatekeeper` — Kafka consumer/producer for consent-filtered views.
- `services/apps/dwp-api` — DWP API fed from VIEW topics.
- `services/shared` — shared Kafka config and CORS helpers.

## Screens (placeholders)
- Wallet dashboard GIF: _(add screenshot/gif here)_
- DWP portal GIF: _(add screenshot/gif here)_

## Run the demo
```bash
podman compose up -d
```

Start services:
```bash
npm run start:services
```

Start the Wallet (override API base with `VITE_ORCHESTRATION_API` if needed):
```bash
npm run wallet
```

Start the DWP portal (override API base with `VITE_DWP_API` if needed):
```bash
npm run dwp
```

Or run everything together (includes Kafka topic creation):
```bash
chmod +x demo.sh
./demo.sh
```

## URLs
- Wallet (Ionic React): http://localhost:5173
- DWP Portal: http://localhost:5174
- Kafka UI: http://localhost:8080
- Orchestration API: http://localhost:4000
- DWP API: http://localhost:5001
- Gatekeeper health: http://localhost:5002/healthz

## Demo flow
1. Open the Wallet Dashboard and navigate to **Consents**.
2. Approve a pending consent (or trigger one from **Work & Benefits**).
3. Open **Scenario Lab** and publish Employment Termination or Prescription events.
4. Watch the **Activity** tab update and the DWP portal populate with cases.

## Troubleshoot
```bash
podman logs kafka | grep -E '__consumer_offsets|GroupCoordinator|Coordinator' || true
```
Use `podman ps` and service consoles to verify the processes are running.
