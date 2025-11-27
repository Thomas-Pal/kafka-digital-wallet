export const BROKERS = ['127.0.0.1:29092'];
export const RAW_TOPIC = 'nhs.raw.prescriptions';
export const CONSENT_TOPIC = 'consent.events';
export const VIEW_TOPIC = (caseId, citizenId) => `views.permitted.dwp.${caseId}.${citizenId}`;
