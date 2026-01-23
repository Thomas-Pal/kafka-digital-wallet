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
  IonGrid,
  IonRow,
  IonCol,
  IonChip,
  IonButton,
} from '@ionic/react';
import { issueAdHocGrant } from '../services/api';

export default function WorkBenefits() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Work & Benefits</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Employment Status</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeMd="6">
                  <h3 style={{ marginTop: 0 }}>Last employment</h3>
                  <p style={{ margin: '6px 0' }}>
                    Employer: Acme Widgets Ltd · Role: Warehouse Operative
                  </p>
                  <p style={{ margin: '6px 0', color: '#666' }}>
                    Termination: 22 Jan 2026 · Reason: Redundancy
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <IonChip color="warning">UC assessment pending</IonChip>
                    <IonChip color="tertiary">Coach support eligible</IonChip>
                  </div>
                </IonCol>
                <IonCol size="12" sizeMd="6">
                  <h4 style={{ marginTop: 0 }}>Financial context</h4>
                  <p style={{ margin: '6px 0' }}>Annual salary: £38,000 · Weekly hours: 37.5</p>
                  <p style={{ margin: '6px 0', color: '#666' }}>
                    Evidence bundle ready for Universal Credit case uc-9001.
                  </p>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Share with DWP & Coach</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p style={{ marginTop: 0 }}>
              Grant time-limited access to termination evidence so DWP can assess UC eligibility
              and a Work Coach can schedule support.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <IonButton
                onClick={() =>
                  issueAdHocGrant({
                    rp: 'dwp',
                    citizenId: 'cit-123',
                    caseId: 'uc-9001',
                    scopes: ['share:dwp:uc'],
                    ttlMinutes: 180,
                  })
                }
              >
                Grant DWP UC Access
              </IonButton>
              <IonButton
                fill="outline"
                onClick={() =>
                  issueAdHocGrant({
                    rp: 'coach',
                    citizenId: 'cit-123',
                    scopes: ['share:coach:basic'],
                    ttlMinutes: 180,
                  })
                }
              >
                Grant Coach Support Access
              </IonButton>
            </div>
            <p style={{ marginTop: 12, color: '#666' }}>
              Access is scoped to UC eligibility evidence and expires automatically.
            </p>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
