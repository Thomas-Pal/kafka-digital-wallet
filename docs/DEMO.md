# Demo Guide (Wallet-only)

## Prep

```bash
npm run bootstrap
npm run dev
```

## Demo flow

1. **Wallet → Consents**
   - Grant DWP access for `employment.termination` (UC) or `nhs.prescriptions` (PIP).
2. **Wallet → Scenario Lab**
   - Click **Publish Employment Termination** or **Publish Prescription Event**.
3. **DWP Portal**
   - A UC or PIP case appears with evidence and timeline entries.

## Expected outcomes

- No case appears in the DWP Portal before consent **and** RAW evidence.
- A single click produces one RAW event per trigger.
- Gatekeeper emits exactly one VIEW event per matching consent + RAW pair.

## Troubleshooting

- Ensure Kafka is running: `npm run up:kafka`
- Recreate topics: `npm run topics`
- Verify services: hit `/healthz` on Orchestration API, DWP API, and Gatekeeper.
