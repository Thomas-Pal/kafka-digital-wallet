export const BROKERS = ['127.0.0.1:29092'];
export const RAW_TOPIC = 'nhs.raw.prescriptions';
export const CONSENT_TOPIC = 'consent.events';
export const VIEW_TOPIC = (caseId, citizenId) => `views.permitted.dwp.${caseId}.${citizenId}`;
export const CONSENT_API_URL = process.env.CONSENT_API_URL || 'http://localhost:4000';

export const DEMO_CASES = [
  { caseId: '4711', citizenId: 'nhs-999', citizenName: 'Joe Patient', rp: 'dwp', scopes: ['prescriptions'] },
  { caseId: '4712', citizenId: 'nhs-123', citizenName: 'Mary Example', rp: 'dwp', scopes: ['prescriptions'] }
];

export const CASE_BY_CITIZEN = Object.fromEntries(DEMO_CASES.map((c) => [c.citizenId, c.caseId]));
