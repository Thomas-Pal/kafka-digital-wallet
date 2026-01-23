import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
} from '@ionic/react';
import { issueAdHocGrant } from '../services/api';

export default function Health() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Health</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Citizen Health Overview</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeMd="6">
                  <h3 style={{ marginTop: 0 }}>Leah Martinez</h3>
                  <p style={{ margin: '6px 0', color: '#444' }}>
                    NHS No: 9999999999 · DOB: 14 May 1987 · GP: Riverside Medical
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <IonChip color="tertiary">Chronic migraine</IonChip>
                    <IonChip color="success">Fit note active</IonChip>
                    <IonChip color="medium">Disability review due</IonChip>
                  </div>
                </IonCol>
                <IonCol size="12" sizeMd="6">
                  <h4 style={{ marginTop: 0 }}>Active prescription</h4>
                  <p style={{ margin: '6px 0' }}>
                    Sumatriptan 50mg · 1 tab PRN · 12 issued · Repeat: Yes
                  </p>
                  <p style={{ margin: '6px 0', color: '#666' }}>
                    Most recent issue: 22 Jan 2026 · Prescriber: GMC1234567
                  </p>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Share for Disability Support</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p style={{ marginTop: 0 }}>
              Share a targeted medication history to support a disability benefits assessment.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <IonButton
                onClick={() =>
                  issueAdHocGrant({
                    rp: 'dwp',
                    citizenId: 'cit-123',
                    caseId: 'dis-9002',
                    scopes: ['share:dwp:disability'],
                    ttlMinutes: 180,
                  })
                }
              >
                Grant DWP Disability Access
              </IonButton>
              <IonButton
                fill="outline"
                onClick={() =>
                  issueAdHocGrant({
                    rp: 'dwp',
                    citizenId: 'cit-123',
                    caseId: 'dis-9002',
                    scopes: ['share:nhs:prescriptions'],
                    ttlMinutes: 180,
                  })
                }
              >
                Share NHS Prescription Scope
              </IonButton>
            </div>
            <p style={{ marginTop: 12, color: '#666' }}>
              This limits sharing to prescription data only and expires automatically after 180 minutes.
            </p>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
