export const TerminationEvent = (overrides = {}) => ({
  eventId: overrides.eventId || `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  citizenId: 'nhs-999',
  niNumber: 'QQ123456C',
  employerId: 'GB-EMP-12345',
  employerName: 'North River Logistics Ltd',
  terminationDate: new Date().toISOString(),
  reasonCode: 'redundancy',
  weeklyHours: 37.5,
  annualSalary: 31200,
  noticePaid: true,
  metadata: { source: 'employer', contact: 'hr@nrl.co.uk' },
  ...overrides,
});

export const PrescriptionEvent = (overrides = {}) => ({
  eventId: overrides.eventId || `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  citizenId: 'nhs-999',
  drug: 'Sumatriptan',
  dosage: '50mg',
  frequency: 'PRN',
  repeat: true,
  gpOdsCode: 'A12345',
  condition: 'Chronic migraine',
  prescribedAt: new Date().toISOString(),
  ...overrides,
});
