import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonBadge } from '@ionic/react';
import { useEffect, useState } from 'react';
import { sim } from '../services/sim';
import { listConsents } from '../services/api';
import type { ConsentGrant } from '../types';

const hasScope = (consents: ConsentGrant[], scope: string) =>
  consents.some((c) => c.scopes?.includes(scope));

export default function Scenarios() {
  const [consents, setConsents] = useState<ConsentGrant[]>([]);

  useEffect(() => {
    const t = setInterval(async () => {
      const data = await listConsents().catch(() => []);
      setConsents(Array.isArray(data) ? data : []);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const canEmployment = hasScope(consents, 'share:dwp:uc') || hasScope(consents, 'share:coach:basic');
  const canNhs = hasScope(consents, 'share:dwp:disability') && hasScope(consents, 'share:nhs:prescriptions');

  return (
    <IonPage>
      <IonHeader><IonToolbar color="primary"><IonTitle>Scenarios</IonTitle></IonToolbar></IonHeader>
      <IonContent>
        <div style={{ padding: 12, display: 'grid', gap: 12 }}>
          <IonCard>
            <IonCardHeader><IonCardTitle>NHS Prescription Change → DWP Disability</IonCardTitle></IonCardHeader>
            <IonCardContent>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <IonButton onClick={() => sim.requestConsent({ rp: 'dwp', citizenId: 'cit-123', caseId: 'dis-9002', scopes: ['share:dwp:disability', 'share:nhs:prescriptions'], reason: 'Disability assessment' })}>
                  Request Consent
                </IonButton>
                <IonButton disabled={!canNhs} onClick={() => sim.nhsPrescription({ citizenId: 'cit-123', drug: 'Sumatriptan 50mg', dosage: '1 tab', frequency: 'prn' })}>
                  Publish Prescription Change
                </IonButton>
                {!canNhs && <IonBadge color="medium">Grant DWP disability + NHS scope first</IonBadge>}
              </div>
              <p style={{ marginTop: 8 }}>Approve in <strong>Requests</strong>, then view DWP case dis-9002.</p>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader><IonCardTitle>Employment Termination → DWP UC + Coach</IonCardTitle></IonCardHeader>
            <IonCardContent>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <IonButton onClick={() => sim.requestConsent({ rp: 'dwp', citizenId: 'cit-123', caseId: 'uc-9001', scopes: ['share:dwp:uc'], reason: 'Universal Credit eligibility' })}>
                  Request DWP Consent
                </IonButton>
                <IonButton onClick={() => sim.requestConsent({ rp: 'coach', citizenId: 'cit-123', scopes: ['share:coach:basic'], reason: 'Support planning' })}>
                  Request Coach Consent
                </IonButton>
                <IonButton disabled={!canEmployment} onClick={() => sim.termination({ citizenId: 'cit-123', employerId: 'emp-77', reasonCode: 'redundancy' })}>
                  Publish Termination
                </IonButton>
                <IonButton disabled={!canEmployment} onClick={() => sim.hmrcP45({ citizenId: 'cit-123' })}>
                  Publish P45 Summary
                </IonButton>
                {!canEmployment && <IonBadge color="medium">Grant DWP UC or Coach consent first</IonBadge>}
              </div>
              <p style={{ marginTop: 8 }}>Approve in <strong>Requests</strong>, then view DWP case uc-9001.</p>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
}
