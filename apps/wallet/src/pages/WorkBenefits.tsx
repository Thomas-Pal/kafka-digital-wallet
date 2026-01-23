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
} from '@ionic/react';

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
            <IonCardTitle>What happens next</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p style={{ marginTop: 0 }}>
              When an employment change is recorded, you will receive a consent request from DWP
              or a Work Coach. Approving that request shares only the evidence needed for UC.
            </p>
            <p style={{ marginTop: 12, color: '#666' }}>
              Use <strong>Scenarios</strong> to simulate a termination event, then approve the
              consent request in <strong>Requests</strong>.
            </p>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
