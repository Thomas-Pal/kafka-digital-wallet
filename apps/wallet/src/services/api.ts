const API_BASE = 'http://localhost:4000';

type ApiResponse<T> = { ok: boolean; data?: T; error?: string };

const jsonHeaders = {
  'Content-Type': 'application/json'
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || 'Request failed' };
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

export function fetchPendingConsents() {
  return request('/consent/pending');
}

export function fetchActiveConsents() {
  return request('/consent/active');
}

export function fetchAudit() {
  return request('/consent/audit');
}

export function requestConsent(payload: Record<string, unknown>) {
  const eventId = makeId();
  return request('/consent/request', {
    method: 'POST',
    headers: { ...jsonHeaders, 'Idempotency-Key': eventId },
    body: JSON.stringify({ eventId, ...payload })
  });
}

export function grantConsent(payload: Record<string, unknown>) {
  const eventId = makeId();
  return request('/consent/grant', {
    method: 'POST',
    headers: { ...jsonHeaders, 'Idempotency-Key': eventId },
    body: JSON.stringify({ eventId, ...payload })
  });
}

export function denyConsent(payload: Record<string, unknown>) {
  const eventId = makeId();
  return request('/consent/deny', {
    method: 'POST',
    headers: { ...jsonHeaders, 'Idempotency-Key': eventId },
    body: JSON.stringify({ eventId, ...payload })
  });
}

export function revokeConsent(payload: Record<string, unknown>) {
  const eventId = makeId();
  return request('/consent/revoke', {
    method: 'POST',
    headers: { ...jsonHeaders, 'Idempotency-Key': eventId },
    body: JSON.stringify({ eventId, ...payload })
  });
}

export function triggerEmploymentTermination(payload: Record<string, unknown>) {
  const eventId = makeId();
  return request('/triggers/employment-termination', {
    method: 'POST',
    headers: { ...jsonHeaders, 'Idempotency-Key': eventId },
    body: JSON.stringify({ eventId, ...payload })
  });
}

export function triggerPrescription(payload: Record<string, unknown>) {
  const eventId = makeId();
  return request('/triggers/nhs-prescription', {
    method: 'POST',
    headers: { ...jsonHeaders, 'Idempotency-Key': eventId },
    body: JSON.stringify({ eventId, ...payload })
  });
}

export { makeId };
