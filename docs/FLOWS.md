# End-to-end Flows

## UC (Employment termination)

1. Citizen opens **Wallet → Work & Benefits** and grants consent for `employment.termination` to DWP.
2. Wallet publishes an **Employment Termination** RAW event via Orchestration API.
3. Gatekeeper sees the consent + RAW event and emits a VIEW to `views.permitted.dwp.uc`.
4. DWP API consumes the VIEW and stores the case in memory.
5. DWP Portal shows a **UC case** with employment evidence and timeline updates.

**UI expectation:**
- Wallet shows the consent under **Consents → Active**.
- DWP Portal shows a UC case with employment evidence.

## PIP (NHS prescriptions)

1. Citizen opens **Wallet → Health** and grants consent for `nhs.prescriptions` to DWP.
2. Wallet publishes an **NHS prescription** RAW event via Orchestration API.
3. Gatekeeper sees the consent + RAW event and emits a VIEW to `views.permitted.dwp.pip`.
4. DWP API consumes the VIEW and stores the case in memory.
5. DWP Portal shows a **PIP case** with prescription evidence and timeline updates.

**UI expectation:**
- Wallet shows the consent under **Consents → Active**.
- DWP Portal shows a PIP case with prescription evidence.
