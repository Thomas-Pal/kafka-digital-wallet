# Runbook
podman machine start
podman compose down && podman rm -f kafka kafka-ui 2>/dev/null || true
podman compose up -d
chmod +x demo.sh
./demo.sh
# Open:
#  Wallet (Ionic React): http://localhost:5173
#  DWP:    http://localhost:5174  (Refresh → Load view)
#  Kafka:  http://localhost:8080

# GOV Wallet Consent Demo — One-Hit

Prereqs:
- Podman and podman-compose
- jq

Run:
```bash
chmod +x demo.sh scripts/*.sh
./demo.sh
```
Wallet (Ionic React): http://localhost:5173
Use “Requests” tab to emit demo consent requests.
Use “Wallet” tab to Grant the two scenarios.
Use “Consents” tab to view/revoke.

Flow:

Starts Kafka + UI, creates topics.

Starts Consent API, Gatekeeper, DWP Service; starts Wallet UI and DWP Portal.

Sends consent request (case 9001 → citizen nhs-999).

You approve in wallet.

Script then publishes RAW so the VIEW fills instantaneously.

Each run uses a fresh `RUN_ID` (auto-generated) so consumer groups re-read RAW and CONSENT from the start. The topic creation step also deletes any prior `views.permitted.*` topics so only consent-driven views remain.

Notes:
- On macOS, the script will create/start the default Podman machine (`podman-machine-default`) if needed before running podman-compose.
- Containers are named `kafka` and `kafka-ui`; the script force-removes any stale containers/pods with those names before compose to avoid name conflicts.
- Service logs and pid files are written to `./logs` (populated by `demo.sh`); the script fails fast if any backend dies so you can inspect those logs immediately.

URLs:

Wallet (Ionic React): http://localhost:5173

DWP Portal: http://localhost:5174

Kafka UI: http://localhost:8080

Consent API: http://localhost:4000

DWP API: http://localhost:5001

After creating the repo, also run:
```bash
chmod +x demo.sh scripts/*.sh
```

# Troubleshoot
podman logs kafka | grep -E '__consumer_offsets|GroupCoordinator|Coordinator' || true
tail -n +1 logs/consent-api.log logs/gatekeeper.log logs/dwp.log
podman exec kafka kafka-consumer-groups --bootstrap-server 127.0.0.1:29092 --list
