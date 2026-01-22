const ORCH_API = import.meta.env.VITE_ORCH_API || 'http://localhost:4000';

export const sim = {
  requestConsent: (body: any) =>
    fetch(`${ORCH_API}/consents/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
  nhsPrescription: (body: any) =>
    fetch(`${ORCH_API}/triggers/prescription-change`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
  termination: (body: any) =>
    fetch(`${ORCH_API}/triggers/employment-termination`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
  hmrcP45: (body: any) =>
    fetch(`${ORCH_API}/triggers/p45`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json())
};
