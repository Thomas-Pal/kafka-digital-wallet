export type LocalConsent = {
  rp: string;
  caseId: string;
  citizenId: string;
  scopes: string[];
  expiresAt?: string;
};
