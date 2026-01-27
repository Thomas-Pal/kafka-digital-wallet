import { FromSchema } from 'json-schema-to-ts';
import consentSchema from './schemas/consent.events.json' assert { type: 'json' };
import employmentSchema from './schemas/employment.termination.json' assert { type: 'json' };
import prescriptionSchema from './schemas/nhs.prescriptions.json' assert { type: 'json' };
import ucViewSchema from './schemas/views.permitted.dwp.uc.json' assert { type: 'json' };
import pipViewSchema from './schemas/views.permitted.dwp.pip.json' assert { type: 'json' };

export type ConsentEvent = FromSchema<typeof consentSchema>;
export type EmploymentTerminationEvent = FromSchema<typeof employmentSchema>;
export type PrescriptionEvent = FromSchema<typeof prescriptionSchema>;
export type PermittedUcView = FromSchema<typeof ucViewSchema>;
export type PermittedPipView = FromSchema<typeof pipViewSchema>;
