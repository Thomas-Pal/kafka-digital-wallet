import type { ConsentRequest, ConsentGrant, Scope, RelyingParty } from '../types';

const ORCH_API = import.meta.env.VITE_ORCH_API || import.meta.env.VITE_CONSENT_API || 'http://localhost:4000';
const DWP_API = import.meta.env.VITE_DWP_API || 'http://localhost:5001';

export async function listRequests(): Promise<ConsentRequest[]> {
  const r = await fetch(`${ORCH_API}/api/requests`);
  return r.json();
}

export async function approveRequest(
  requestId: string,
  ttlMinutes = 180
): Promise<ConsentGrant> {
  const r = await fetch(`${ORCH_API}/api/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, ttlMinutes }),
  });
  return r.json();
}

export async function issueAdHocGrant(params: {
  rp: RelyingParty;
  citizenId: string;
  caseId?: string;
  scopes: Scope[];
  ttlMinutes?: number;
}): Promise<ConsentGrant> {
  const r = await fetch(`${ORCH_API}/api/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttlMinutes: 180, ...params }),
  });
  return r.json();
}

export async function listConsents(): Promise<ConsentGrant[]> {
  const r = await fetch(`${ORCH_API}/api/consents`);
  return r.json();
}

export async function getDwpCaseView(caseId: string) {
  const r = await fetch(`${DWP_API}/api/case/${encodeURIComponent(caseId)}/view`);
  return r.json();
}
