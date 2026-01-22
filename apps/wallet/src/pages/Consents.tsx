import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';

export default function Consents() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Consents</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>Consent history & revoke controls (demo placeholder).</IonContent>
    </IonPage>
  );
}
