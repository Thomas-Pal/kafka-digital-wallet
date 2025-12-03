export const BROKERS = ['127.0.0.1:29092'];
export const RAW_TOPIC = 'nhs.raw.prescriptions';
export const CONSENT_TOPIC = 'consent.events';
export const viewTopic = (caseId, citizenId) => `views.permitted.dwp.${caseId}.${citizenId}`;

// Give each demo run a fresh suffix to avoid stale consumer offsets and stale VIEW topics
export const RUN_ID = process.env.RUN_ID || `${Date.now()}`;
export const groupId = (base) => `${base}-${RUN_ID}`;
