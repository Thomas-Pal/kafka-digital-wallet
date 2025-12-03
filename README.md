# GOV Wallet Consent Demo — One-Hit

Prereqs:
- Podman and podman-compose
- jq

Run:
```bash
chmod +x demo.sh scripts/*.sh
./demo.sh
```

Flow:

Starts Kafka + UI, creates topics.

Starts Consent API, Gatekeeper, DWP Service; starts Wallet UI and DWP Portal.

Sends consent request (case 9001 → citizen nhs-999).

You approve in wallet.

Script then publishes RAW so the VIEW fills instantaneously.

Each run uses a fresh `RUN_ID` (auto-generated) so consumer groups re-read RAW and CONSENT from the start. The topic creation step also deletes any prior `views.permitted.*` topics so only consent-driven views remain.

Notes:
- On macOS, the script will create/start the default Podman machine (`podman-machine-default`) if needed before running podman-compose.
- Containers are named `kafka` and `kafka-ui`; health is waited on before topic creation.

URLs:

Wallet: http://localhost:5173

DWP Portal: http://localhost:5174

Kafka UI: http://localhost:8080

Consent API: http://localhost:4000

DWP API: http://localhost:5001

After creating the repo, also run:
```bash
chmod +x demo.sh scripts/*.sh
```
