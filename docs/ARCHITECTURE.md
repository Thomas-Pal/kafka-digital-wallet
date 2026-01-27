# Architecture

## Components

- **Wallet (apps/wallet)** — Citizen UX for consents and Scenario Lab triggers.
- **Orchestration API (services/orchestration-api)** — Consent CRUD + mock trigger endpoints. Produces RAW events to Kafka.
- **Gatekeeper (services/gatekeeper)** — Consumes consent + RAW events, enforces rules, emits VIEW topics.
- **DWP API (services/dwp-api)** — Consumes VIEW topics, exposes REST for the portal.
- **DWP Portal (apps/dwp-portal)** — Caseworker UX (read-only).

## Boundaries

- Wallet talks **only** to Orchestration API over HTTP.
- Orchestration API and Gatekeeper talk **only** through Kafka.
- DWP Portal talks **only** to DWP API over HTTP.

## Data flow (ASCII)

```
Wallet (consent + triggers)
        |
        v
Orchestration API  ---> Kafka RAW topics (employment.termination / nhs.prescriptions)
        |                          |
        |                          v
        |                    Gatekeeper (consent enforcement)
        |                          |
        |                          v
        +----> Kafka consent.events +--> Kafka VIEW topics (views.permitted.dwp.*)
                                           |
                                           v
                                       DWP API ----> DWP Portal
```

## Notes

- The Gatekeeper is the only component that can produce VIEW topics.
- All Kafka producers set the message key to `citizenId` for ordering.
- Kafka config supports SASL/TLS via environment variables for hosted PoC.
