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

export default function HMRC() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>HMRC</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Tax & Employment Record</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="12" sizeMd="6">
                  <h3 style={{ marginTop: 0 }}>PAYE snapshot</h3>
                  <p style={{ margin: '6px 0' }}>Tax code: 1257L · NI: QQ123456C</p>
                  <p style={{ margin: '6px 0', color: '#666' }}>
                    Year-to-date gross: £25,875.12 · Tax paid: £3,275.54
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <IonChip color="success">HMRC record verified</IonChip>
                    <IonChip color="warning">P45 issued</IonChip>
                  </div>
                </IonCol>
                <IonCol size="12" sizeMd="6">
                  <h4 style={{ marginTop: 0 }}>Employer summary</h4>
                  <p style={{ margin: '6px 0' }}>Acme Widgets Ltd · Leaving date: 22 Jan 2026</p>
                  <p style={{ margin: '6px 0', color: '#666' }}>
                    This data is linked to your benefits case only after you approve a consent request.
                  </p>
                </IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Why it matters</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p style={{ marginTop: 0 }}>
              Verified HMRC summaries reduce manual evidence requests and speed up benefit
              decisions by sharing tax and employment data directly from source.
            </p>
            <p style={{ marginTop: 12, color: '#666' }}>
              You stay in control: sharing only begins after a consent request is approved.
            </p>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
