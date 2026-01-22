import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';

export default function Activity() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Activity</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>Recent access log & audit (demo placeholder).</IonContent>
    </IonPage>
  );
}
