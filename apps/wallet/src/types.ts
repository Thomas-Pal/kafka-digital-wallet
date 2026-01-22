export type Scope =
  | 'share:dwp:uc'
  | 'share:dwp:disability'
  | 'share:coach:basic'
  | 'share:nhs:prescriptions';

export type RelyingParty = 'dwp' | 'hmrc' | 'coach';

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
