import { create } from 'zustand';

export type Credential = {
  id: string;
  type: 'Identity' | 'NI' | 'NHS' | 'Employment';
  issuer: string;
  issuedAt: string;
  claims: Record<string, string>;
};

export type Consent = {
  id: string;
  rp: string;
  scopes: string[];
  citizenId: string;
  status: 'granted' | 'revoked' | 'expired' | 'pending';
  issuedAt: string;
  expiresAt?: string;
  purpose?: string;
  durationDays?: number;
  caseId?: string;
  requestedAt?: string;
};

export type ConsentRequest = Omit<Consent, 'status' | 'issuedAt' | 'expiresAt'>;

export type ActivityItem = {
  id: string;
  ts: string;
  kind: 'request' | 'grant' | 'revoke' | 'view' | 'publish';
  summary: string;
  details?: string;
};

type WalletState = {
  citizen: {
    id: string;
    name: string;
    dob: string;
    niNumber: string;
    nhsNumber: string;
    address: string;
    gpSurgery: string;
    employer: string;
    benefitStatus: 'none' | 'UC' | 'PIP' | 'ESA';
  };
  credentials: Credential[];
  consents: Consent[];
  inbox: ConsentRequest[];
  activity: ActivityItem[];

  setConsents: (f: (c: Consent[]) => Consent[]) => void;
  addActivity: (a: ActivityItem) => void;
  pushInbox: (req: ConsentRequest) => void;
  clearInbox: () => void;
  removeInbox: (id: string) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  citizen: {
    id: 'nhs-999',
    name: 'Joe Bloggs',
    dob: '1996-03-02',
    niNumber: 'QQ 12 34 56 C',
    nhsNumber: '943 476 5919',
    address: '12 Market Street, Leeds, LS1 4AB',
    gpSurgery: 'City Health GP, LS2',
    employer: 'Northern Logistics Ltd',
    benefitStatus: 'none',
  },
  credentials: [
    {
      id: 'vc-id',
      type: 'Identity',
      issuer: 'GOV.UK One Login',
      issuedAt: new Date().toISOString(),
      claims: { name: 'Joe Bloggs', dob: '1996-03-02' },
    },
    {
      id: 'vc-ni',
      type: 'NI',
      issuer: 'HMRC',
      issuedAt: new Date().toISOString(),
      claims: { niNumber: 'QQ 12 34 56 C' },
    },
    {
      id: 'vc-nhs',
      type: 'NHS',
      issuer: 'NHS England',
      issuedAt: new Date().toISOString(),
      claims: { nhsNumber: '943 476 5919', gp: 'City Health GP, LS2' },
    },
    {
      id: 'vc-emp',
      type: 'Employment',
      issuer: 'Northern Logistics Ltd',
      issuedAt: new Date().toISOString(),
      claims: { employer: 'Northern Logistics Ltd', start: '2024-01-06' },
    },
  ],
  consents: [],
  inbox: [],
  activity: [],

  setConsents: (f) => set((state) => ({ consents: f(state.consents) })),
  addActivity: (a) => set((state) => ({ activity: [a, ...state.activity] })),
  pushInbox: (req) => set((state) => ({ inbox: [req, ...state.inbox] })),
  clearInbox: () => set({ inbox: [] }),
  removeInbox: (id) =>
    set((state) => ({ inbox: state.inbox.filter((item) => item.id !== id) })),
}));
