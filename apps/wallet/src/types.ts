export type Scope =
  | 'nhs.prescriptions'
  | 'employment.termination'
  | 'hmrc.p45.summary';

export type RelyingParty = 'dwp' | 'hmrc';

export interface ConsentRequest {
  id: string;
  rp: RelyingParty;
  citizenId: string;
  caseId?: string;
  scopes: Scope[];
  reason?: string;
  issuedAt: string;
}

export interface ConsentGrant {
  id: string;
  rp: RelyingParty;
  citizenId: string;
  caseId?: string;
  scopes: Scope[];
  ttlMinutes: number;
  grantedAt: string;
  expiresAt: string;
}
