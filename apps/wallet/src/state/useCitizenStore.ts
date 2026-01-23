import { create } from 'zustand';

type CitizenProfile = {
  name: string;
  dob: string;
  niNumber: string;
  nhsId: string;
  address: string;
};

type Employment = {
  employerName: string;
  employerId: string;
  status: string;
  weeklyHours: number;
  annualSalary: number;
  terminationHistory: { date: string; reason: string }[];
};

type Prescription = {
  drug: string;
  dosage: string;
  frequency: string;
  repeat: boolean;
  prescribedAt: string;
  condition: string;
};

type HmrcSummary = {
  niNumber: string;
  latestP45: string;
  latestP60: string;
  payeYtd: string;
  declaredIncome: string;
};

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  badge?: string;
  icon?: string;
};

type CitizenState = {
  citizen: CitizenProfile;
  employment: Employment;
  prescriptions: Prescription[];
  hmrc: HmrcSummary;
  activity: ActivityItem[];
};

export const useCitizenStore = create<CitizenState>(() => ({
  citizen: {
    name: 'Leanne Carter',
    dob: '14 Sep 1987',
    niNumber: 'QQ123456C',
    nhsId: 'nhs-999',
    address: '18 Willow Close, Leeds, LS7 3PD',
  },
  employment: {
    employerName: 'North River Logistics Ltd',
    employerId: 'GB-EMP-12345',
    status: 'Active',
    weeklyHours: 37.5,
    annualSalary: 31200,
    terminationHistory: [
      { date: '05 Nov 2024', reason: 'Role ended' },
      { date: '12 Mar 2022', reason: 'Seasonal contract' },
    ],
  },
  prescriptions: [
    {
      drug: 'Sumatriptan',
      dosage: '50mg',
      frequency: 'PRN',
      repeat: true,
      prescribedAt: '22 Jan 2026',
      condition: 'Chronic migraine',
    },
    {
      drug: 'Amitriptyline',
      dosage: '10mg',
      frequency: 'Nightly',
      repeat: true,
      prescribedAt: '08 Dec 2025',
      condition: 'Sleep support',
    },
  ],
  hmrc: {
    niNumber: 'QQ123456C',
    latestP45: 'P45-2026-001122',
    latestP60: 'P60-2025-778901',
    payeYtd: '£25,875.12',
    declaredIncome: '£31,200',
  },
  activity: [
    {
      id: 'act-1',
      title: 'Consent request received',
      description: 'DWP requested access to employment termination evidence.',
      time: 'Today, 09:18',
      badge: 'Pending',
      icon: 'shield',
    },
    {
      id: 'act-2',
      title: 'Prescription updated',
      description: 'NHS issued Sumatriptan repeat prescription.',
      time: 'Yesterday, 16:04',
      badge: 'Health',
      icon: 'heart',
    },
    {
      id: 'act-3',
      title: 'Consent granted',
      description: 'Employment evidence shared with DWP.',
      time: 'Yesterday, 10:32',
      badge: 'Granted',
      icon: 'check',
    },
    {
      id: 'act-4',
      title: 'View delivered',
      description: 'UC case evidence delivered to DWP portal.',
      time: 'Yesterday, 10:33',
      badge: 'VIEW',
      icon: 'time',
    },
  ],
}));
