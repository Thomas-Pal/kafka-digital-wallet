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
} from '@ionic/react';
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
            <IonCardTitle>What happens next</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p style={{ marginTop: 0 }}>
              When new prescriptions are issued, they appear here first. You control if and when
              they can be shared to support disability benefits.
            </p>
            <p style={{ marginTop: 12, color: '#666' }}>
              Use <strong>Scenarios</strong> to simulate a prescription update, then approve the
              consent request in <strong>Requests</strong>.
            </p>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
