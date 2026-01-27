const BASE = import.meta.env.VITE_ORCH_URL ?? 'http://localhost:4000';

export async function fetchConsentInbox() {
  try {
    const res = await fetch(`${BASE}/consent/inbox`);
    if (!res.ok) {
      return { data: [], ok: false, status: res.status };
    }
    const data = await res.json().catch(() => []);
    return { data, ok: true, status: res.status };
  } catch {
    return { data: [], ok: false, status: 0 };
  }
}

export async function approveConsent(id: string, durationDays: number) {
  const res = await fetch(`${BASE}/consent/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, durationDays }),
  });
  return res.json();
}

export async function revokeConsent(id: string) {
  const res = await fetch(`${BASE}/consent/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function scenarioPublish(
  kind: 'nhs.prescriptions' | 'employment.termination',
  payload: unknown
) {
  const res = await fetch(`${BASE}/scenario/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, payload }),
  });
  return res.json();
}
