# GOV.UK-style consent-filtered Kafka PoC

Stakeholder demo script (non-technical): a GP logs a prescription; the event lands in the secure backbone. A DWP caseworker asks the citizen for permission to see **only** their prescriptions for this case. The citizen taps “Allow for 3 months” in a friendly GOV.UK-style screen. Instantly, a filtered feed appears in the DWP portal with only the citizen’s prescriptions and only for the approved window. If consent is revoked, the feed dries up and historical data ages out automatically.

## Repo layout
```
gov-wallet-consent-poc/
├─ podman-compose.yml
├─ scripts/
│  ├─ topics-create.sh
│  ├─ topics-list.sh
│  ├─ seed.sh
│  └─ demo.sh
├─ services/
│  ├─ package.json
│  ├─ mock-nhs-producer.js            # RAW producer
│  ├─ mock-consent-api.js             # tiny REST to issue consent events
│  ├─ gatekeeper.js                   # RAW+consent -> VIEW
│  ├─ dwp-consumer.js                 # prints/serves VIEW to portal and case list
│  └─ config.js
├─ wallet-ui/                         # Vite React app (GOV.UK-style consent screen)
│  ├─ index.html
│  ├─ src/
│  │  ├─ main.tsx
│  │  ├─ App.tsx
│  │  └─ govuk.css
│  └─ package.json
├─ dwp-portal/                        # Vite React app showing filtered stream per case
│  ├─ index.html
│  ├─ src/
│  │  ├─ main.tsx
│  │  └─ App.tsx
│  └─ package.json
└─ README.md
```

Kafka infra (Podman): `podman-compose.yml` spins up a single KRaft broker (PLAINTEXT, listeners on 9092/29092) and Kafka UI on :8080.

**Topics & retention**
- RAW: `nhs.raw.prescriptions` (keyed by patientId)
- CONSENT: `consent.events` (grants/revokes)
- VIEW (per case/citizen): `views.permitted.dwp.<caseId>.<citizenId>` with `retention.ms=604800000` (7 days)

## One-hit demo runner (preferred)
This brings everything up, seeds RAW events, and leaves you to click Allow/Revoke in the wallet while the portal updates.
```bash
bash scripts/demo.sh
# logs land in ./logs/*.log; Ctrl+C stops background services started by the script
```

## Manual steps (if you prefer)
1) Start Kafka + UI
```bash
podman-compose up -d   # or: docker compose -f podman-compose.yml up -d
```
2) Create demo topics
```bash
bash scripts/topics-create.sh
```
3) Install dependencies
```bash
(cd services && npm install)
(cd wallet-ui && npm install)
(cd dwp-portal && npm install)
```
4) Start backends (3 terminals)
```bash
cd services
npm run consent-api   # :4000 REST to emit consent events
npm run gatekeeper    # RAW+consent -> VIEW (per-case)
npm run dwp           # consumes VIEW and serves :5001 (cases + views)
```
5) Start UIs (2 terminals)
```bash
(cd wallet-ui && npm run dev -- --host --port 5173)   # http://localhost:5173 wallet consent screen
(cd dwp-portal && npm run dev -- --host --port 5174)  # http://localhost:5174 DWP portal (case list)
```
6) Publish some RAW prescriptions and grant consent
```bash
bash scripts/seed.sh
# or manually: (cd services && npm run produce:nhs)
```
7) In the wallet UI, click **Allow** (posts to :4000). The gatekeeper will begin emitting to `views.permitted.dwp.<caseId>.<citizenId>`
   and the DWP portal cards show the consent request indicator turning into ✅ Granted as filtered rows appear when permitted.
8) Click **Revoke** (or POST /consent/revoke) to stop new VIEW events; after 7 days retention the VIEW topic empties.

## Troubleshooting (fast fixes)
- **Advertised listeners**: all Node apps use `127.0.0.1:29092` matching `KAFKA_ADVERTISED_LISTENERS`.
- **Topics**: rerun `scripts/topics-create.sh` if producers/consumers disagree on names.
- **Offsets**: consumers subscribe with `fromBeginning:true`; change `groupId` if you need a fresh read.
- **Consent flow**: gatekeeper subscribes to both RAW and `consent.events`; DWP reads only VIEW topics.
- **CORS**: mock services send permissive headers so Vite dev servers can call them directly.

## Architecture beat-by-beat (what we show live)
- **NHS event published**: “Prescription issued for Joe” arrives in RAW (red) topic.
- **Caseworker requests access**: Case card shows “consent request sent”; a consent request appears in the wallet (mobile-style UI).
- **Citizen approves**: The consent event (purple) is recorded.
- **Gatekeeper enforces consent**: A VIEW (green) stream is created for DWP/this case/this citizen only.
- **DWP portal updates**: Caseworker sees only Joe’s prescriptions, minimal fields, per-case list with status chips.
- **Revoke**: Citizen revokes consent; the VIEW stops receiving new events and data ages out automatically.

Quality bar: topic names contain no PII, minimal payload in VIEW, 7-day retention, wallet-first consent UX, DWP never reads RAW.
