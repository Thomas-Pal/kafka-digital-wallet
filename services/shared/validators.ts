import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import consentSchema from './schemas/consent.events.json' assert { type: 'json' };
import employmentSchema from './schemas/employment.termination.json' assert { type: 'json' };
import prescriptionSchema from './schemas/nhs.prescriptions.json' assert { type: 'json' };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validateConsent = ajv.compile(consentSchema);
const validateEmployment = ajv.compile(employmentSchema);
const validatePrescription = ajv.compile(prescriptionSchema);

const assertValid = (valid: boolean, errors: ErrorObject[] | null | undefined, label: string) => {
  if (!valid) {
    const detail = ajv.errorsText(errors);
    throw new Error(`${label} validation failed${detail ? `: ${detail}` : ''}`);
  }
};

export const assertConsentEvent = (payload: unknown) => {
  assertValid(validateConsent(payload), validateConsent.errors, 'Consent event');
};

export const assertEmploymentTermination = (payload: unknown) => {
  assertValid(validateEmployment(payload), validateEmployment.errors, 'Employment termination');
};

export const assertPrescription = (payload: unknown) => {
  assertValid(validatePrescription(payload), validatePrescription.errors, 'NHS prescription');
};
