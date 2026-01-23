const API_BASE = import.meta.env.VITE_ORCHESTRATION_API || 'http://localhost:4000';

type ApiResponse<T> = { ok: boolean; data?: T; error?: string };

const jsonHeaders = {
  'Content-Type': 'application/json',
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

function postWithIdempotency(path: string, payload: Record<string, unknown>) {
  const eventId = makeId();
  return request(path, {
    method: 'POST',
    headers: { ...jsonHeaders, 'Idempotency-Key': eventId },
    body: JSON.stringify({ eventId, ...payload }),
  });
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
  return postWithIdempotency('/consent/request', payload);
}

export function grantConsent(payload: Record<string, unknown>) {
  return postWithIdempotency('/consent/grant', payload);
}

export function denyConsent(payload: Record<string, unknown>) {
  return postWithIdempotency('/consent/deny', payload);
}

export function revokeConsent(payload: Record<string, unknown>) {
  return postWithIdempotency('/consent/revoke', payload);
}

export function triggerEmploymentTermination(payload: Record<string, unknown>) {
  return postWithIdempotency('/triggers/employment-termination', payload);
}

export function triggerPrescription(payload: Record<string, unknown>) {
  return postWithIdempotency('/triggers/nhs-prescription', payload);
}
