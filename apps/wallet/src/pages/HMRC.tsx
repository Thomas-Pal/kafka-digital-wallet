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
            <IonCardTitle>P45 / PAYE</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            View HMRC summaries after consent (demo placeholder).
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
