const BASE =
  import.meta.env.VITE_ORCH_URL ??
  import.meta.env.VITE_ORCH_API ??
  'http://localhost:4000';

export async function fetchConsentInbox() {
  try {
    const res = await fetch(`${BASE}/consent/pending`);
    if (!res.ok) {
      return { data: [], ok: false, status: res.status };
    }
    const data = await res.json().catch(() => []);
    return { data, ok: true, status: res.status };
  } catch {
    return { data: [], ok: false, status: 0 };
  }
}

export async function approveConsent({
  citizenId,
  grantedTo,
  scopes,
  ttlDays,
  caseId,
  pendingId,
}: {
  citizenId: string;
  grantedTo: string;
  scopes: string[];
  ttlDays: number;
  caseId?: string;
  pendingId?: string;
}) {
  const res = await fetch(`${BASE}/consent/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ citizenId, grantedTo, scopes, ttlDays, caseId, pendingId }),
  });
  return res.json();
}

export async function revokeConsent(consentId: string) {
  const res = await fetch(`${BASE}/consent/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consentId }),
  });
  return res.json();
}

export async function requestConsent({
  citizenId,
  rp,
  scopes,
}: {
  citizenId: string;
  rp: string;
  scopes: string[];
}) {
  const res = await fetch(`${BASE}/consent/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ citizenId, rp, scopes }),
  });
  return res.json();
}

export async function scenarioPublish(
  kind: 'nhs.prescriptions' | 'employment.termination',
  payload: unknown
) {
  const endpoint =
    kind === 'nhs.prescriptions'
      ? `${BASE}/triggers/nhs-prescription`
      : `${BASE}/triggers/employment-termination`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}
