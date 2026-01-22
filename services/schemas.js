export const PrescriptionEvent = (overrides = {}) => ({
  eventType: 'nhs.prescription.issued',
  citizenId: 'nhs-999',
  nhsNumber: '9999999999',
  gpPracticeCode: 'A12345',
  gpPracticeName: 'Riverside Medical',
  prescriberId: 'GMC1234567',
  snomedCode: '387544009',
  drugName: 'Sumatriptan',
  doseMg: 50,
  quantity: 12,
  directions: 'Take one at onset of migraine',
  issueDate: new Date().toISOString(),
  repeat: true,
  pharmacyODS: 'F12345',
  ...overrides
});

export const TerminationEvent = (overrides = {}) => ({
  eventType: 'employment.termination',
  citizenId: 'emp-999',
  niNumber: 'QQ123456C',
  employerId: 'EMP-ACME-001',
  employerName: 'Acme Widgets Ltd',
  terminationDate: new Date().toISOString(),
  reasonCode: 'REDUNDANCY',
  noticeWeeks: 4,
  redundancyPay: 2100.5,
  avgWeeklyEarnings: 520.75,
  lastWorkingDay: new Date(Date.now() - 86400000).toISOString(),
  p45Issued: true,
  ...overrides
});

export const P45SummaryEvent = (overrides = {}) => ({
  eventType: 'hmrc.p45.summary',
  citizenId: 'emp-999',
  niNumber: 'QQ123456C',
  employerName: 'Acme Widgets Ltd',
  payYTD: 24500.0,
  taxYTD: 3100.0,
  taxCode: '1257L',
  leavingDate: new Date().toISOString(),
  ...overrides
});
