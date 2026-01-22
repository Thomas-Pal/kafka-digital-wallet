export const RAW_TOPIC = 'nhs.raw.prescriptions';
export const CONSENT_TOPIC = 'consent.events';
export const CONSENT_API_URL = process.env.CONSENT_API_URL || 'http://localhost:4000';
export const DEMO_CASES = [
  { caseId: '9001', citizenId: 'nhs-999', citizenName: 'Citizen nhs-999', rp: 'dwp' }
];

// Give each demo run a fresh suffix to avoid stale consumer offsets and stale VIEW topics
export const RUN_ID = process.env.RUN_ID || `${Date.now()}`;
export const groupId = (base) => `${base}-${RUN_ID}`;
