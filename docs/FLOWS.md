# End-to-end Flows

## Employment Termination (UC + Coach)

**Legal reality:** Employer → HMRC is a legal obligation (no citizen consent required). Any onward sharing to DWP or a coach requires citizen consent.

1. Employer submits RTI termination → system emits RAW `employment.termination`.
2. Orchestration triggers a push notification to Wallet:
   - “HMRC requests to share Employment Status + Income Summary with DWP (UC) for 90 days.”
   - “HMRC requests to share Employment Status with Jobcentre coach for 60 days.”
3. Citizen opens **Wallet → Consents** and reviews two pending requests (recipient, scopes, purpose, duration, legal basis).
4. On **Grant**, Orchestration emits `consent.events` with `citizenId`, `grantedTo`, `scopes`, `caseId`, and `ttlDays`.
5. Gatekeeper updates its consent index, then filters RAW events and publishes:
   - `views.permitted.dwp.uc` (termination + income summary).
   - `views.permitted.coach.basic` (termination flag + last employer).
6. DWP API and Coach API consume their VIEW topics and create cases keyed by `citizenId|caseId`.
7. Portals show new entries. Revocation/expiry stops new VIEW writes (historic entries remain per agency policy).

**Failure modes**
- If consent never arrives, Gatekeeper emits nothing; portals show “Awaiting consent.”
- Duplicate RAW events are deduped by `eventId` to prevent double publishes.

## NHS Prescriptions → DWP disability evidence (PIP)

**Reality:** NHS RAW prescriptions are internal; DWP usage needs explicit, time-bound consent.

1. GP issues a prescription → RAW `nhs.prescriptions`.
2. Orchestration triggers a push notification:
   - “DWP requests to view your prescriptions for the last 12 months to assess PIP claim. Duration: 90 days.”
3. Citizen grants `share:health.prescriptions` with a time window (e.g., last 12 months).
4. Gatekeeper filters RAW events by `citizenId` and `prescribedAt` within the time window, then publishes `views.permitted.dwp.pip`.
5. DWP API stores the evidence; the DWP Portal shows a Health Evidence tab.
6. Revocation ends new VIEW writes and the case shows “consent revoked.”

**Edge cases**
- Partial disclosure is supported by the consent time window (Gatekeeper enforces on `prescribedAt`).
- Backfill can be implemented with a short replay or a one-off job to re-emit eligible RAW events.
