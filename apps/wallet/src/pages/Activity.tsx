import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from '@ionic/react';

export default function Activity() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Activity</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Audit Summary</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p style={{ marginTop: 0 }}>
              Transparent, time-stamped activity that shows exactly what data was shared and why.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <IonBadge color="success">2 active consents</IonBadge>
              <IonBadge color="tertiary">3 events shared</IonBadge>
              <IonBadge color="warning">1 review due</IonBadge>
            </div>
          </IonCardContent>
        </IonCard>
        <IonList>
          <IonItem lines="full">
            <IonLabel>
              <h2>Scenario simulated: NHS prescription update</h2>
              <p>Awaiting consent approval for disability sharing</p>
            </IonLabel>
            <IonBadge color="warning">Pending</IonBadge>
          </IonItem>
          <IonItem lines="full">
            <IonLabel>
              <h2>Consent granted: DWP UC case uc-9001</h2>
              <p>Share scope: share:dwp:uc · 22 Jan 2026, 17:18</p>
            </IonLabel>
            <IonBadge color="success">Granted</IonBadge>
          </IonItem>
          <IonItem lines="full">
            <IonLabel>
              <h2>Employment termination shared</h2>
              <p>Acme Widgets Ltd · Evidence routed to DWP UC view</p>
            </IonLabel>
            <IonBadge color="tertiary">Shared</IonBadge>
          </IonItem>
          <IonItem lines="full">
            <IonLabel>
              <h2>Consent granted: DWP disability case dis-9002</h2>
              <p>Share scope: share:dwp:disability + share:nhs:prescriptions</p>
            </IonLabel>
            <IonBadge color="success">Granted</IonBadge>
          </IonItem>
          <IonItem lines="full">
            <IonLabel>
              <h2>Prescription change shared</h2>
              <p>NHS prescriptions · Routed to DWP disability view</p>
            </IonLabel>
            <IonBadge color="tertiary">Shared</IonBadge>
          </IonItem>
          <IonItem lines="full">
            <IonLabel>
              <h2>P45 summary shared</h2>
              <p>HMRC record linked to UC assessment</p>
            </IonLabel>
            <IonBadge color="tertiary">Shared</IonBadge>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
}
