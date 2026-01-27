# Kafka Topics & Schemas

## Naming rules

- RAW topics use source namespaces: `employment.termination`, `nhs.prescriptions`.
- Consent topics are explicit: `consent.events`.
- VIEW topics are scoped by consumer: `views.permitted.dwp.<caseType>`.

## Topic list

| Topic | Purpose | Schema |
| --- | --- | --- |
| `consent.events` | Consent grant/revoke events | `services/shared/schemas/consent.events.json` |
| `employment.termination` | RAW employment termination events | `services/shared/schemas/employment.termination.json` |
| `nhs.prescriptions` | RAW prescription events | `services/shared/schemas/nhs.prescriptions.json` |
| `views.permitted.dwp.uc` | VIEW events for Universal Credit | `services/shared/schemas/views.permitted.dwp.uc.json` |
| `views.permitted.dwp.pip` | VIEW events for PIP | `services/shared/schemas/views.permitted.dwp.pip.json` |

## Sample payloads

### Consent grant
```json
{
  "eventId": "4c1a72d6-7dcb-4c30-8c9a-63f9df1f1b72",
  "type": "grant",
  "citizenId": "nhs-999",
  "grantedTo": "dwp",
  "scopes": ["employment.termination"],
  "ttlDays": 90,
  "issuedAt": "2025-01-01T10:00:00.000Z",
  "caseId": "uc-9001"
}
```

### Employment termination
```json
{
  "eventId": "b0b8c2e6-f3f4-4d3f-9f88-4b6f1ef0b32b",
  "citizenId": "nhs-999",
  "niNumber": "QQ123456C",
  "employerId": "GB-EMP-12345",
  "employerName": "North River Logistics Ltd",
  "terminationDate": "2025-01-03T12:00:00.000Z",
  "reasonCode": "redundancy",
  "weeklyHours": 37.5,
  "annualSalary": 31200,
  "noticePaid": true,
  "metadata": { "source": "employer" }
}
```

### NHS prescription
```json
{
  "eventId": "6f7d5d1c-02a1-4f8a-8d37-1e7dc5b5c5a2",
  "citizenId": "nhs-999",
  "drug": "Sumatriptan",
  "dosage": "50mg",
  "frequency": "PRN",
  "repeat": true,
  "gpOdsCode": "A12345",
  "condition": "Chronic migraine",
  "prescribedAt": "2025-01-03T12:00:00.000Z"
}
```

### VIEW (UC)
```json
{
  "eventId": "2d0c1b5e-4f35-4f6e-8bda-02c63bf3f2c6",
  "citizenId": "nhs-999",
  "caseId": "uc-9001",
  "caseType": "UC",
  "evidence": {
    "employment": { "employerName": "North River Logistics Ltd", "terminationDate": "2025-01-03T12:00:00.000Z" }
  },
  "reason": "employment.termination",
  "grantedAt": "2025-01-01T10:00:00.000Z"
}
```
