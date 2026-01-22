const BASE = 'http://localhost:4000';

export type ConsentGrant = {
  rp: 'dwp' | 'coach' | string;
  caseId: string;
  citizenId: string;
  scopes: string[];
  ttlDays?: number;
};

export async function post(path: string, body: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const ConsentAPI = {
  request: (body: ConsentGrant) => post('/consent/request', body),
  grant: (body: ConsentGrant) => post('/consent/grant', body),
  revoke: (body: { rp: string; caseId: string; citizenId: string }) =>
    post('/consent/revoke', body),
};
