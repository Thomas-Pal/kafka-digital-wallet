import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { useCitizenStore } from '../state/useCitizenStore';
import Timeline from '../components/Timeline';

export default function Activity() {
  const activity = useCitizenStore((state) => state.activity);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="header-gov">
          <IonTitle>Activity</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard className="gov-card">
          <IonCardContent>
            <h3 className="gov-heading">Unified timeline</h3>
            <p className="gov-subtitle">Consent, raw events, and permitted VIEW deliveries in one place.</p>
            <Timeline items={activity} />
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
