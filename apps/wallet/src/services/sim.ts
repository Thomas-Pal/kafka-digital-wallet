const DEMO_SIM = import.meta.env.VITE_DEMO_SIM || 'http://localhost:5002';

export const sim = {
  requestConsent: (body: any) =>
    fetch(`${DEMO_SIM}/api/sim/request-consent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
  nhsPrescription: (body: any) =>
    fetch(`${DEMO_SIM}/api/sim/nhs/prescription`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
  termination: (body: any) =>
    fetch(`${DEMO_SIM}/api/sim/employment/termination`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
  hmrcP45: (body: any) =>
    fetch(`${DEMO_SIM}/api/sim/hmrc/p45`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json())
};
