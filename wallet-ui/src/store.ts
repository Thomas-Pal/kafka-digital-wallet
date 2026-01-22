import { LocalConsent } from './types';

const KEY = 'wallet.activeConsents';

export function getConsents(): LocalConsent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
export function setConsents(cs: LocalConsent[]) {
  localStorage.setItem(KEY, JSON.stringify(cs));
}
export function addConsent(c: LocalConsent) {
  const all = getConsents();
  const idx = all.findIndex(
    (x) => x.rp === c.rp && x.caseId === c.caseId && x.citizenId === c.citizenId
  );
  if (idx >= 0) all[idx] = c;
  else all.push(c);
  setConsents(all);
}
export function removeConsent(rp: string, caseId: string, citizenId: string) {
  const all = getConsents().filter(
    (c) => !(c.rp === rp && c.caseId === caseId && c.citizenId === citizenId)
  );
  setConsents(all);
}
