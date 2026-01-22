export const CONSENT_TOPIC = 'consent.events';
// Give each demo run a fresh suffix to avoid stale consumer offsets and stale VIEW topics
export const RUN_ID = process.env.RUN_ID || `${Date.now()}`;
export const groupId = (base) => base;
