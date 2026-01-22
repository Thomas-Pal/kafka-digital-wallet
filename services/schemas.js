export const PrescriptionEvent = (overrides = {}) => ({
  eventId: overrides.eventId || `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  eventType: 'nhs.prescriptions',
  citizenId: 'cit-123',
  drug: 'Sumatriptan 50mg',
  dosage: '1 tab',
  frequency: 'prn',
  prescribedAt: new Date().toISOString(),
  gpOdsCode: 'A12345',
  repeat: true,
  ...overrides
});

export const TerminationEvent = (overrides = {}) => ({
  eventId: overrides.eventId || `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  eventType: 'employment.termination',
  citizenId: 'cit-123',
  employerId: 'emp-77',
  terminationDate: new Date().toISOString(),
  reasonCode: 'redundancy',
  weeklyHours: 37.5,
  annualSalary: 38000,
  niNumber: 'QQ123456C',
  signature: 'mock-sig',
  ...overrides
});

export const P45SummaryEvent = (overrides = {}) => ({
  eventId: overrides.eventId || `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  eventType: 'hmrc.p45.summary',
  citizenId: 'cit-123',
  p45Number: 'P45-2026-001122',
  taxCode: '1257L',
  ytdGross: 25875.12,
  ytdTax: 3275.54,
  issuedAt: new Date().toISOString(),
  ...overrides
});
