import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton } from '@ionic/react';
import { sim } from '../services/sim';

export default function Scenarios() {
  return (
    <IonPage>
      <IonHeader><IonToolbar color="primary"><IonTitle>Scenarios</IonTitle></IonToolbar></IonHeader>
      <IonContent>
        <div style={{ padding: 12, display: 'grid', gap: 12 }}>
          <IonCard>
            <IonCardHeader><IonCardTitle>Health → DWP (Case 9001)</IonCardTitle></IonCardHeader>
            <IonCardContent>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <IonButton onClick={() => sim.requestConsent({ rp: 'dwp', citizenId: 'nhs-999', caseId: '9001', scopes: ['nhs.prescriptions'], reason: 'Benefits assessment' })}>
                  Send Consent Request
                </IonButton>
                <IonButton onClick={() => sim.nhsPrescription({ citizenId: 'nhs-999', drugName: 'Sumatriptan', doseMg: 50, quantity: 12 })}>
                  Publish NHS Prescription
                </IonButton>
              </div>
              <p style={{ marginTop: 8 }}>Approve in <strong>Requests</strong> tab, then view DWP case 9001.</p>
            </IonCardContent>
          </IonCard>

          <IonCard>
            <IonCardHeader><IonCardTitle>Termination → DWP + HMRC (TERM-1001)</IonCardTitle></IonCardHeader>
            <IonCardContent>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <IonButton onClick={() => sim.requestConsent({ rp: 'dwp', citizenId: 'emp-999', caseId: 'TERM-1001', scopes: ['employment.termination'], reason: 'Eligibility assessment' })}>
                  Send Consent Request
                </IonButton>
                <IonButton onClick={() => sim.termination({ citizenId: 'emp-999', employerName: 'Acme Widgets Ltd', reasonCode: 'REDUNDANCY' })}>
                  Publish Termination Event
                </IonButton>
                <IonButton onClick={() => sim.hmrcP45({ citizenId: 'emp-999', employerName: 'Acme Widgets Ltd' })}>
                  Publish HMRC P45 Summary
                </IonButton>
              </div>
              <p style={{ marginTop: 8 }}>Approve in <strong>Requests</strong>, then view DWP case TERM-1001.</p>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
}
